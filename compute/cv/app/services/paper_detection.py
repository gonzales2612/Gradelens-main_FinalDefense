"""
Paper detection module using fiducial markers.
Detects paper boundaries by locating fiducial markers at corners.
"""
import cv2
import numpy as np
from typing import Tuple, Optional, List, Dict
from loguru import logger

from app.utils.contour_utils import find_largest_contour
from app.utils.image_utils import resize_with_aspect_ratio


class PaperDetectionError(Exception):
    """Raised when paper cannot be detected in image."""
    pass


def detect_fiducials(
    image: np.ndarray,
    fiducial_positions: List[Dict],
    detection_radius: int = 50
) -> Dict[str, Optional[Tuple[float, float]]]:
    """
    Detect fiducial markers in image using template matching.
    
    Strategy:
    1. Convert to grayscale
    2. For each expected fiducial position, search in a local region
    3. Use edge detection to find the dark square
    4. Return detected positions
    
    Args:
        image: Input image (BGR or grayscale)
        fiducial_positions: List of dicts with 'id' and 'position' (x, y)
        detection_radius: Search radius around expected position (pixels)
        
    Returns:
        Dict mapping fiducial id -> detected (x, y) or None
    """
    original_shape = image.shape
    
    # Resize for faster processing if needed
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
    
    logger.debug(f"Fiducial detection on {gray.shape} image (scale={scale:.2f})")
    
    # Apply Gaussian blur
    blur_k = max(3, int(max(gray.shape[:2]) * 0.005) | 1)
    blurred = cv2.GaussianBlur(gray, (blur_k, blur_k), 0)
    
    # Edge detection
    edges = cv2.Canny(blurred, 30, 100)
    
    detected_fiducials = {}
    
    for fid in fiducial_positions:
        fid_id = fid['id']
        expected_x = int(fid['position']['x'] * scale)
        expected_y = int(fid['position']['y'] * scale)
        
        # Define search region around expected position
        search_r = int(detection_radius * scale)
        x_min = max(0, expected_x - search_r)
        x_max = min(gray.shape[1], expected_x + search_r)
        y_min = max(0, expected_y - search_r)
        y_max = min(gray.shape[0], expected_y + search_r)
        
        # Extract region of interest
        roi = edges[y_min:y_max, x_min:x_max]
        
        if roi.size == 0:
            logger.warning(f"Fiducial {fid_id}: search region out of bounds")
            detected_fiducials[fid_id] = None
            continue
        
        # Find contours in ROI
        contours, _ = cv2.findContours(
            roi,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        if not contours:
            logger.warning(f"Fiducial {fid_id}: no contours found in search region")
            detected_fiducials[fid_id] = None
            continue
        
        # Find largest contour (should be the fiducial square)
        largest_contour = find_largest_contour(contours)
        
        if largest_contour is None:
            logger.warning(f"Fiducial {fid_id}: could not find largest contour")
            detected_fiducials[fid_id] = None
            continue
        
        # Get centroid of contour
        M = cv2.moments(largest_contour)
        if M["m00"] == 0:
            logger.warning(f"Fiducial {fid_id}: contour has zero area")
            detected_fiducials[fid_id] = None
            continue
        
        cx = M["m10"] / M["m00"] + x_min  # Add offset from ROI
        cy = M["m01"] / M["m00"] + y_min
        
        # Validate detection is close to expected position
        distance = np.sqrt((cx - expected_x)**2 + (cy - expected_y)**2)
        
        if distance > search_r:
            logger.warning(
                f"Fiducial {fid_id}: detected too far from expected "
                f"(distance={distance:.1f}px, expected_pos=({expected_x},{expected_y}))"
            )
            detected_fiducials[fid_id] = None
            continue
        
        # Scale back to original image coordinates
        if scale != 1.0:
            cx = cx / scale
            cy = cy / scale
        
        detected_fiducials[fid_id] = (cx, cy)
        logger.debug(f"Fiducial {fid_id}: detected at ({cx:.1f}, {cy:.1f})")
    
    return detected_fiducials


def detect_paper_from_fiducials(
    image: np.ndarray,
    fiducial_positions: List[Dict],
    detection_radius: int = 50
) -> Tuple[np.ndarray, Dict]:
    """
    Detect paper boundary using fiducial markers.
    
    Args:
        image: Input image (BGR or grayscale)
        fiducial_positions: List of fiducials with 'id' and 'position'
        detection_radius: Search radius for fiducial detection
        
    Returns:
        (paper_corners, detection_results) where:
        - paper_corners: 4 corner points (TL, TR, BR, BL)
        - detection_results: dict with detection status for each fiducial
        
    Raises:
        PaperDetectionError: If not enough fiducials detected
    """
    # Detect fiducials
    detected = detect_fiducials(image, fiducial_positions, detection_radius)
    
    logger.debug(f"Fiducial detection results: {detected}")
    
    # Count successful detections
    found_fiducials = {k: v for k, v in detected.items() if v is not None}
    
    if len(found_fiducials) < 4:
        raise PaperDetectionError(
            f"Only {len(found_fiducials)}/4 fiducials detected. "
            f"Cannot determine paper boundary."
        )
    
    # Extract coordinates in expected order: TL, TR, BR, BL
    expected_order = ['top_left', 'top_right', 'bottom_right', 'bottom_left']
    paper_corners = []
    
    for pos_name in expected_order:
        if pos_name in detected and detected[pos_name] is not None:
            x, y = detected[pos_name]
            paper_corners.append([x, y])
        else:
            raise PaperDetectionError(
                f"Critical fiducial '{pos_name}' not detected"
            )
    
    paper_corners = np.array(paper_corners, dtype=np.float32)
    
    # Validate corners
    is_valid, reason = validate_paper_from_fiducials(paper_corners, image.shape[:2])
    
    if not is_valid:
        logger.warning(f"Paper validation failed: {reason}")
        raise PaperDetectionError(f"Validation failed: {reason}")
    
    logger.success(
        f"Paper detected from fiducials at corners: "
        f"TL={paper_corners[0]}, TR={paper_corners[1]}, "
        f"BR={paper_corners[2]}, BL={paper_corners[3]}"
    )
    
    return paper_corners, detected


def validate_paper_from_fiducials(
    corners: np.ndarray,
    image_shape: Tuple[int, int],
    min_width_ratio: float = 0.5,
    min_height_ratio: float = 0.5
) -> Tuple[bool, str]:
    """
    Validate paper corners detected from fiducials.
    
    Args:
        corners: 4 corner points (TL, TR, BR, BL)
        image_shape: (height, width) of image
        min_width_ratio: Minimum paper width as ratio of image width
        min_height_ratio: Minimum paper height as ratio of image height
        
    Returns:
        (is_valid, reason)
    """
    if corners.shape[0] != 4:
        return False, f"Expected 4 corners, got {corners.shape[0]}"
    
    # Extract corners
    tl, tr, br, bl = corners
    
    # Check if points form a reasonable rectangle
    # Width: distance between left and right edges
    left_edge_len = np.linalg.norm(bl - tl)
    right_edge_len = np.linalg.norm(br - tr)
    top_edge_len = np.linalg.norm(tr - tl)
    bottom_edge_len = np.linalg.norm(br - bl)
    
    avg_width = (top_edge_len + bottom_edge_len) / 2
    avg_height = (left_edge_len + right_edge_len) / 2
    
    # Validate minimum sizes
    img_height, img_width = image_shape
    if avg_width < img_width * min_width_ratio:
        return False, f"Paper width too narrow: {avg_width:.0f}px"
    
    if avg_height < img_height * min_height_ratio:
        return False, f"Paper height too short: {avg_height:.0f}px"
    
    # Check aspect ratio is reasonable (not too skewed)
    aspect_ratio = avg_width / avg_height if avg_height > 0 else 0
    if aspect_ratio < 0.5 or aspect_ratio > 2.0:
        return False, f"Paper aspect ratio unreasonable: {aspect_ratio:.2f}"
    
    # Check corners are within image bounds
    if np.any(corners < 0) or \
       np.any(corners[:, 0] >= img_width) or \
       np.any(corners[:, 1] >= img_height):
        return False, "Paper corners outside image bounds"
    
    return True, "Valid"


def detect_paper_with_fallback(
    image: np.ndarray,
    fiducial_positions: List[Dict],
    detection_radius: int = 50,
    strict: bool = False
) -> Tuple[Optional[np.ndarray], Dict]:
    """
    Detect paper from fiducials with fallback strategies.
    
    Args:
        image: Input image
        fiducial_positions: List of fiducial positions
        detection_radius: Search radius for detection
        strict: If True, raise exception on failure. If False, use fallback.
        
    Returns:
        (paper_corners or fallback, detection_results)
        
    Raises:
        PaperDetectionError: If strict=True and detection fails
    """
    try:
        corners, results = detect_paper_from_fiducials(
            image,
            fiducial_positions,
            detection_radius
        )
        return corners, results
        
    except PaperDetectionError as e:
        logger.error(f"Fiducial-based paper detection failed: {e}")
        
        if strict:
            raise
        
        # Fallback: use template fiducial positions as paper corners
        h, w = image.shape[:2]
        logger.warning("Using template fiducial positions as fallback")
        
        fallback_corners = np.array(
            [[fid['position']['x'], fid['position']['y']] for fid in fiducial_positions],
            dtype=np.float32
        )
        
        results = {fid['id']: None for fid in fiducial_positions}
        
        return fallback_corners, results
