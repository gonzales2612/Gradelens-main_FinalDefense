"""
Real-time preview API for live scanner feedback.
Provides lightweight frame analysis without full grading.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import base64
import os
import tempfile
import uuid
import numpy as np
import cv2
from loguru import logger

from app.pipeline.grade import run_detection_pipeline
from app.schemas.detection_result import DetectionResult

from app.pipeline.preprocess import preprocess_image
from app.services.paper_detection import detect_paper_from_fiducials, PaperDetectionError as FiducialDetectionError
from app.pipeline.perspective import correct_perspective, calculate_perspective_quality, estimate_deskew_angle
from app.pipeline.align import detect_registration_marks
from app.pipeline.quality import assess_image_quality
from app.templates.loader import TemplateLoader
from app.utils.image_utils import order_points

router = APIRouter(prefix="/preview", tags=["preview"])


class Position(BaseModel):
    """2D coordinate."""
    x: float
    y: float


class QualityFeedback(BaseModel):
    """User-friendly quality feedback."""
    ready_to_scan: bool = False
    blur_detected: bool = False
    too_dark: bool = False
    too_bright: bool = False
    skewed: bool = False
    too_skewed: bool = False
    poor_perspective: bool = False
    message: str = ""


class FramePreviewRequest(BaseModel):
    """Preview request for a single frame."""
    image: str = Field(..., description="Base64-encoded JPEG/PNG image")
    template_id: str = Field(..., description="Template ID to use for overlay")


class FramePreviewResponse(BaseModel):
    """Lightweight preview response with visual feedback data."""
    paper_detected: bool
    marks_detected: int = 0
    detected_marks: List[Position] = []
    paper_corners: Optional[List[Position]] = None  # For drawing detected paper boundary
    image_width: int = 0  # Backend image dimensions for coordinate scaling
    image_height: int = 0
    quality_score: Optional[float] = None
    quality_feedback: QualityFeedback
    blur_score: Optional[float] = None
    brightness: Optional[float] = None
    skew_angle: Optional[float] = None
    perspective_quality: Optional[float] = None
    
    # Debug images (base64-encoded) - entire pipeline
    original_image: Optional[str] = None
    grayscale_image: Optional[str] = None
    clahe_image: Optional[str] = None
    preprocessed_image: Optional[str] = None
    warped_image: Optional[str] = None


@router.post("", response_model=FramePreviewResponse)
async def preview_frame(request: FramePreviewRequest):
    """
    Analyze a single frame from live scanner for real-time feedback.
    
    This is a lightweight operation focused on:
    - Paper boundary detection
    - Registration mark detection
    - Image quality assessment
    
    Does NOT perform full ROI extraction or grading.
    """
    try:
        # Decode image
        try:
            image_data = base64.b64decode(request.image)
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Failed to decode image")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")
        
        # Encode original image for frontend
        _, original_buffer = cv2.imencode('.jpg', image)
        
        # Load template
        loader = TemplateLoader()
        try:
            template = loader.load(request.template_id)
        except FileNotFoundError:
            raise HTTPException(
                status_code=404,
                detail=f"Template '{request.template_id}' not found"
            )
        
        # Initialize response
        response = FramePreviewResponse(
            paper_detected=False,
            image_width=image.shape[1],
            image_height=image.shape[0],
            quality_feedback=QualityFeedback(
                message="Initializing..."
            )
        )
        
        # Step 1: Preprocess
        try:
            preprocessed, quality_metrics, intermediates = preprocess_image(
                image, 
                check_quality=True,
                min_blur_score=50.0,  # More lenient for live preview
                return_intermediates=True,
                binarization="auto"  # Auto-select best method
            )
            
            # Encode intermediate stages
            response.original_image = base64.b64encode(original_buffer).decode('utf-8')
            
            if intermediates:
                _, gray_buffer = cv2.imencode('.jpg', intermediates['grayscale'])
                response.grayscale_image = base64.b64encode(gray_buffer).decode('utf-8')
                
                if intermediates['clahe'] is not None:
                    _, clahe_buffer = cv2.imencode('.jpg', intermediates['clahe'])
                    response.clahe_image = base64.b64encode(clahe_buffer).decode('utf-8')
                
                # Show binary (black & white) result
                if intermediates['binary'] is not None:
                    _, binary_buffer = cv2.imencode('.jpg', intermediates['binary'])
                    response.preprocessed_image = base64.b64encode(binary_buffer).decode('utf-8')
                else:
                    _, final_buffer = cv2.imencode('.jpg', intermediates['final'])
                    response.preprocessed_image = base64.b64encode(final_buffer).decode('utf-8')
                
        except Exception as e:
            logger.warning(f"Preprocess failed: {e}")
            response.quality_feedback.message = "Failed to preprocess image"
            return response
        
        # Step 2: Assess quality
        try:
            quality = assess_image_quality(preprocessed)
            response.blur_score = quality.blur_score
            response.brightness = quality.brightness_mean
            response.quality_score = _calculate_quality_score(quality)
            
            # Generate feedback
            feedback = QualityFeedback()
            
            if quality.is_blurry:
                feedback.blur_detected = True
                feedback.message = "Image is too blurry - hold camera steady"
            elif quality.is_too_dark:
                feedback.too_dark = True
                feedback.message = "Image is too dark - improve lighting"
            elif quality.is_too_bright:
                feedback.too_bright = True
                feedback.message = "Image is too bright - reduce lighting"
            
            response.quality_feedback = feedback
            
        except Exception as e:
            logger.warning(f"Quality assessment failed: {e}")
        
        # Step 3: Detect paper boundary using fiducials
        # Uses fiducial marker positions from template to determine paper alignment
        try:
            # Convert template fiducials to detection format
            fiducial_list = [
                {
                    'id': mark.id,
                    'position': {'x': mark.position.x, 'y': mark.position.y}
                }
                for mark in template.registration_marks
            ]
            
            # Detect paper using fiducials
            corners, fiducial_results = detect_paper_from_fiducials(
                image,
                fiducial_list,
                detection_radius=100  # Search radius in pixels
            )
            
            response.paper_detected = True
            
            # Corners already in correct order from detect_paper_from_fiducials (TL, TR, BR, BL)
            response.paper_corners = [
                Position(x=float(corner[0]), y=float(corner[1]))
                for corner in corners
            ]
            
            # Assess perspective quality and skew angle
            persp_quality = calculate_perspective_quality(corners, image.shape[:2])
            skew_deg = estimate_deskew_angle(corners)
            response.perspective_quality = persp_quality
            response.skew_angle = skew_deg
            
            # Add quality warnings for skew and perspective
            if abs(skew_deg) > 15:
                response.quality_feedback.too_skewed = True
                response.quality_feedback.message = f"Paper is too skewed ({skew_deg:.0f}\u00b0) \u2014 straighten it"
                response.quality_feedback.ready_to_scan = False
            elif abs(skew_deg) > 8:
                response.quality_feedback.skewed = True
                if not response.quality_feedback.message:
                    response.quality_feedback.message = f"Paper is skewed ({skew_deg:.0f}\u00b0) \u2014 try to align straighter"
            
            if persp_quality < 0.4:
                response.quality_feedback.poor_perspective = True
                response.quality_feedback.ready_to_scan = False
                response.quality_feedback.message = "Paper shape is too distorted \u2014 hold camera directly above"
            
        except (FiducialDetectionError, Exception) as e:
            logger.debug(f"Fiducial-based paper detection failed: {e}")
            response.quality_feedback.message = "Align fiducials to corners"
            return response
        
        # Step 4: Correct perspective
        # IMPORTANT: Use original image for perspective correction since paper_corners
        # are in original image space. preprocessed may be upscaled by preprocess_image
        # (MIN_DIMENSION enforcement), creating a coordinate mismatch.
        try:
            target_size = (template.canonical_size.width, template.canonical_size.height)
            corrected = correct_perspective(image, corners, target_size)
            
            # Convert to grayscale for mark detection (corrected is BGR from original)
            if len(corrected.shape) == 3:
                corrected_gray = cv2.cvtColor(corrected, cv2.COLOR_BGR2GRAY)
            else:
                corrected_gray = corrected
            
            # Encode warped image for frontend debugging
            _, warped_buffer = cv2.imencode('.jpg', corrected)
            response.warped_image = base64.b64encode(warped_buffer).decode('utf-8')
            
        except Exception as e:
            logger.warning(f"Perspective correction failed: {e}")
            response.quality_feedback.message = "Paper detected but correction failed"
            return response
        
        # Step 5: Detect registration marks
        try:
            marks = detect_registration_marks(
                corrected_gray,
                template.registration_marks,
                adaptive_search=True
            )
            
            response.marks_detected = len(marks)
            response.detected_marks = [
                Position(x=float(m[0]), y=float(m[1]))
                for m in marks
            ]
            
            # Check if enough marks detected
            required_marks = len(template.registration_marks)
            if len(marks) < required_marks:
                response.quality_feedback.message = (
                    f"Only {len(marks)}/{required_marks} marks detected"
                )
            elif not response.quality_feedback.message:
                # All good!
                response.quality_feedback.ready_to_scan = True
                response.quality_feedback.message = "Ready to scan"
            
        except Exception as e:
            logger.warning(f"Mark detection failed: {e}")
            response.quality_feedback.message = "Marks not detected"
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preview error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/full", response_model=DetectionResult)
def preview_full_pipeline(request: FramePreviewRequest):
    """
    Run the complete detection pipeline (same orchestration as the scan worker):
    preprocess → paper → perspective → align → ROI → fill scoring.

    Writes nine visualization JPEGs under ``storage/pipeline_visualizations/<scan_id>/``.
    Paths are returned in ``pipeline_images``; open them via ``/storage/<path>``.
    """
    scan_id = f"dev_{uuid.uuid4().hex}"
    tmp_path: Optional[str] = None
    try:
        try:
            image_data = base64.b64decode(request.image)
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None:
                raise ValueError("Failed to decode image")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

        fd, tmp_path = tempfile.mkstemp(suffix=".jpg")
        try:
            ok, buf = cv2.imencode(
                ".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), 92]
            )
            if not ok:
                raise ValueError("Could not encode image as JPEG")
            os.write(fd, buf.tobytes())
        finally:
            os.close(fd)

        return run_detection_pipeline(
            scan_id=scan_id,
            image_path=tmp_path,
            template_id=request.template_id,
            strict_quality=False,
        )
    finally:
        if tmp_path and os.path.isfile(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


def _calculate_quality_score(quality) -> float:
    """
    Calculate a 0-1 quality score for user feedback.
    
    Penalizes:
    - Blur (most important)
    - Extreme brightness
    - Low contrast
    """
    score = 1.0
    
    # Blur penalty (0-0.5 reduction)
    if hasattr(quality, 'blur_score') and quality.blur_score is not None:
        # blur_score typically 0-500, lower is sharper
        # Good images: < 100, Bad: > 200
        if quality.blur_score > 100:
            penalty = min((quality.blur_score - 100) / 200, 0.5)
            score -= penalty
    
    # Brightness penalty (0-0.3 reduction)
    if hasattr(quality, 'brightness_mean') and quality.brightness_mean is not None:
        # Ideal: 100-180, penalize outside this range
        brightness = quality.brightness_mean
        if brightness < 80:
            score -= min((80 - brightness) / 80 * 0.3, 0.3)
        elif brightness > 200:
            score -= min((brightness - 200) / 55 * 0.3, 0.3)
    
    # Contrast penalty (0-0.2 reduction)
    if hasattr(quality, 'brightness_std') and quality.brightness_std is not None:
        # Low std = low contrast
        if quality.brightness_std < 30:
            score -= min((30 - quality.brightness_std) / 30 * 0.2, 0.2)
    
    return max(0.0, min(1.0, score))
