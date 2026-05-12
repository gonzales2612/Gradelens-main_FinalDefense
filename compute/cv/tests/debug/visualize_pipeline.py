"""
Pipeline Visualization Tool

This script runs the full OMR pipeline and saves detailed images for each stage,
allowing developers to visually debug and understand the pipeline behavior at a granular level.

Preprocessing stages include:
- Original image
- Grayscale conversion
- CLAHE enhancement
- Binarization (Otsu or Adaptive)
- Quality metrics

Pipeline stages include:
- Paper detection with boundary visualization
- Perspective correction
- Template alignment with registration mark detection
- ROI extraction with success/failure color coding
- Fill scoring with fill percentages

Usage:
    python -m tests.debug.visualize_pipeline --image <path> --template <template_id> --output <dir>
    
Example:

    # Basic test with sample image and form_A template
    python -m tests.debug.visualize_pipeline
        --image storage/scans/sample_test_vertical.jpg
        --template form_A
        --output tests/output/debug_001

    /

    # Perfect form A
    python -m tests.debug.visualize_pipeline
        --image tests/fixtures/images/test_perfect_form_A.png
        --template form_A
        --output tests/output/debug_002

    /

    # Perfect form with 60 questions
    python -m tests.debug.visualize_pipeline
        --image tests/fixtures/images/test_perfect_form_60q.png
        --template form_60q
        --output tests/output/debug_60q
"""
import argparse
import sys
from pathlib import Path
from typing import Dict, Any, List, Tuple
import cv2
import numpy as np
from loguru import logger

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.pipeline.preprocess import preprocess_image
from app.pipeline.paper_detection import detect_paper_boundary, validate_paper_detection
from app.pipeline.perspective import correct_perspective
from app.pipeline.align import align_image_with_template
from app.pipeline.roi_extraction import extract_all_bubbles
from app.pipeline.fill_scoring import score_all_questions
from app.templates.loader import load_template
from app.utils.visualization import (
    draw_paper_boundary,
    create_pipeline_stages_grid
)


