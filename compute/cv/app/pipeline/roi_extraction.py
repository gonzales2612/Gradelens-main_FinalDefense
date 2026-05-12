"""
ROI (Region of Interest) extraction module.
Extracts bubble regions from image using template coordinates, optionally
adjusted by fiducial marker alignment.
"""
import cv2
import numpy as np
from typing import Dict, Tuple, Optional, Sequence, Any
from loguru import logger

from app.schemas.template import Template, Question
from app.utils.image_utils import safe_crop, create_circular_mask


class ROIExtractionError(Exception):
    """Raised when ROI extraction fails."""
    pass


def _point_from_any(point: Any) -> Tuple[float, float]:
    """
    Extract (x, y) from a point-like object.

    Supports:
    - dict: {"x": ..., "y": ...}
    - object with .x and .y
    - tuple/list: (x, y)
    """
    if isinstance(point, dict):
        return float(point["x"]), float(point["y"])

    if hasattr(point, "x") and hasattr(point, "y"):
        return float(point.x), float(point.y)

    if isinstance(point, (tuple, list)) and len(point) >= 2:
        return float(point[0]), float(point[1])

    raise ValueError(f"Unsupported point format: {point}")


def _order_four_points(points: np.ndarray) -> np.ndarray:
    """
    Order 4 points as:
    top-left, top-right, bottom-left, bottom-right

    Args:
        points: shape (4, 2)

    Returns:
        Ordered points shape (4, 2)
    """
    if points.shape != (4, 2):
        raise ValueError(f"Expected (4,2) points, got {points.shape}")

    # Sort by y first
    y_sorted = points[np.argsort(points[:, 1])]

    top_two = y_sorted[:2]
    bottom_two = y_sorted[2:]

    top_two = top_two[np.argsort(top_two[:, 0])]
    bottom_two = bottom_two[np.argsort(bottom_two[:, 0])]

    tl, tr = top_two
    bl, br = bottom_two

    return np.array([tl, tr, bl, br], dtype=np.float32)


def _get_template_registration_points(template: Template) -> np.ndarray:
    """
    Read template registration/fiducial points and return them as ordered 4x2 array.
    """
    if not hasattr(template, "registration_marks") or not template.registration_marks:
        raise ROIExtractionError("Template has no registration_marks")

    if len(template.registration_marks) != 4:
        raise ROIExtractionError(
            f"Expected 4 template registration marks, got {len(template.registration_marks)}"
        )

    pts = []
    for mark in template.registration_marks:
        if hasattr(mark, "position"):
            x, y = _point_from_any(mark.position)
        else:
            x, y = _point_from_any(mark)
        pts.append((x, y))

    pts = np.array(pts, dtype=np.float32)
    return _order_four_points(pts)


def _get_detected_registration_points(
    detected_registration_marks: Sequence[Any]
) -> np.ndarray:
    """
    Read detected registration/fiducial points and return them as ordered 4x2 array.
    """
    if len(detected_registration_marks) != 4:
        raise ROIExtractionError(
            f"Expected 4 detected registration marks, got {len(detected_registration_marks)}"
        )

    pts = np.array([_point_from_any(p) for p in detected_registration_marks], dtype=np.float32)
    return _order_four_points(pts)


def compute_alignment_homography(
    template: Template,
    detected_registration_marks: Sequence[Any]
) -> np.ndarray:
    """
    Compute homography mapping template coordinates -> image coordinates
    using the 4 registration/fiducial markers.
    """
    template_pts = _get_template_registration_points(template)
    detected_pts = _get_detected_registration_points(detected_registration_marks)

    H, mask = cv2.findHomography(template_pts, detected_pts, method=0)

    if H is None:
        raise ROIExtractionError("Failed to compute homography from fiducials")

    logger.debug(f"Computed homography from template fiducials to detected fiducials")
    return H


