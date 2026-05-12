"""
Image quality assessment module.
Evaluates image characteristics for scan readiness.
"""
import cv2
import numpy as np
from dataclasses import dataclass
from typing import Optional


@dataclass
class QualityMetrics:
    """Image quality metrics."""
    blur_score: float
    brightness_mean: float
    brightness_std: float
    contrast_score: float
    is_blurry: bool
    is_too_dark: bool
    is_too_bright: bool
    
    
def assess_image_quality(image: np.ndarray, blur_threshold: float = 150.0) -> QualityMetrics:
    """
    Assess image quality for OMR scanning.
    
    Args:
        image: Grayscale or color image
        blur_threshold: Laplacian variance threshold (lower = blurrier)
        
    Returns:
        QualityMetrics with assessment results
    """
    # Convert to grayscale if needed
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # 1. Blur detection using Laplacian variance
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    blur_score = laplacian.var()
    is_blurry = blur_score < blur_threshold
    
    # 2. Brightness analysis
    brightness_mean = float(np.mean(gray))
    brightness_std = float(np.std(gray))
    
    # Thresholds (0-255 scale)
    is_too_dark = brightness_mean < 80
    is_too_bright = brightness_mean > 200
    
    # 3. Contrast score (normalized standard deviation)
    contrast_score = brightness_std / 128.0  # Normalize to 0-2 range
    
    return QualityMetrics(
        blur_score=float(blur_score),
        brightness_mean=brightness_mean,
        brightness_std=brightness_std,
        contrast_score=contrast_score,
        is_blurry=is_blurry,
        is_too_dark=is_too_dark,
        is_too_bright=is_too_bright,
    )
