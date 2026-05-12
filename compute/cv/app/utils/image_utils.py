"""
Image utility functions for OpenCV operations.
Provides geometric helpers, coordinate transformations, and image manipulation.
"""
import cv2
import numpy as np
from typing import Tuple, List, Optional
from loguru import logger


def resize_with_aspect_ratio(
    image: np.ndarray,
    target_width: Optional[int] = None,
    target_height: Optional[int] = None,
    max_dimension: Optional[int] = None
) -> Tuple[np.ndarray, float]:
    """
    Resize image while maintaining aspect ratio.
    
    Args:
        image: Input image
        target_width: Desired width (height calculated automatically)
        target_height: Desired height (width calculated automatically)
        max_dimension: Maximum dimension (scales to fit)
        
    Returns:
        (resized_image, scale_factor)
    """
    h, w = image.shape[:2]
    
    if max_dimension:
        if max(h, w) > max_dimension:
            scale = max_dimension / max(h, w)
            new_w = int(w * scale)
            new_h = int(h * scale)
        else:
            return image, 1.0
    elif target_width:
        scale = target_width / w
        new_w = target_width
        new_h = int(h * scale)
    elif target_height:
        scale = target_height / h
        new_h = target_height
        new_w = int(w * scale)
    else:
        return image, 1.0
    
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return resized, scale


def calculate_blur_score(image: np.ndarray) -> float:
    """
    Calculate image blur using Laplacian variance.
    
    Higher score = sharper image.
    Typical thresholds:
    - < 100: Very blurry (reject)
    - 100-300: Acceptable
    - > 300: Sharp
    
    Args:
        image: Grayscale image
        
    Returns:
        Blur score (Laplacian variance)
    """
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    return float(laplacian_var)


def calculate_brightness_stats(image: np.ndarray) -> Tuple[float, float]:
    """
    Calculate brightness mean and standard deviation.
    
    Args:
        image: Grayscale image
        
    Returns:
        (mean, std_dev) in range [0, 255]
    """
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    mean = float(np.mean(gray))
    std = float(np.std(gray))
    
    return mean, std


def calculate_skew_angle(image: np.ndarray) -> float:
    """
    Estimate image skew angle using projection profile method.
    
    Args:
        image: Binary or grayscale image
        
    Returns:
        Skew angle in degrees (negative = clockwise, positive = counter-clockwise)
    """
    # Convert to binary
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Detect edges
    edges = cv2.Canny(binary, 50, 50, apertureSize=3)
    
    # Hough line detection
    lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=100)
    
    if lines is None or len(lines) == 0:
        return 0.0
    
    # Calculate average angle
    angles = []
    for line in lines:
        rho, theta = line[0]
        angle = np.degrees(theta) - 90
        
        # Filter to near-horizontal lines
        if abs(angle) < 45:
            angles.append(angle)
    
    if not angles:
        return 0.0
    
    return float(np.median(angles))


def create_circular_mask(
    shape: Tuple[int, int],
    center: Tuple[int, int],
    radius: int
) -> np.ndarray:
    """
    Create a circular binary mask.
    
    Args:
        shape: (height, width) of output mask
        center: (x, y) center coordinates
        radius: Radius in pixels
        
    Returns:
        Binary mask (255 inside circle, 0 outside)
    """
    mask = np.zeros(shape, dtype=np.uint8)
    cv2.circle(mask, center, radius, 255, -1)
    return mask


def order_points(pts: np.ndarray) -> np.ndarray:
    """
    Order 4 corner points in consistent order: top-left, top-right, bottom-right, bottom-left.
    
    Args:
        pts: Array of 4 (x, y) points (shape: 4x2)
        
    Returns:
        Ordered points in shape (4, 2)
    """
    # Initialize ordered points
    rect = np.zeros((4, 2), dtype=np.float32)
    
    # Sum and difference for finding corners
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    
    # Top-left has smallest sum
    rect[0] = pts[np.argmin(s)]
    
    # Bottom-right has largest sum
    rect[2] = pts[np.argmax(s)]
    
    # Top-right has smallest difference
    rect[1] = pts[np.argmin(diff)]
    
    # Bottom-left has largest difference
    rect[3] = pts[np.argmax(diff)]
    
    return rect


def four_point_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
    """
    Apply perspective transformation using 4 corner points.
    
    Args:
        image: Input image
        pts: 4 corner points (unordered)
        
    Returns:
        Warped image with corrected perspective
    """
    # Order points
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    
    # Calculate width of new image
    width_a = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    width_b = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    max_width = max(int(width_a), int(width_b))
    
    # Calculate height of new image
    height_a = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    height_b = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    max_height = max(int(height_a), int(height_b))
    
    # Destination points
    dst = np.array([
        [0, 0],
        [max_width - 1, 0],
        [max_width - 1, max_height - 1],
        [0, max_height - 1]
    ], dtype=np.float32)
    
    # Compute perspective transform matrix
    M = cv2.getPerspectiveTransform(rect, dst)
    
    # Warp image
    warped = cv2.warpPerspective(image, M, (max_width, max_height))
    
    return warped


def safe_crop(image: np.ndarray, x: int, y: int, w: int, h: int) -> Optional[np.ndarray]:
    """
    Safely crop image region with bounds checking.
    
    Args:
        image: Input image
        x, y: Top-left coordinates
        w, h: Width and height
        
    Returns:
        Cropped region or None if out of bounds
    """
    img_h, img_w = image.shape[:2]
    
    # Clamp to image boundaries
    x1 = max(0, x)
    y1 = max(0, y)
    x2 = min(img_w, x + w)
    y2 = min(img_h, y + h)
    
    # Check if region is valid
    if x2 <= x1 or y2 <= y1:
        return None
    
    return image[y1:y2, x1:x2]


def draw_points(
    image: np.ndarray,
    points: List[Tuple[int, int]],
    color: Tuple[int, int, int] = (0, 255, 0),
    radius: int = 5
) -> np.ndarray:
    """
    Draw points on image (for visualization).
    
    Args:
        image: Input image (will be copied)
        points: List of (x, y) coordinates
        color: BGR color
        radius: Point radius
        
    Returns:
        Image with points drawn
    """
    output = image.copy()
    for i, (x, y) in enumerate(points):
        cv2.circle(output, (int(x), int(y)), radius, color, -1)
        cv2.putText(
            output, 
            str(i + 1), 
            (int(x) + 10, int(y) + 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            1
        )
    return output


def rotate_image(image: np.ndarray, angle: float) -> np.ndarray:
    """
    Rotate image by given angle (counter-clockwise).
    
    Args:
        image: Input image
        angle: Rotation angle in degrees
        
    Returns:
        Rotated image
    """
    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    
    # Get rotation matrix
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    
    # Calculate new image size
    cos = np.abs(M[0, 0])
    sin = np.abs(M[0, 1])
    new_w = int((h * sin) + (w * cos))
    new_h = int((h * cos) + (w * sin))
    
    # Adjust translation
    M[0, 2] += (new_w / 2) - center[0]
    M[1, 2] += (new_h / 2) - center[1]
    
    # Rotate
    rotated = cv2.warpAffine(image, M, (new_w, new_h), flags=cv2.INTER_LINEAR)
    
    return rotated
