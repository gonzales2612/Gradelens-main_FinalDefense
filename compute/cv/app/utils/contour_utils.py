"""
Contour utility functions for shape detection and analysis.
"""
import cv2
import numpy as np
from typing import List, Tuple, Optional
from loguru import logger


def approximate_contour(
    contour: np.ndarray,
    epsilon_factor: float = 0.02
) -> np.ndarray:
    """
    Approximate contour to simpler polygon.
    
    Args:
        contour: Input contour
        epsilon_factor: Approximation accuracy (smaller = more points)
        
    Returns:
        Approximated contour
    """
    perimeter = cv2.arcLength(contour, True)
    epsilon = epsilon_factor * perimeter
    approx = cv2.approxPolyDP(contour, epsilon, True)
    return approx


def find_largest_contour(contours: List[np.ndarray]) -> Optional[np.ndarray]:
    """
    Find the contour with largest area.
    
    Args:
        contours: List of contours
        
    Returns:
        Largest contour or None if list is empty
    """
    if not contours:
        return None
    
    return max(contours, key=cv2.contourArea)


def filter_contours_by_area(
    contours: List[np.ndarray],
    min_area: float = 0,
    max_area: float = float('inf')
) -> List[np.ndarray]:
    """
    Filter contours by area range.
    
    Args:
        contours: List of contours
        min_area: Minimum area threshold
        max_area: Maximum area threshold
        
    Returns:
        Filtered contours
    """
    return [
        c for c in contours
        if min_area <= cv2.contourArea(c) <= max_area
    ]


def is_rectangle(contour: np.ndarray, tolerance: float = 0.05) -> bool:
    """
    Check if contour is approximately rectangular.
    
    Args:
        contour: Input contour
        tolerance: Aspect ratio tolerance (0.0 - 1.0)
        
    Returns:
        True if contour is rectangular
    """
    approx = approximate_contour(contour, epsilon_factor=0.02)
    
    # Rectangle should have 4 vertices
    if len(approx) != 4:
        return False
    
    # Check if angles are approximately 90 degrees
    x, y, w, h = cv2.boundingRect(approx)
    aspect_ratio = float(w) / h if h > 0 else 0
    
    # Should be somewhat rectangular (not too elongated)
    return 0.1 < aspect_ratio < 10.0


def find_quadrilateral(contours: List[np.ndarray]) -> Optional[np.ndarray]:
    """
    Find the largest quadrilateral (4-sided polygon) from contours.
    
    Useful for paper detection.
    
    Args:
        contours: List of contours
        
    Returns:
        Quadrilateral contour (4 points) or None
    """
    # Sort by area (largest first)
    sorted_contours = sorted(contours, key=cv2.contourArea, reverse=True)
    
    for contour in sorted_contours[:10]:  # Check top 10 largest
        # Approximate to polygon
        approx = approximate_contour(contour, epsilon_factor=0.02)
        
        # Check if it's a quadrilateral
        if len(approx) == 4:
            # Additional validation: should be convex
            if cv2.isContourConvex(approx):
                return approx.reshape(4, 2)
    
    return None


def get_contour_center(contour: np.ndarray) -> Tuple[int, int]:
    """
    Calculate centroid of contour.
    
    Args:
        contour: Input contour
        
    Returns:
        (x, y) center coordinates
    """
    M = cv2.moments(contour)
    
    if M["m00"] == 0:
        # Fallback to bounding box center
        x, y, w, h = cv2.boundingRect(contour)
        return (x + w // 2, y + h // 2)
    
    cx = int(M["m10"] / M["m00"])
    cy = int(M["m01"] / M["m00"])
    
    return (cx, cy)


def find_circles(
    image: np.ndarray,
    min_radius: int = 5,
    max_radius: int = 50,
    param1: int = 50,
    param2: int = 30
) -> List[Tuple[int, int, int]]:
    """
    Detect circles using Hough Circle Transform.
    
    Useful for finding registration marks.
    
    Args:
        image: Grayscale image
        min_radius: Minimum circle radius
        max_radius: Maximum circle radius
        param1: Canny edge threshold
        param2: Accumulator threshold (lower = more circles)
        
    Returns:
        List of (x, y, radius) tuples
    """
    circles = cv2.HoughCircles(
        image,
        cv2.HOUGH_GRADIENT,
        dp=1,
        minDist=min_radius * 2,
        param1=param1,
        param2=param2,
        minRadius=min_radius,
        maxRadius=max_radius
    )
    
    if circles is None:
        return []
    
    # Convert to integer coordinates
    circles = np.round(circles[0, :]).astype(int)
    
    return [(int(x), int(y), int(r)) for x, y, r in circles]


def calculate_circularity(contour: np.ndarray) -> float:
    """
    Calculate how circular a contour is.
    
    Circularity = 4π * area / perimeter²
    
    Perfect circle = 1.0
    More irregular shapes < 1.0
    
    Args:
        contour: Input contour
        
    Returns:
        Circularity score (0.0 - 1.0)
    """
    area = cv2.contourArea(contour)
    perimeter = cv2.arcLength(contour, True)
    
    if perimeter == 0:
        return 0.0
    
    circularity = (4 * np.pi * area) / (perimeter ** 2)
    
    return min(circularity, 1.0)


def match_template_contours(
    detected_contours: List[np.ndarray],
    expected_positions: List[Tuple[int, int]],
    max_distance: float = 50
) -> List[Tuple[int, Optional[np.ndarray]]]:
    """
    Match detected contours to expected positions.
    
    Args:
        detected_contours: List of detected contours
        expected_positions: List of expected (x, y) positions
        max_distance: Maximum matching distance
        
    Returns:
        List of (position_index, matched_contour or None)
    """
    matches = []
    
    for i, expected_pos in enumerate(expected_positions):
        best_match = None
        best_distance = max_distance
        
        for contour in detected_contours:
            center = get_contour_center(contour)
            distance = np.sqrt(
                (center[0] - expected_pos[0]) ** 2 +
                (center[1] - expected_pos[1]) ** 2
            )
            
            if distance < best_distance:
                best_distance = distance
                best_match = contour
        
        matches.append((i, best_match))
    
    return matches


def get_bounding_box(contour: np.ndarray) -> Tuple[int, int, int, int]:
    """
    Get axis-aligned bounding box of contour.
    
    Args:
        contour: Input contour
        
    Returns:
        (x, y, width, height)
    """
    return cv2.boundingRect(contour)


def get_rotated_bounding_box(contour: np.ndarray) -> Tuple[Tuple[float, float], Tuple[float, float], float]:
    """
    Get minimum area rotated bounding box.
    
    Args:
        contour: Input contour
        
    Returns:
        ((center_x, center_y), (width, height), angle)
    """
    return cv2.minAreaRect(contour)
