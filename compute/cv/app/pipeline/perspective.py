"""
Perspective correction module.
Warps detected paper to canonical rectangular form.
"""
import cv2
import numpy as np
from typing import Tuple
from loguru import logger

from app.utils.image_utils import four_point_transform, order_points


class PerspectiveCorrectionError(Exception):
    """Raised when perspective correction fails."""
    pass


def correct_perspective(
    image: np.ndarray,
    corners: np.ndarray,
    target_size: Tuple[int, int]
) -> np.ndarray:
    """
    Apply perspective transformation to warp paper to canonical rectangle.
    
    Args:
        image: Input image
        corners: 4 corner points (any order)
        target_size: (width, height) of output image in pixels
        
    Returns:
        Warped image with corrected perspective
        
    Raises:
        PerspectiveCorrectionError: If transformation fails
    """
    if corners.shape[0] != 4:
        raise PerspectiveCorrectionError(
            f"Expected 4 corners, got {corners.shape[0]}"
        )
    
    target_width, target_height = target_size
    
    logger.debug(
        f"Correcting perspective: {image.shape} -> {target_width}x{target_height}"
    )
    
    # Order corners consistently (TL, TR, BR, BL)
    ordered_corners = order_points(corners)
    
    # Define destination points (canonical rectangle)
    dst_points = np.array([
        [0, 0],  # Top-left
        [target_width - 1, 0],  # Top-right
        [target_width - 1, target_height - 1],  # Bottom-right
        [0, target_height - 1]  # Bottom-left
    ], dtype=np.float32)
    
    # Compute perspective transform matrix
    try:
        M = cv2.getPerspectiveTransform(ordered_corners, dst_points)
    except cv2.error as e:
        raise PerspectiveCorrectionError(f"Failed to compute transform matrix: {e}")
    
    # Warp image
    try:
        warped = cv2.warpPerspective(
            image,
            M,
            (target_width, target_height),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(255, 255, 255)  # White background
        )
    except cv2.error as e:
        raise PerspectiveCorrectionError(f"Failed to warp image: {e}")
    
    logger.success(f"Perspective corrected: {warped.shape}")
    
    return warped


def calculate_perspective_quality(
    corners: np.ndarray,
    image_shape: Tuple[int, int]
) -> float:
    """
    Calculate quality score for perspective (0.0 = bad, 1.0 = perfect).
    
    Perfect perspective = corners form a rectangle with aspect ratio close to A4.
    
    Args:
        corners: 4 corner points
        image_shape: (height, width) of image
        
    Returns:
        Quality score (0.0 - 1.0)
    """
    if corners.shape[0] != 4:
        return 0.0
    
    ordered = order_points(corners)
    tl, tr, br, bl = ordered
    
    # Calculate widths
    top_width = np.linalg.norm(tr - tl)
    bottom_width = np.linalg.norm(br - bl)
    
    # Calculate heights
    left_height = np.linalg.norm(bl - tl)
    right_height = np.linalg.norm(br - tr)
    
    # Check if sides are roughly equal (rectangular)
    width_diff = abs(top_width - bottom_width) / max(top_width, bottom_width)
    height_diff = abs(left_height - right_height) / max(left_height, right_height)
    
    # Calculate aspect ratio
    avg_width = (top_width + bottom_width) / 2
    avg_height = (left_height + right_height) / 2
    aspect_ratio = avg_width / avg_height if avg_height > 0 else 0
    
    # A4 aspect ratio is approximately 0.707 (width/height)
    # But we accept a wide range since photos can be in portrait or landscape
    expected_aspect = 0.707  # A4 portrait
    aspect_score = 1.0 - min(abs(aspect_ratio - expected_aspect), 1.0)
    
    # Combine scores
    rectangularity = 1.0 - (width_diff + height_diff) / 2
    
    quality = (rectangularity * 0.7) + (aspect_score * 0.3)
    
    return float(np.clip(quality, 0.0, 1.0))


def estimate_deskew_angle(corners: np.ndarray) -> float:
    """
    Estimate how much the paper is skewed (rotated).
    
    Args:
        corners: 4 corner points
        
    Returns:
        Skew angle in degrees
    """
    ordered = order_points(corners)
    tl, tr, br, bl = ordered
    
    # Calculate angle of top edge
    dx = tr[0] - tl[0]
    dy = tr[1] - tl[1]
    angle = np.degrees(np.arctan2(dy, dx))
    
    return float(angle)


def validate_perspective_correction(
    warped: np.ndarray,
    expected_size: Tuple[int, int],
    tolerance_px: int = 10
) -> Tuple[bool, str]:
    """
    Validate that perspective correction produced expected output.
    
    Args:
        warped: Warped image
        expected_size: Expected (width, height)
        tolerance_px: Size tolerance in pixels
        
    Returns:
        (is_valid, reason)
    """
    h, w = warped.shape[:2]
    expected_w, expected_h = expected_size
    
    # Check dimensions
    if abs(w - expected_w) > tolerance_px or abs(h - expected_h) > tolerance_px:
        return False, f"Size mismatch: got {w}x{h}, expected {expected_w}x{expected_h}"
    
    # Check if image is mostly black (failed warp)
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY) if len(warped.shape) == 3 else warped
    mean_brightness = np.mean(gray)
    
    if mean_brightness < 50:
        return False, f"Warped image too dark (mean={mean_brightness:.1f})"
    
    # Check if image is mostly white (empty warp)
    if mean_brightness > 240:
        return False, f"Warped image too bright (mean={mean_brightness:.1f})"
    
    return True, "Valid"