def transform_point(
    x: float,
    y: float,
    homography: Optional[np.ndarray] = None
) -> Tuple[int, int]:
    """
    Transform one point with homography. If homography is None,
    return original coordinates rounded to int.
    """
    if homography is None:
        return int(round(x)), int(round(y))

    pts = np.array([[[x, y]]], dtype=np.float32)
    transformed = cv2.perspectiveTransform(pts, homography)
    tx, ty = transformed[0, 0]
    return int(round(tx)), int(round(ty))


def extract_bubble_roi(
    image: np.ndarray,
    center_x: int,
    center_y: int,
    radius: int,
    padding: int = 10
) -> np.ndarray:
    """
    Extract circular bubble ROI from image.

    Args:
        image: Grayscale image
        center_x: Bubble center X coordinate
        center_y: Bubble center Y coordinate
        radius: Bubble radius
        padding: Extra padding around bubble

    Returns:
        Square ROI containing the bubble

    Raises:
        ROIExtractionError: If ROI cannot be extracted
    """
    size = (radius + padding) * 2
    x = center_x - radius - padding
    y = center_y - radius - padding

    roi = safe_crop(image, x, y, size, size)

    if roi is None or roi.size == 0:
        raise ROIExtractionError(
            f"Failed to extract ROI at ({center_x}, {center_y})"
        )

    return roi


def extract_question_bubbles(
    image: np.ndarray,
    question: Question,
    bubble_radius: int,
    padding: int = 5,
    bubble_y_adjust: int = 0,
    homography: Optional[np.ndarray] = None,
) -> Dict[str, np.ndarray]:
    """
    Extract all bubble ROIs for a single question.

    Args:
        image: Grayscale image
        question: Question definition from template
        bubble_radius: Bubble radius from template
        padding: Extra padding
        bubble_y_adjust: Y-axis adjustment from template
        homography: Optional homography mapping template -> image coordinates

    Returns:
        Dictionary mapping option letter to ROI image
    """
    bubbles = {}

    for option, position in question.options.items():
        try:
            base_x = position.x
            base_y = position.y + bubble_y_adjust

            cx, cy = transform_point(base_x, base_y, homography)

            roi = extract_bubble_roi(
                image,
                cx,
                cy,
                bubble_radius,
                padding
            )
            bubbles[option] = roi

        except ROIExtractionError as e:
            logger.warning(f"Q{question.question_id} option {option}: {e}")
            size = (bubble_radius + padding) * 2
            bubbles[option] = np.full((size, size), 255, dtype=np.uint8)

    return bubbles


def extract_all_bubbles(
    image: np.ndarray,
    template: Template,
    detected_registration_marks: Optional[Sequence[Any]] = None,
    homography: Optional[np.ndarray] = None,
) -> Dict[int, Dict[str, np.ndarray]]:
    """
    Extract all bubble ROIs from image.

    Args:
        image: Grayscale image
        template: Template defining bubble positions
        detected_registration_marks: Optional detected fiducials in the image.
            If provided and homography is None, a homography will be computed.
        homography: Optional precomputed homography mapping template -> image coordinates

    Returns:
        Nested dictionary: {question_id: {option: roi_image}}
    """
    all_bubbles = {}
    bubble_radius = template.bubble_config.radius

    logger.debug(f"Extracting bubbles for {len(template.questions)} questions")

    extraction_padding = max(12, int(bubble_radius * 0.75))

    computed_h = homography
    if computed_h is None and detected_registration_marks is not None:
        try:
            computed_h = compute_alignment_homography(
                template,
                detected_registration_marks
            )
        except Exception as e:
            logger.warning(f"Fiducial-based homography failed, falling back to template coordinates: {e}")
            computed_h = None

    y_adj = template.bubble_y_adjust

    for question in template.questions:
        bubbles = extract_question_bubbles(
            image,
            question,
            bubble_radius,
            padding=extraction_padding,
            bubble_y_adjust=y_adj,
            homography=computed_h,
        )
        all_bubbles[question.question_id] = bubbles

    logger.success(f"Extracted bubbles for {len(all_bubbles)} questions")
    return all_bubbles


