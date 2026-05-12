"""
Paper detection module.
Detects paper boundaries in scanned images using edge detection and contour analysis.
"""
import cv2
import numpy as np
from typing import Tuple, Optional
from loguru import logger

from app.utils.contour_utils import (
    find_largest_contour,
    find_quadrilateral,
    filter_contours_by_area
)
from app.utils.image_utils import resize_with_aspect_ratio


class PaperDetectionError(Exception):
    """Raised when paper cannot be detected in image."""
    pass


def detect_paper_boundary(
    image: np.ndarray,
    min_area_ratio: float = 0.25,
    max_area_ratio: float = 0.95
) -> np.ndarray:
    """
    Detect paper boundary in image.
    
    Strategy:
    1. Convert to grayscale
    2. Apply Gaussian blur
    3. Canny edge detection
    4. Find contours
    5. Identify largest quadrilateral
    6. Validate it's paper-sized
    
    Args:
        image: Input image (BGR or grayscale)
        min_area_ratio: Minimum paper area as ratio of image area
        max_area_ratio: Maximum paper area as ratio of image area
        
    Returns:
        4 corner points of paper boundary (ordered: TL, TR, BR, BL)
        
    Raises:
        PaperDetectionError: If paper cannot be reliably detected
    """
    original_shape = image.shape
    
    # Resize for faster processing
    if max(image.shape[:2]) > 1500:
        working_image, scale = resize_with_aspect_ratio(image, max_dimension=1500)
    else:
        working_image = image.copy()
        scale = 1.0
    
    # Convert to grayscale
    if len(working_image.shape) == 3:
        gray = cv2.cvtColor(working_image, cv2.COLOR_BGR2GRAY)
    else:
        gray = working_image
    
    logger.debug(f"Paper detection on {gray.shape} image (scale={scale:.2f})")
    
    # Apply Gaussian blur to reduce noise
    # Kernel size proportional to image size for resolution-independence
    blur_k = max(3, int(max(gray.shape[:2]) * 0.007) | 1)  # ~0.7% of largest dim, ensure odd
    blurred = cv2.GaussianBlur(gray, (blur_k, blur_k), 0)
    
    # Canny edge detection
    edges = cv2.Canny(blurred, 50, 150)
    
    # Dilate edges to close gaps
    # Kernel size proportional to image size
    dilate_k = max(3, int(max(gray.shape[:2]) * 0.007) | 1)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (dilate_k, dilate_k))
    dilated = cv2.dilate(edges, kernel, iterations=2)
    
    # Find contours
    contours, _ = cv2.findContours(
        dilated,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )
    
    if not contours:
        raise PaperDetectionError("No contours detected in image")
    
    logger.debug(f"Found {len(contours)} contours")
    
    # Calculate image area for validation
    img_area = gray.shape[0] * gray.shape[1]
    min_area = img_area * min_area_ratio
    max_area = img_area * max_area_ratio
    
    # Filter by area
    valid_contours = filter_contours_by_area(contours, min_area, max_area)
    
    if not valid_contours:
        raise PaperDetectionError(
            f"No contours with area between {min_area:.0f} and {max_area:.0f} pixels"
        )
    
    logger.debug(f"Valid contours: {len(valid_contours)}")
    
    # Find quadrilateral (4-sided polygon)
    paper_contour = find_quadrilateral(valid_contours)
    
    if paper_contour is None:
        # Fallback: use bounding rectangle of largest contour
        largest = find_largest_contour(valid_contours)
        if largest is None:
            raise PaperDetectionError("Could not find paper boundary")
        
        x, y, w, h = cv2.boundingRect(largest)
        paper_contour = np.array([
            [x, y],
            [x + w, y],
            [x + w, y + h],
            [x, y + h]
        ], dtype=np.float32)
        
        logger.warning("Using bounding rectangle as fallback for paper detection")
    
    # Scale back to original size
    if scale != 1.0:
        paper_contour = paper_contour / scale
    
    # Validate corners are within image bounds
    h, w = original_shape[:2]
    paper_contour[:, 0] = np.clip(paper_contour[:, 0], 0, w - 1)
    paper_contour[:, 1] = np.clip(paper_contour[:, 1], 0, h - 1)

    # Ensure correct dtype for OpenCV contour operations
    paper_contour = paper_contour.astype(np.float32)
    
    # Calculate detected area
    detected_area = cv2.contourArea(paper_contour)
    original_area = original_shape[0] * original_shape[1]
    area_ratio = detected_area / original_area
    
    logger.success(
        f"Paper detected: {paper_contour.shape} corners, "
        f"area ratio: {area_ratio:.2%}"
    )
    
    return paper_contour.astype(np.float32)


def validate_paper_detection(
    corners: np.ndarray,
    image_shape: Tuple[int, int],
    min_area_ratio: float = 0.25
) -> Tuple[bool, str]:
    """
    Validate detected paper boundary.
    
    Args:
        corners: 4 corner points
        image_shape: (height, width) of image
        min_area_ratio: Minimum acceptable area ratio
        
    Returns:
        (is_valid, reason)
    """
    # Check number of corners
    if corners.shape[0] != 4:
        return False, f"Expected 4 corners, got {corners.shape[0]}"
    
    # Check area
    area = cv2.contourArea(corners)
    img_area = image_shape[0] * image_shape[1]
    area_ratio = area / img_area
    
    if area_ratio < min_area_ratio:
        return False, f"Detected area too small: {area_ratio:.2%}"
    
    if area_ratio > 0.98:
        return False, "Detected area too large, likely edge of image, not paper"
    
    # Check if corners are roughly in expected positions
    # (corners should form a reasonable quadrilateral, not a thin line)
    x_coords = corners[:, 0]
    y_coords = corners[:, 1]
    
    x_range = np.ptp(x_coords)  # Peak-to-peak (max - min)
    y_range = np.ptp(y_coords)
    
    if x_range < image_shape[1] * 0.3 or y_range < image_shape[0] * 0.3:
        return False, "Detected region too narrow or short"
    
    return True, "Valid"


def detect_paper_with_fallback(
    image: np.ndarray,
    strict: bool = False
) -> Optional[np.ndarray]:
    """
    Detect paper with fallback strategies.
    
    Args:
        image: Input image
        strict: If True, raise exception on failure. If False, return None.
        
    Returns:
        Paper corners or None (if strict=False and detection fails)
        
    Raises:
        PaperDetectionError: If strict=True and detection fails
    """
    try:
        corners = detect_paper_boundary(image)
        
        # Validate
        is_valid, reason = validate_paper_detection(corners, image.shape[:2])
        
        if not is_valid:
            logger.warning(f"Paper validation failed: {reason}")
            if strict:
                raise PaperDetectionError(f"Validation failed: {reason}")
            return None
        
        return corners
        
    except PaperDetectionError as e:
        logger.error(f"Paper detection failed: {e}")
        
        if strict:
            raise
        
        # Fallback: assume entire image is the paper
        h, w = image.shape[:2]
        logger.warning("Using entire image as paper boundary (fallback)")
        
        return np.array([
            [0, 0],
            [w - 1, 0],
            [w - 1, h - 1],
            [0, h - 1]
        ], dtype=np.float32)