class PipelineVisualizer:
    """Runs pipeline with visualization at each stage."""
    
    def __init__(self, image_path: str, template_id: str, output_dir: str):
        self.image_path = Path(image_path)
        self.template_id = template_id
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.stages: List[Dict[str, Any]] = []
        self.template = None
        
    def run(self) -> bool:
        """Execute pipeline with visualization."""
        logger.info(f"Starting visualization for: {self.image_path}")
        logger.info(f"Output directory: {self.output_dir}")
        
        try:
            # Load template
            self._stage_load_template()
            
            # Stage 1: Preprocessing
            preprocessed, metrics = self._stage_preprocess()
            if preprocessed is None:
                return False
            
            # Stage 2: Paper detection
            boundary, detected_img = self._stage_paper_detection(preprocessed)
            
            # Stage 3: Perspective correction
            corrected = self._stage_perspective_correction(preprocessed, boundary)
            if corrected is None:
                return False
            
            # Stage 4: Template alignment
            aligned, alignment_img = self._stage_alignment(corrected)
            
            # Stage 5: ROI extraction
            bubbles, roi_img = self._stage_roi_extraction(aligned)
            
            # Stage 6: Fill scoring
            detections, scored_img = self._stage_fill_scoring(aligned, bubbles)
            
            # Save all stages
            self._save_all_stages()
            
            # Create summary grid
            self._create_summary_grid()
            
            logger.success(f"✅ Visualization complete! Saved to {self.output_dir}")
            return True
            
        except Exception as e:
            logger.error(f"Visualization failed: {e}")
            return False
    
    def _stage_load_template(self):
        """Load template."""
        logger.info("📋 Loading template...")
        self.template = load_template(self.template_id)
        logger.info(f"  Template: {self.template.template_id}")
        logger.info(f"  Questions: {len(self.template.questions)}")
        logger.info(f"  Registration marks: {len(self.template.registration_marks)}")
    
    def _stage_preprocess(self) -> Tuple[np.ndarray, Dict]:
        """Stage 1: Preprocessing (with all intermediate stages)."""
        logger.info("🔧 Stage 1: Preprocessing (Detailed)")
        
        # Convert path with forward slashes for cv2.imread compatibility
        image_path_str = str(self.image_path).replace('\\', '/')
        
        # Try to load image
        original = cv2.imread(image_path_str)
        if original is None:
            logger.error(f"  ❌ Failed to load image from: {image_path_str}")
            logger.error(f"  File exists: {self.image_path.exists()}")
            return None, {}
        
        # Get preprocessing with all intermediates
        preprocessed, metrics, intermediates = preprocess_image(
            str(self.image_path),
            return_intermediates=True
        )
        
        # Stage 1a: Original Image (no overlay - keep pristine)
        self.stages.append({
            'name': '1a_original',
            'title': 'Stage 1a: Original Image',
            'image': original.copy(),
        })
        
        # Stage 1b: Grayscale Conversion (no overlay - show raw grayscale)
        self.stages.append({
            'name': '1b_grayscale',
            'title': 'Stage 1b: Grayscale Conversion',
            'image': cv2.cvtColor(intermediates['grayscale'], cv2.COLOR_GRAY2BGR),
        })
        
        # Stage 1c: CLAHE Enhancement (no overlay - show raw CLAHE)
        if intermediates['clahe'] is not None:
            self.stages.append({
                'name': '1c_clahe',
                'title': 'Stage 1c: CLAHE Enhancement',
                'image': cv2.cvtColor(intermediates['clahe'], cv2.COLOR_GRAY2BGR),
            })
        
        # Stage 1d: Binarization (no overlay - show raw binary black & white)
        if intermediates['binary'] is not None:
            # Determine which method was used
            brightness_std = metrics.get('brightness_std', 50)
            method = "Adaptive Gaussian" if brightness_std < 40 else "Otsu"
            
            self.stages.append({
                'name': '1d_binary',
                'title': f'Stage 1d: Binarization ({method})',
                'image': cv2.cvtColor(intermediates['binary'], cv2.COLOR_GRAY2BGR),
            })
        
        # Stage 1e: Quality Metrics Summary
        metrics_img = preprocessed.copy()
        if len(metrics_img.shape) == 2:
            metrics_img = cv2.cvtColor(metrics_img, cv2.COLOR_GRAY2BGR)
        
        y_offset = 30
        cv2.putText(metrics_img, "Quality Metrics:", (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        y_offset += 40
        cv2.putText(metrics_img, f"Blur Score: {metrics['blur_score']:.1f}", 
                    (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        y_offset += 30
        cv2.putText(metrics_img, f"Brightness: {metrics['brightness_mean']:.1f} +/- {metrics['brightness_std']:.1f}", 
                    (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        y_offset += 30
        cv2.putText(metrics_img, f"Skew: {metrics['skew_angle']:.2f} degrees", 
                    (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        # Add quality assessments
        y_offset += 40
        if metrics['blur_score'] >= 100:
            cv2.putText(metrics_img, "Blur: GOOD", (10, y_offset),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        else:
            cv2.putText(metrics_img, "Blur: WARNING", (10, y_offset),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
        y_offset += 30
        
        if 80 <= metrics['brightness_mean'] <= 200:
            cv2.putText(metrics_img, "Brightness: GOOD", (10, y_offset),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        else:
            cv2.putText(metrics_img, "Brightness: WARNING", (10, y_offset),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
        
        self.stages.append({
            'name': '1e_metrics',
            'title': 'Stage 1e: Quality Metrics',
            'image': metrics_img,
            'metrics': metrics
        })
        
        logger.info(f"  Blur: {metrics['blur_score']:.1f}, Brightness: {metrics['brightness_mean']:.1f}, Skew: {metrics['skew_angle']:.2f}°")
        return preprocessed, metrics
    
    def _stage_paper_detection(self, image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Stage 2: Paper detection."""
        logger.info("📄 Stage 2: Paper Detection")
        
        try:
            boundary = detect_paper_boundary(image)
            is_valid = validate_paper_detection(boundary, image.shape)
        except Exception as e:
            logger.warning(f"  Paper detection failed: {e}")
            logger.warning("  Using full image as boundary")
            # Fallback: use full image boundaries
            h, w = image.shape[:2]
            boundary = np.array([
                [0, 0],
                [w, 0],
                [w, h],
                [0, h]
            ], dtype=np.float32)
            is_valid = False
        
        # Visualize with detailed contour info
        vis_img = image.copy()
        if len(vis_img.shape) == 2:
            vis_img = cv2.cvtColor(vis_img, cv2.COLOR_GRAY2BGR)
        
        vis_img = draw_paper_boundary(vis_img, boundary)
        
        # Calculate and display boundary info
        h, w = image.shape[:2]
        img_area = h * w
        
        # Calculate boundary area using contour
        boundary_area = cv2.contourArea(boundary)
        coverage = (boundary_area / img_area) * 100
        
        # Add detailed status
        y_offset = 30
        status = "✓ Paper Detected" if is_valid else "⚠ Using Fallback"
        color = (0, 255, 0) if is_valid else (0, 165, 255)
        cv2.putText(vis_img, status, (10, y_offset), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        
        y_offset += 35
        cv2.putText(vis_img, f"Coverage: {coverage:.1f}%", (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        y_offset += 30
        cv2.putText(vis_img, f"Corners: {len(boundary)} points", (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        # Draw corner labels
        if len(boundary) == 4:
            labels = ["TL", "TR", "BR", "BL"]
            for i, (point, label) in enumerate(zip(boundary, labels)):
                x, y = int(point[0]), int(point[1])
                cv2.circle(vis_img, (x, y), 10, (255, 0, 255), -1)
                cv2.putText(vis_img, label, (x + 15, y + 5),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 255), 2)
        
        self.stages.append({
            'name': '2_paper_detection',
            'title': 'Stage 2: Paper Detection',
            'image': vis_img,
            'valid': is_valid,
            'coverage': coverage
        })
        
        logger.info(f"  Boundary: {len(boundary)} corners, {coverage:.1f}% coverage")
        return boundary, vis_img
    
    def _stage_perspective_correction(self, image: np.ndarray, boundary: np.ndarray) -> np.ndarray:
        """Stage 3: Perspective correction."""
        logger.info("🔲 Stage 3: Perspective Correction")
        
        target_size = (self.template.canonical_size.width, self.template.canonical_size.height)
        corrected = correct_perspective(image, boundary, target_size)
        
        if corrected is None:
            logger.error("  ❌ Perspective correction failed")
            return None
        
        # Add dimensions text
        vis_img = corrected.copy()
        if len(vis_img.shape) == 2:
            vis_img = cv2.cvtColor(vis_img, cv2.COLOR_GRAY2BGR)
        
        h, w = corrected.shape[:2]
        cv2.putText(vis_img, f"Size: {w}x{h}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        self.stages.append({
            'name': '3_perspective_corrected',
            'title': 'Stage 3: Perspective Corrected',
            'image': vis_img
        })
        
        logger.info(f"  Corrected to: {w}x{h}")
        return corrected
    
    def _stage_alignment(self, image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Stage 4: Template alignment."""
        logger.info("🎯 Stage 4: Template Alignment")
        
        # Use align_image_with_template which handles mark detection internally
        try:
            aligned, alignment_successful = align_image_with_template(image, self.template)
            if alignment_successful:
                status_text = "✓ Aligned successfully"
                logger.info("  Alignment successful")
            else:
                status_text = "⚠ Alignment not needed"
                logger.warning("  Alignment was not performed")
        except Exception as e:
            status_text = f"⚠ Alignment failed: {str(e)[:30]}"
            logger.warning(f"  Alignment failed: {e}")
            aligned = image.copy()
            alignment_successful = False
        
        # Visualize with registration mark details
        vis_img = image.copy()
        if len(vis_img.shape) == 2:
            vis_img = cv2.cvtColor(vis_img, cv2.COLOR_GRAY2BGR)
        
        # Draw expected registration mark positions
        detected_count = 0
        for mark in self.template.registration_marks:
            x, y = mark.position.x, mark.position.y
            size = mark.size
            
            # Draw expected position (yellow circle)
            cv2.circle(vis_img, (x, y), size, (0, 255, 255), 2)
            
            # Try to detect if mark is actually present
            # Extract ROI around expected position
            search_radius = int(size * 2)
            y1, y2 = max(0, y - search_radius), min(image.shape[0], y + search_radius)
            x1, x2 = max(0, x - search_radius), min(image.shape[1], x + search_radius)
            
            if y2 > y1 and x2 > x1:
                roi = image[y1:y2, x1:x2]
                # Simple detection: check for dark region
                mean_val = np.mean(roi)
                is_detected = mean_val < 100  # Dark region
                
                if is_detected:
                    # Green checkmark for detected
                    cv2.circle(vis_img, (x, y), size // 2, (0, 255, 0), -1)
                    detected_count += 1
                    label_color = (0, 255, 0)
                else:
                    # Red X for not detected
                    cv2.line(vis_img, (x - size//2, y - size//2), (x + size//2, y + size//2), (0, 0, 255), 2)
                    cv2.line(vis_img, (x + size//2, y - size//2), (x - size//2, y + size//2), (0, 0, 255), 2)
                    label_color = (0, 0, 255)
                
                # Mark label
                cv2.putText(vis_img, mark.id[:2].upper(), (x + size + 5, y + 5),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, label_color, 2)
        
        # Status overlay
        y_offset = 30
        cv2.putText(vis_img, status_text, (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        
        y_offset += 35
        cv2.putText(vis_img, f"Registration Marks: {detected_count}/{len(self.template.registration_marks)}", 
                    (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        y_offset += 30
        cv2.putText(vis_img, f"Mark Size: {self.template.registration_marks[0].size}px", 
                    (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        self.stages.append({
            'name': '4_aligned',
            'title': 'Stage 4: Template Alignment',
            'image': vis_img,
            'aligned': alignment_successful,
            'marks_detected': detected_count
        })
        
        logger.info(f"  Marks detected: {detected_count}/{len(self.template.registration_marks)}")
        return aligned, vis_img
    
    def _stage_roi_extraction(self, image: np.ndarray) -> Tuple[Dict, np.ndarray]:
        """Stage 5: ROI extraction."""
        logger.info("✂️ Stage 5: ROI Extraction")
        
        bubbles = extract_all_bubbles(image, self.template)
        
        # Visualize - draw rectangles around extracted regions with color coding
        vis_img = image.copy()
        if len(vis_img.shape) == 2:
            vis_img = cv2.cvtColor(vis_img, cv2.COLOR_GRAY2BGR)
        
        total_rois = 0
        successful_rois = 0
        failed_rois = 0
        
        # bubbles is Dict[question_id, Dict[option, roi_image]]
        for question_id, question_bubbles in bubbles.items():
            # Find the corresponding question in template to get positions
            question_template = next((q for q in self.template.questions if q.question_id == question_id), None)
            if question_template is None:
                continue
            
            for option, roi_image in question_bubbles.items():
                total_rois += 1
                
                try:
                    # Get position from template
                    if option in question_template.options:
                        pos = question_template.options[option]
                        # Handle Position object with x, y attributes
                        if hasattr(pos, 'x') and hasattr(pos, 'y'):
                            x, y = int(pos.x), int(pos.y)
                        else:
                            x, y = int(pos[0]), int(pos[1])
                        
                        radius = self.template.bubble_config.radius
                        
                        # Color code based on extraction success
                        if roi_image is not None and roi_image.size > 0:
                            color = (0, 255, 0)  # Green for successful
                            successful_rois += 1
                        else:
                            color = (0, 0, 255)  # Red for failed
                            failed_rois += 1
                        
                        # Draw square ROI
                        cv2.rectangle(vis_img, 
                                    (x - radius, y - radius),
                                    (x + radius, y + radius),
                                    color, 1)
                        
                        # Draw center point
                        cv2.circle(vis_img, (x, y), 2, (255, 0, 0), -1)
                        
                        # Draw question number for first option
                        if option == 'A':
                            cv2.putText(vis_img, f"Q{question_id}", (x + radius + 5, y),
                                       cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 255), 1)
                except Exception as e:
                    logger.debug(f"Error drawing ROI for Q{question_id}{option}: {e}")
        
        # Status overlay
        y_offset = 30
        cv2.putText(vis_img, f"Total ROIs: {total_rois}", (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        y_offset += 30
        cv2.putText(vis_img, f"Successful: {successful_rois}", (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        y_offset += 30
        cv2.putText(vis_img, f"Failed: {failed_rois}", (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
        y_offset += 30
        cv2.putText(vis_img, f"Radius: {self.template.bubble_config.radius}px", (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        self.stages.append({
            'name': '5_roi_extraction',
            'title': 'Stage 5: ROI Extraction',
            'image': vis_img,
            'total_rois': total_rois,
            'successful_rois': successful_rois,
            'failed_rois': failed_rois
        })
        
        logger.info(f"  Extracted {successful_rois}/{total_rois} bubble ROIs successfully")
        return bubbles, vis_img
    
    def _stage_fill_scoring(self, image: np.ndarray, bubbles: Dict) -> Tuple[List, np.ndarray]:
        """Stage 6: Fill scoring."""
        logger.info("📊 Stage 6: Fill Scoring")
        
        detections = score_all_questions(bubbles, self.template.bubble_config)
        
        # Visualize with detailed fill percentages
        vis_img = image.copy()
        if len(vis_img.shape) == 2:
            vis_img = cv2.cvtColor(vis_img, cv2.COLOR_GRAY2BGR)
        
        # Count statuses
        answered = 0
        unanswered = 0
        ambiguous = 0
        
        # Track fill percentages for histogram
        fill_percentages = []
        
        # Draw bubble circles with status-based colors and fill percentages
        for question_id, detection_result in detections.items():
            # Find the template question
            template_q = next((q for q in self.template.questions if q.question_id == question_id), None)
            if not template_q:
                continue
            
            # Get overall status for this question
            status = detection_result.get('detection_status', 'unanswered')
            fill_ratios = detection_result.get('fill_ratios', {})
            selected_options = detection_result.get('selected', [])
            
            # Update counters based on question status
            if status == 'answered':
                answered += 1
            elif status == 'ambiguous':
                ambiguous += 1
            else:
                unanswered += 1
            
            # Draw each bubble option
            for option in template_q.options.keys():
                if option in template_q.options:
                    pos = template_q.options[option]
                    x = int(pos.x) if hasattr(pos, 'x') else int(pos[0])
                    y = int(pos.y) if hasattr(pos, 'y') else int(pos[1])
                    
                    # Get fill percentage for this option (ratio * 100)
                    fill_ratio = fill_ratios.get(option, 0.0)
                    fill_pct = fill_ratio * 100
                    fill_percentages.append(fill_pct)
                    
                    # Determine color based on whether this option is selected
                    if option in selected_options:
                        if status == 'answered':
                            color = (0, 255, 0)  # Green for selected in answered
                            thickness = 3
                        elif status == 'ambiguous':
                            color = (0, 0, 255)  # Red for ambiguous
                            thickness = 3
                        else:
                            color = (0, 165, 255)  # Orange
                            thickness = 2
                    else:
                        color = (128, 128, 128)  # Gray for not selected
                        thickness = 1
                    
                    # Draw circle for bubble
                    radius = self.template.bubble_config.radius
                    cv2.circle(vis_img, (x, y), radius, color, thickness)
                    
                    # Draw fill percentage text for ALL bubbles to show detection working
                    text = f"{fill_pct:.0f}%"
                    # Position text outside the circle
                    text_x = x + radius + 5
                    text_y = y + 5
                    font_scale = 0.35
                    text_color = (255, 255, 255) if option in selected_options else (150, 150, 150)
                    cv2.putText(vis_img, text, (text_x, text_y),
                               cv2.FONT_HERSHEY_SIMPLEX, font_scale, text_color, 1)
        
        # Status overlay with detailed stats
        y_offset = 30
        cv2.putText(vis_img, "Detection Results:", (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        y_offset += 35
        cv2.putText(vis_img, f"Answered: {answered}", (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        y_offset += 30
        cv2.putText(vis_img, f"Unanswered: {unanswered}", (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
        y_offset += 30
        cv2.putText(vis_img, f"Ambiguous: {ambiguous}", (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
        
        # Add threshold info
        y_offset += 40
        threshold = self.template.bubble_config.fill_threshold
        cv2.putText(vis_img, f"Threshold: {threshold}%", (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Add fill percentage stats
        if fill_percentages:
            avg_fill = np.mean(fill_percentages)
            max_fill = np.max(fill_percentages)
            y_offset += 25
            cv2.putText(vis_img, f"Avg Fill: {avg_fill:.1f}%", (10, y_offset),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            y_offset += 25
            cv2.putText(vis_img, f"Max Fill: {max_fill:.1f}%", (10, y_offset),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        self.stages.append({
            'name': '6_fill_scoring',
            'title': 'Stage 6: Fill Scoring & Detection',
            'image': vis_img,
            'detections': detections,
            'answered': answered,
            'unanswered': unanswered,
            'ambiguous': ambiguous
        })
        
        logger.info(f"  Answered: {answered}, Unanswered: {unanswered}, Ambiguous: {ambiguous}")
        return detections, vis_img
    
    def _save_all_stages(self):
        """Save individual stage images."""
        logger.info("💾 Saving stage images...")
        
        for stage in self.stages:
            output_path = self.output_dir / f"{stage['name']}.png"
            cv2.imwrite(str(output_path), stage['image'])
            logger.info(f"  Saved: {output_path.name}")
    
    def _create_summary_grid(self):
        """Create grid view of all stages."""
        logger.info("📸 Creating summary grid...")
        
        # Prepare stages as list of (title, image) tuples
        stages = [(stage['title'], stage['image']) for stage in self.stages]
        
        try:
            # Use 4 columns for better layout with more stages
            grid = create_pipeline_stages_grid(stages, grid_cols=4)
            
            output_path = self.output_dir / "00_summary_grid.png"
            cv2.imwrite(str(output_path), grid)
            logger.info(f"  Saved: {output_path.name} ({len(self.stages)} stages)")
        except Exception as e:
            logger.warning(f"  Failed to create grid: {e}")


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Visualize OMR pipeline stages")
    parser.add_argument("--image", required=True, help="Path to input image")
    parser.add_argument("--template", required=True, help="Template ID (e.g., form_A)")
    parser.add_argument("--output", required=True, help="Output directory for debug images")
    
    args = parser.parse_args()
    
    # Configure logging
    logger.remove()
    logger.add(sys.stderr, level="INFO")
    
    visualizer = PipelineVisualizer(args.image, args.template, args.output)
    success = visualizer.run()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
