"""
Detection result schema - raw CV output (FACTS only).
No grading decisions, no correctness determination.
"""
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Literal
from datetime import datetime


class QuestionDetection(BaseModel):
    """
    Per-question detection result.
    Contains raw measurements, not grading decisions.
    """
    question_id: int = Field(..., ge=1)
    fill_ratios: Dict[str, float] = Field(
        ...,
        description="Raw fill ratio for each bubble (0.0=empty, 1.0=filled)"
    )
    selected: List[str] = Field(
        ...,
        description="Detected answer(s) based on threshold (empty if unanswered, multiple if ambiguous)"
    )
    detection_status: Literal["answered", "unanswered", "ambiguous", "error"] = Field(
        ...,
        description="Detection status for this question"
    )
    confidence: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Detection confidence (e.g., difference between top 2 fill ratios)"
    )


class QualityMetrics(BaseModel):
    """Image quality measurements."""
    blur_score: Optional[float] = Field(
        None,
        description="Laplacian variance (higher = sharper, typically >100 is acceptable)"
    )
    brightness_mean: Optional[float] = Field(
        None,
        ge=0,
        le=255,
        description="Average pixel intensity"
    )
    brightness_std: Optional[float] = Field(
        None,
        ge=0,
        description="Standard deviation of brightness"
    )
    skew_angle: Optional[float] = Field(
        None,
        description="Detected skew in degrees"
    )
    perspective_correction_applied: Optional[bool] = Field(
        None,
        description="Whether perspective correction was successful"
    )


class DetectionWarning(BaseModel):
    """Non-critical issue detected during processing."""
    code: str = Field(..., description="Warning code (e.g., 'LOW_BLUR_SCORE')")
    message: str = Field(..., description="Human-readable warning message")
    question_id: Optional[int] = Field(None, description="Related question (if applicable)")


class DetectionError(BaseModel):
    """Critical error that prevented processing."""
    code: str = Field(..., description="Error code (e.g., 'PAPER_NOT_DETECTED')")
    message: str = Field(..., description="Human-readable error message")
    stage: Optional[str] = Field(None, description="Pipeline stage where error occurred")


class PipelineImages(BaseModel):
    """Pipeline visualization image file paths."""
    original: Optional[str] = Field(None, description="Original input image path")
    grayscale: Optional[str] = Field(None, description="Grayscale conversion path")
    clahe: Optional[str] = Field(None, description="CLAHE contrast enhancement path")
    binary: Optional[str] = Field(None, description="Binarized (Otsu/Adaptive) path")
    paper_detection: Optional[str] = Field(None, description="Paper boundary visualization path")
    perspective_corrected: Optional[str] = Field(None, description="Perspective-corrected image path")
    aligned: Optional[str] = Field(None, description="Template-aligned with registration marks path")
    roi_extraction: Optional[str] = Field(None, description="ROI extraction visualization path")
    fill_scoring: Optional[str] = Field(None, description="Final fill detection overlay path")


class DetectionResult(BaseModel):
    """
    Complete detection result from Python CV pipeline.
    
    CRITICAL: Contains FACTS only - no grading decisions.
    Node.js business layer will compare this to answer key and apply grading policy.
    """
    scan_id: str = Field(..., description="Reference to the scan job")
    template_id: str = Field(..., description="Template used for detection")
    status: Literal["success", "failed", "needs_review"] = Field(
        ...,
        description="Overall detection status"
    )
    detections: List[QuestionDetection] = Field(
        ...,
        description="Per-question detection results"
    )
    quality_metrics: Optional[QualityMetrics] = Field(
        None,
        description="Image quality measurements"
    )
    warnings: List[DetectionWarning] = Field(
        default_factory=list,
        description="Non-critical issues detected"
    )
    errors: List[DetectionError] = Field(
        default_factory=list,
        description="Critical errors that prevented processing"
    )
    processing_time_ms: Optional[float] = Field(
        None,
        ge=0,
        description="Total processing time in milliseconds"
    )
    timestamp: Optional[datetime] = Field(
        None,
        description="When detection was completed"
    )
    pipeline_images: Optional[PipelineImages] = Field(
        None,
        description="Pipeline visualization images for debugging"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "scan_id": "scan_abc123",
                "template_id": "form_A",
                "status": "success",
                "detections": [
                    {
                        "question_id": 1,
                        "fill_ratios": {"A": 0.05, "B": 0.82, "C": 0.04, "D": 0.03},
                        "selected": ["B"],
                        "detection_status": "answered",
                        "confidence": 0.77
                    },
                    {
                        "question_id": 2,
                        "fill_ratios": {"A": 0.68, "B": 0.71, "C": 0.05, "D": 0.06},
                        "selected": ["A", "B"],
                        "detection_status": "ambiguous",
                        "confidence": 0.03
                    }
                ],
                "quality_metrics": {
                    "blur_score": 312.4,
                    "brightness_mean": 198.5,
                    "skew_angle": 1.2,
                    "perspective_correction_applied": True
                },
                "warnings": [
                    {
                        "code": "MULTIPLE_AMBIGUOUS",
                        "message": "2 questions have ambiguous marks"
                    }
                ],
                "processing_time_ms": 1250.5
            }
        }