def validate_roi_quality(roi: np.ndarray, min_size: int = 10) -> Tuple[bool, str]:
    """
    Validate extracted ROI quality.

    Args:
        roi: Extracted ROI image
        min_size: Minimum acceptable size

    Returns:
        (is_valid, reason)
    """
    if roi is None or roi.size == 0:
        return False, "ROI is empty"

    h, w = roi.shape[:2]

    if h < min_size or w < min_size:
        return False, f"ROI too small: {w}x{h}"

    mean_val = np.mean(roi)
    if mean_val < 30:
        return False, f"ROI too dark (mean={mean_val:.1f})"

    if mean_val > 250:
        return False, f"ROI too bright/empty (mean={mean_val:.1f})"

    return True, "Valid"


def create_bubble_mask(
    roi_size: int,
    radius: int
) -> np.ndarray:
    """
    Create circular mask for bubble ROI.

    Args:
        roi_size: Size of ROI (square)
        radius: Bubble radius

    Returns:
        Binary mask (255 inside circle, 0 outside)
    """
    center = roi_size // 2
    mask = create_circular_mask(
        (roi_size, roi_size),
        (center, center),
        radius
    )
    return mask


def visualize_roi_extraction(
    image: np.ndarray,
    template: Template,
    detected_registration_marks: Optional[Sequence[Any]] = None,
    homography: Optional[np.ndarray] = None,
    highlight_color: Tuple[int, int, int] = (0, 255, 0)
) -> np.ndarray:
    """
    Create visualization of ROI extraction for debugging.

    Draws:
    - bubble locations in green
    - template fiducials in blue
    - detected fiducials in red
    """
    if len(image.shape) == 2:
        output = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    else:
        output = image.copy()

    computed_h = homography
    if computed_h is None and detected_registration_marks is not None:
        try:
            computed_h = compute_alignment_homography(
                template,
                detected_registration_marks
            )
        except Exception as e:
            logger.warning(f"Visualization homography failed, using template coordinates: {e}")
            computed_h = None

    bubble_radius = template.bubble_config.radius
    y_adj = template.bubble_y_adjust

    # Draw transformed bubble positions
    for question in template.questions:
        for option, position in question.options.items():
            base_x = position.x
            base_y = position.y + y_adj
            ax, ay = transform_point(base_x, base_y, computed_h)

            cv2.circle(
                output,
                (ax, ay),
                bubble_radius,
                highlight_color,
                2
            )

            cv2.putText(
                output,
                f"Q{question.question_id}{option}",
                (ax - 15, ay - bubble_radius - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.4,
                highlight_color,
                1
            )

    # Draw template fiducials in blue
    try:
        template_pts = _get_template_registration_points(template)
        for idx, (x, y) in enumerate(template_pts):
            tx, ty = transform_point(x, y, computed_h)

            cv2.rectangle(
                output,
                (tx - 12, ty - 12),
                (tx + 12, ty + 12),
                (255, 0, 0),
                2
            )
            cv2.putText(
                output,
                f"T{idx+1}",
                (tx + 10, ty - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 0, 0),
                1
            )
    except Exception as e:
        logger.warning(f"Could not draw template fiducials: {e}")

    # Draw detected fiducials in red
    if detected_registration_marks is not None:
        try:
            for idx, pt in enumerate(detected_registration_marks):
                x, y = _point_from_any(pt)
                x = int(round(x))
                y = int(round(y))

                # outer circle
                cv2.circle(output, (x, y), 14, (0, 0, 255), 2)
                # filled center dot
                cv2.circle(output, (x, y), 4, (0, 0, 255), -1)
                # crosshair
                cv2.line(output, (x - 18, y), (x + 18, y), (0, 0, 255), 1)
                cv2.line(output, (x, y - 18), (x, y + 18), (0, 0, 255), 1)

                cv2.putText(
                    output,
                    f"F{idx+1}",
                    (x + 10, y - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.55,
                    (0, 0, 255),
                    2
                )
        except Exception as e:
            logger.warning(f"Could not draw detected registration marks: {e}")

    return output