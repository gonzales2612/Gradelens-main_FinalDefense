"""
Main grading pipeline orchestrator.
Coordinates all CV stages and produces detection results.
"""
import time
import base64
import cv2
import numpy as np
from datetime import datetime
from typing import Dict, Optional
from pathlib import Path
from loguru import logger

from app.schemas.detection_result import (
    DetectionResult,
    QuestionDetection,
    QualityMetrics,
    DetectionWarning,
    DetectionError
)
from app.templates.loader import load_template
from app.pipeline.preprocess import preprocess_image, PreprocessingError
from app.pipeline.paper_detection import detect_paper_with_fallback, PaperDetectionError
from app.pipeline.perspective import (
    correct_perspective,
    validate_perspective_correction,
    PerspectiveCorrectionError
)
from app.pipeline.align import (
    align_image_with_template,
    warp_fiducials_to_canonical,
    AlignmentError,
)
from app.pipeline.roi_extraction import extract_all_bubbles, ROIExtractionError
from app.pipeline.fill_scoring import score_all_questions


class GradingPipelineError(Exception):
    """Raised when grading pipeline fails."""
    pass


def run_detection_pipeline(
    scan_id: str,
    image_path: str,
    template_id: str,
    strict_quality: bool = False
) -> DetectionResult:
    """
    Run complete detection pipeline.
    
    Pipeline stages:
    1. Preprocessing & quality checks
    2. Paper boundary detection
    3. Perspective correction
    4. Template alignment (registration marks)
    5. ROI extraction
    6. Fill scoring
    7. Answer determination
    
    Args:
        scan_id: Unique scan identifier
        template_id: Template to use for detection
        image_path: Path to image file
        strict_quality: If True, fail on quality issues
        
    Returns:
        DetectionResult with all findings
    """
    start_time = time.time()
    
    warnings = []
    errors = []
    detections = []
    quality_metrics = {}
    
    logger.info(f"Starting detection pipeline for scan {scan_id}")
    
    try:
        # ============================================================
        # Stage 1: Load Template
        # ============================================================
        logger.info(f"Loading template: {template_id}")
        try:
            template = load_template(template_id)
        except Exception as e:
            errors.append({
                "code": "TEMPLATE_LOAD_FAILED",
                "message": f"Failed to load template '{template_id}': {e}",
                "stage": "template_loading"
            })
            raise GradingPipelineError(f"Template loading failed: {e}")
        
        # ============================================================
        # Stage 2: Preprocessing & Quality Checks
        # ============================================================
        logger.info("Stage 1: Preprocessing")
        try:
            preprocessed, metrics, intermediates = preprocess_image(
                image_path,
                apply_clahe=True,
                check_quality=True,
                min_blur_score=80.0 if strict_quality else 50.0,
                binarization="auto",  # Auto-select Otsu or Adaptive based on lighting
                return_intermediates=True
            )
            
            quality_metrics = {
                "blur_score": metrics.get("blur_score"),
                "brightness_mean": metrics.get("brightness_mean"),
                "brightness_std": metrics.get("brightness_std"),
                "skew_angle": metrics.get("skew_angle")
            }
            
            # Warnings for quality issues
            if metrics.get("blur_score", 0) < 100:
                warnings.append({
                    "code": "LOW_BLUR_SCORE",
                    "message": f"Image may be blurry (score={metrics['blur_score']:.1f})"
                })
            
            if abs(metrics.get("skew_angle", 0)) > 5:
                warnings.append({
                    "code": "SIGNIFICANT_SKEW",
                    "message": f"Image appears skewed ({metrics['skew_angle']:.2f}°)"
                })
                
        except PreprocessingError as e:
            errors.append({
                "code": "PREPROCESSING_FAILED",
                "message": str(e),
                "stage": "preprocessing"
            })
            
            if strict_quality:
                raise GradingPipelineError(f"Preprocessing failed: {e}")
            else:
                # Try without quality checks
                logger.warning("Retrying preprocessing without quality checks")
                preprocessed, metrics = preprocess_image(
                    image_path,
                    apply_clahe=True,
                    check_quality=False
                )
        
        # ============================================================
        # Stage 3: Paper Detection
        # ============================================================
        logger.info("Stage 2: Paper detection")
        try:
            paper_corners = detect_paper_with_fallback(
                preprocessed,
                strict=strict_quality
            )
            
            if paper_corners is None:
                raise PaperDetectionError("Paper boundary could not be detected")
                
        except PaperDetectionError as e:
            errors.append({
                "code": "PAPER_NOT_DETECTED",
                "message": str(e),
                "stage": "paper_detection"
            })
            raise GradingPipelineError(f"Paper detection failed: {e}")
        
        # ============================================================
        # Stage 4: Perspective Correction
        # ============================================================
        logger.info("Stage 3: Perspective correction")
        try:
            warped = correct_perspective(
                preprocessed,
                paper_corners,
                target_size=(
                    template.canonical_size.width,
                    template.canonical_size.height
                )
            )
            
            # Validate correction
            is_valid, reason = validate_perspective_correction(
                warped,
                (template.canonical_size.width, template.canonical_size.height)
            )
            
            if not is_valid:
                warnings.append({
                    "code": "PERSPECTIVE_QUALITY",
                    "message": f"Perspective correction quality issue: {reason}"
                })
            
            quality_metrics["perspective_correction_applied"] = True
            
        except PerspectiveCorrectionError as e:
            errors.append({
                "code": "PERSPECTIVE_CORRECTION_FAILED",
                "message": str(e),
                "stage": "perspective_correction"
            })
            raise GradingPipelineError(f"Perspective correction failed: {e}")
        
        # ============================================================
        # Stage 4.5: Validate perspective quality before alignment
        # ============================================================
        from app.pipeline.perspective import calculate_perspective_quality, estimate_deskew_angle
        
        perspective_quality = calculate_perspective_quality(
            paper_corners,
            preprocessed.shape[:2]
        )
        quality_metrics["perspective_quality"] = perspective_quality
        
        deskew_angle = estimate_deskew_angle(paper_corners)
        quality_metrics["deskew_angle"] = deskew_angle
        
        if perspective_quality < 0.5:
            warnings.append({
                "code": "POOR_PERSPECTIVE",
                "message": f"Paper perspective quality is poor ({perspective_quality:.2f}). "
                           f"Results may be unreliable. Try scanning with less angle."
            })
        
        if abs(deskew_angle) > 10:
            warnings.append({
                "code": "EXCESSIVE_SKEW",
                "message": f"Paper is significantly skewed ({deskew_angle:.1f}°). "
                           f"Results may be unreliable. Align paper straighter."
            })
        
        # ============================================================
        # Stage 5: Template alignment — fiducial homography first, then affine fallback
        # ============================================================
        logger.info("Stage 4: Fiducial homography to template coordinates")
        aligned = warped
        alignment_success = False
        fid_homography_ok = False
        try:
            aligned, fid_homography_ok = warp_fiducials_to_canonical(warped, template)
        except Exception as e:
            logger.warning(f"Fiducial homography error: {e}")
            aligned = warped
            fid_homography_ok = False

        if fid_homography_ok:
            alignment_success = True
        else:
            logger.info("Stage 4b: Affine registration fallback")
            try:
                aligned, alignment_success = align_image_with_template(
                    warped,
                    template,
                    strict=False
                )
                if not alignment_success:
                    warnings.append({
                        "code": "ALIGNMENT_SKIPPED",
                        "message": (
                            "Template alignment was skipped (fiducial homography and "
                            "affine fallback did not apply)"
                        ),
                    })
                    aligned = warped
            except AlignmentError as e:
                warnings.append({
                    "code": "ALIGNMENT_FAILED",
                    "message": str(e)
                })
                aligned = warped
        
        # ============================================================
        # Stage 6: ROI Extraction
        # ============================================================
        logger.info("Stage 5: Bubble ROI extraction")
        try:
            all_bubbles = extract_all_bubbles(aligned, template)
        except ROIExtractionError as e:
            errors.append({
                "code": "ROI_EXTRACTION_FAILED",
                "message": str(e),
                "stage": "roi_extraction"
            })
            raise GradingPipelineError(f"ROI extraction failed: {e}")
        
        # ============================================================
        # Stage 7: Fill Scoring & Answer Determination
        # ============================================================
        logger.info("Stage 6: Fill scoring")
        scored_questions = score_all_questions(
            all_bubbles,
            template.bubble_config
        )
        
        # Convert to DetectionResult format
        for q_id, result in scored_questions.items():
            detection = QuestionDetection(
                question_id=result["question_id"],
                fill_ratios=result["fill_ratios"],
                selected=result["selected"],
                detection_status=result["detection_status"],
                confidence=result.get("confidence")
            )
            detections.append(detection)
        
        # Check for multiple ambiguous answers
        ambiguous_count = sum(
            1 for d in detections
            if d.detection_status == "ambiguous"
        )
        
        if ambiguous_count > 3:
            warnings.append({
                "code": "MULTIPLE_AMBIGUOUS",
                "message": f"{ambiguous_count} questions have ambiguous marks"
            })
        
        # ============================================================
        # Finalize Result
        # ============================================================
        processing_time = (time.time() - start_time) * 1000  # milliseconds
        
        # Determine overall status
        if errors:
            status = "failed"
        elif ambiguous_count > 0:
            status = "needs_review"
        else:
            status = "success"
        
        # Create and save pipeline visualization images
        from app.schemas.detection_result import PipelineImages
        from app.utils.visualization import draw_paper_boundary
        
        def save_visualization(img: np.ndarray, name: str) -> Optional[str]:
            """Save visualization image to disk and return relative path."""
            if img is None:
                return None
            try:
                # Create visualization directory
                vis_dir = Path("storage/pipeline_visualizations") / scan_id
                vis_dir.mkdir(parents=True, exist_ok=True)
                
                # Convert grayscale to BGR for saving
                if len(img.shape) == 2:
                    img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
                
                # Save image
                file_path = vis_dir / f"{name}.jpg"
                cv2.imwrite(str(file_path), img, [cv2.IMWRITE_JPEG_QUALITY, 90])
                
                # Return relative path for API
                return str(file_path.relative_to("storage"))
            except Exception as e:
                logger.warning(f"Failed to save visualization {name}: {e}")
                return None
        
        # Load original for visualization
        original_img = cv2.imread(image_path)
        
        # Stage 1: Original
        path_original = save_visualization(original_img.copy(), "1_original")
        
        # Stage 2: Grayscale
        path_grayscale = None
        if intermediates and intermediates.get('grayscale') is not None:
            path_grayscale = save_visualization(intermediates['grayscale'].copy(), "2_grayscale")
        
        # Stage 3: CLAHE
        path_clahe = None
        if intermediates and intermediates.get('clahe') is not None:
            path_clahe = save_visualization(intermediates['clahe'].copy(), "3_clahe")
        
        # Stage 4: Binary
        path_binary = None
        if intermediates and intermediates.get('binary') is not None:
            path_binary = save_visualization(intermediates['binary'].copy(), "4_binary")
        
        # Stage 5: Paper Detection with boundary overlay
        path_paper = None
        if 'paper_corners' in locals() and paper_corners is not None:
            paper_vis = preprocessed.copy()
            if len(paper_vis.shape) == 2:
                paper_vis = cv2.cvtColor(paper_vis, cv2.COLOR_GRAY2BGR)
            paper_vis = draw_paper_boundary(paper_vis, paper_corners)
            path_paper = save_visualization(paper_vis, "5_paper_detection")
        
        # Stage 6: Perspective Corrected
        path_perspective = None
        if 'warped' in locals() and warped is not None:
            path_perspective = save_visualization(warped.copy(), "6_perspective_corrected")
        
        # Stage 7: Aligned
        path_aligned = None
        if 'aligned' in locals() and aligned is not None:
            path_aligned = save_visualization(aligned.copy(), "7_aligned")
        
        # Stage 8: ROI Extraction visualization
        path_roi = None
        if 'aligned' in locals() and aligned is not None and template is not None:
            roi_vis = aligned.copy()
            if len(roi_vis.shape) == 2:
                roi_vis = cv2.cvtColor(roi_vis, cv2.COLOR_GRAY2BGR)
            
            # Draw all bubble ROIs
            for question_id, question_bubbles in all_bubbles.items():
                question_template = next((q for q in template.questions if q.question_id == question_id), None)
                if question_template:
                    for option, roi_image in question_bubbles.items():
                        if option in question_template.options:
                            pos = question_template.options[option]
                            x, y = template.adjusted_bubble_xy(pos)
                            radius = template.bubble_config.radius
                            
                            color = (0, 255, 0) if roi_image is not None else (0, 0, 255)
                            cv2.circle(roi_vis, (x, y), radius, color, 2)
            
            path_roi = save_visualization(roi_vis, "8_roi_extraction")
        
        # Stage 9: Fill Scoring visualization
        path_scoring = None
        if 'aligned' in locals() and aligned is not None and template is not None and len(detections) > 0:
            scoring_vis = aligned.copy()
            if len(scoring_vis.shape) == 2:
                scoring_vis = cv2.cvtColor(scoring_vis, cv2.COLOR_GRAY2BGR)
            
            # Draw detection results
            for detection in detections:
                question_template = next((q for q in template.questions if q.question_id == detection.question_id), None)
                if question_template:
                    for option in question_template.options.keys():
                        pos = question_template.options[option]
                        x, y = template.adjusted_bubble_xy(pos)
                        radius = template.bubble_config.radius
                        
                        # Color based on selection
                        if option in detection.selected:
                            if detection.detection_status == 'answered':
                                color = (0, 255, 0)  # Green
                                thickness = 3
                            elif detection.detection_status == 'ambiguous':
                                color = (0, 165, 255)  # Orange for ambiguous
                                thickness = 3
                            else:
                                color = (0, 165, 255)  # Orange
                                thickness = 2
                        else:
                            color = (128, 128, 128)  # Gray
                            thickness = 1
                        
                        cv2.circle(scoring_vis, (x, y), radius, color, thickness)
                        
                        # Add fill percentage with visible text
                        fill_pct = detection.fill_ratios.get(option, 0) * 100
                        if fill_pct > 0:
                            text = f"{fill_pct:.0f}%"
                            text_pos = (x + radius + 5, y + 5)
                            
                            # Color-code by fill level: green=high, orange=medium, red=low
                            if fill_pct >= 50:
                                text_color = (0, 200, 0)    # Green
                            elif fill_pct >= 14:
                                text_color = (0, 165, 255)  # Orange (matches fill_threshold)
                            else:
                                text_color = (0, 0, 255)    # Red
                            
                            # Draw black outline first for contrast, then colored text
                            cv2.putText(scoring_vis, text, text_pos,
                                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 3)
                            cv2.putText(scoring_vis, text, text_pos,
                                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, text_color, 1)
                    
                    # Draw question number + status label for ambiguous/unanswered items
                    if detection.detection_status in ('ambiguous', 'unanswered'):
                        first_option_pos = list(question_template.options.values())[0]
                        qx, qy = template.adjusted_bubble_xy(first_option_pos)
                        label = f"Q{detection.question_id}?"
                        label_color = (0, 165, 255) if detection.detection_status == 'ambiguous' else (0, 0, 255)
                        cv2.putText(scoring_vis, label, (qx - radius - 60, qy + 5),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 3)
                        cv2.putText(scoring_vis, label, (qx - radius - 60, qy + 5),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.45, label_color, 1)
            
            path_scoring = save_visualization(scoring_vis, "9_fill_scoring")
        
        pipeline_images = PipelineImages(
            original=path_original,
            grayscale=path_grayscale,
            clahe=path_clahe,
            binary=path_binary,
            paper_detection=path_paper,
            perspective_corrected=path_perspective,
            aligned=path_aligned,
            roi_extraction=path_roi,
            fill_scoring=path_scoring
        )
        
        result = DetectionResult(
            scan_id=scan_id,
            template_id=template_id,
            status=status,
            detections=detections,
            quality_metrics=QualityMetrics(**quality_metrics) if quality_metrics else None,
            warnings=[DetectionWarning(**w) for w in warnings],
            errors=[DetectionError(**e) for e in errors],
            processing_time_ms=processing_time,
            timestamp=datetime.utcnow(),
            pipeline_images=pipeline_images
        )
        
        logger.success(
            f"Detection complete: {len(detections)} questions, "
            f"status={status}, time={processing_time:.0f}ms"
        )
        
        return result
        
    except GradingPipelineError as e:
        # Pipeline failed at a critical stage
        logger.error(f"Pipeline failed: {e}")
        
        processing_time = (time.time() - start_time) * 1000
        
        return DetectionResult(
            scan_id=scan_id,
            template_id=template_id,
            status="failed",
            detections=detections,  # Partial results if any
            quality_metrics=QualityMetrics(**quality_metrics) if quality_metrics else None,
            warnings=[DetectionWarning(**w) for w in warnings],
            errors=[DetectionError(**e) for e in errors],
            processing_time_ms=processing_time,
            timestamp=datetime.utcnow()
        )
    
    except Exception as e:
        # Unexpected error
        logger.exception("Unexpected error in detection pipeline")
        
        processing_time = (time.time() - start_time) * 1000
        
        errors.append({
            "code": "UNEXPECTED_ERROR",
            "message": f"Unexpected error: {type(e).__name__}: {e}",
            "stage": "unknown"
        })
        
        return DetectionResult(
            scan_id=scan_id,
            template_id=template_id,
            status="failed",
            detections=[],
            quality_metrics=None,
            warnings=[DetectionWarning(**w) for w in warnings],
            errors=[DetectionError(**e) for e in errors],
            processing_time_ms=processing_time,
            timestamp=datetime.utcnow()
        )

