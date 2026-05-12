"""
Template alignment module.
Fine-tunes perspective using fiducial marks after initial correction.
"""
import cv2
import numpy as np
from typing import List, Tuple, Optional
from loguru import logger

from app.schemas.template import Template, RegistrationMark
from app.utils.contour_utils import find_circles, get_contour_center
from app.utils.image_utils import order_points


class AlignmentError(Exception):
    """Raised when alignment fails."""
    pass


def _contour_is_compact_square_fiducial(contour: np.ndarray, mark_size: int) -> bool:
    """
    Reject elongated or hollow shapes that can be confused with square fiducials.
    Tuned for solid black corner squares.
    """
    area = cv2.contourArea(contour)
    if area < 120.0:
        return False

    x, y, w, h = cv2.boundingRect(contour)
    if w < 4 or h < 4:
        return False

    expected_area = float(mark_size * mark_size)
    if area < 0.35 * expected_area or area > 3.0 * expected_area:
        return False

    # Must be near-square
    ar = min(w, h) / max(w, h)
    if ar < 0.70:
        return False

    # Must fill most of bounding box
    extent = area / float(w * h)
    if extent < 0.60:
        return False

    hull = cv2.convexHull(contour)
    hull_area = cv2.contourArea(hull)
    if hull_area < 1.0:
        return False

    solidity = area / hull_area
    if solidity < 0.85:
        return False

    # Roughly 4-cornered
    peri = cv2.arcLength(contour, True)
    approx = cv2.approxPolyDP(contour, 0.04 * peri, True)
    if len(approx) < 4 or len(approx) > 6:
        return False

    return True


def _detect_fiducials_global(image: np.ndarray) -> List[Tuple[int, int]]:
    """
    Detect the 4 strongest square fiducials globally in the image.
    Returns points ordered as TL, TR, BR, BL.
    """
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()

    # Slight blur helps thresholding on camera images
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    _, binary = cv2.threshold(
        blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )

    kernel = np.ones((5, 5), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(
        binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    candidates: List[Tuple[float, Tuple[int, int]]] = []

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 500:
            continue

        x, y, w, h = cv2.boundingRect(contour)

        aspect = w / float(h)
        if aspect < 0.80 or aspect > 1.20:
            continue

        extent = area / float(w * h)
        if extent < 0.80:
            continue

        cx = x + w // 2
        cy = y + h // 2
        candidates.append((area, (cx, cy)))

    if len(candidates) < 4:
        return []

    # Keep 4 biggest likely fiducials
    candidates = sorted(candidates, key=lambda t: t[0], reverse=True)[:4]
    pts = np.array([pt for _, pt in candidates], dtype=np.float32)

    # Order TL, TR, BR, BL
    ordered = order_points(pts)
    return [(int(round(x)), int(round(y))) for x, y in ordered]


def _match_detected_points_to_expected(
    detected_pts: List[Tuple[int, int]],
    expected_marks: List[RegistrationMark]
) -> List[Tuple[int, int]]:
    """
    Match globally detected fiducials to template marks by nearest neighbor.
    """
    remaining = detected_pts[:]
    matched: List[Tuple[int, int]] = []

    for mark in expected_marks:
        ex, ey = mark.position.x, mark.position.y
        if not remaining:
            matched.append((ex, ey))
            continue

        best_idx = min(
            range(len(remaining)),
            key=lambda i: (remaining[i][0] - ex) ** 2 + (remaining[i][1] - ey) ** 2
        )
        matched.append(remaining.pop(best_idx))

    return matched


def _try_detect_registration_mark(
    image: np.ndarray,
    mark: RegistrationMark,
    adjusted_search_radius: int,
    adjusted_tolerance: float,
) -> Optional[Tuple[int, int]]:
    """
    Detect a single registration mark near its expected position.
    Kept as fallback logic if global fiducial detection is not enough.
    """
    expected_x = mark.position.x
    expected_y = mark.position.y
    mark_size = mark.size

    x1 = max(0, expected_x - adjusted_search_radius)
    y1 = max(0, expected_y - adjusted_search_radius)
    x2 = min(image.shape[1], expected_x + adjusted_search_radius)
    y2 = min(image.shape[0], expected_y + adjusted_search_radius)

    roi = image[y1:y2, x1:x2]
    if roi.size == 0:
        return None

    roi_center_x = min(adjusted_search_radius, expected_x)
    roi_center_y = min(adjusted_search_radius, expected_y)

    if mark.type == "circle":
        circles = find_circles(
            roi,
            min_radius=max(5, mark_size - 5),
            max_radius=mark_size + 5,
            param2=20,
        )
        if not circles:
            return None

        best_circle = min(
            circles,
            key=lambda c: np.sqrt((c[0] - roi_center_x) ** 2 + (c[1] - roi_center_y) ** 2),
        )
        detected_x = x1 + best_circle[0]
        detected_y = y1 + best_circle[1]
        distance = np.sqrt((detected_x - expected_x) ** 2 + (detected_y - expected_y) ** 2)
        max_distance = adjusted_search_radius * adjusted_tolerance
        if distance <= max_distance:
            return (int(round(detected_x)), int(round(detected_y)))
        return None

    if mark.type == "square":
        blurred = cv2.GaussianBlur(roi, (5, 5), 0)
        _, binary = cv2.threshold(
            blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )

        kernel = np.ones((3, 3), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)

        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None

        candidates: List[Tuple[float, np.ndarray]] = []
        for contour in contours:
            if not _contour_is_compact_square_fiducial(contour, mark_size):
                continue

            center = get_contour_center(contour)
            detected_x = x1 + float(center[0])
            detected_y = y1 + float(center[1])
            dist_to_expected = np.sqrt(
                (detected_x - expected_x) ** 2 + (detected_y - expected_y) ** 2
            )
            candidates.append((dist_to_expected, contour))

        if not candidates:
            return None

        best_contour = min(candidates, key=lambda t: t[0])[1]
        center = get_contour_center(best_contour)
        detected_x = x1 + center[0]
        detected_y = y1 + center[1]
        distance = np.sqrt((detected_x - expected_x) ** 2 + (detected_y - expected_y) ** 2)
        max_distance = adjusted_search_radius * adjusted_tolerance
        if distance <= max_distance:
            return (int(round(detected_x)), int(round(detected_y)))
        return None

    return None


def detect_registration_marks(
    image: np.ndarray,
    expected_marks: List[RegistrationMark],
    search_radius: Optional[int] = None,
    tolerance: float = 0.3,
    adaptive_search: bool = True
) -> List[Tuple[int, int]]:
    """
    Detect registration/fiducial marks in image.

    Strategy:
    1. Try global detection of 4 large square corner fiducials
    2. Match them to expected template marks
    3. If that fails, fall back to local per-mark search
    """
    if not expected_marks:
        return []

    # Best case for your sheet: 4 strong square fiducials near corners
    all_square = all(getattr(m, "type", None) == "square" for m in expected_marks)
    if len(expected_marks) == 4 and all_square:
        global_pts = _detect_fiducials_global(image)
        if len(global_pts) == 4:
            matched = _match_detected_points_to_expected(global_pts, expected_marks)
            logger.info(f"Global fiducial detection succeeded: {matched}")
            return matched
        logger.warning("Global fiducial detection failed, falling back to local search")

    detected_positions = []
    img_height, img_width = image.shape[:2]
    img_center_y = img_height / 2

    if search_radius is None:
        img_diagonal = np.sqrt(img_width**2 + img_height**2)
        search_radius = max(20, int(img_diagonal * 0.024))
        logger.debug(f"Auto search_radius={search_radius}px for {img_width}x{img_height} image")

    for mark in expected_marks:
        expected_x = mark.position.x
        expected_y = mark.position.y

        if adaptive_search:
            distance_from_center_y = abs(expected_y - img_center_y)
            radius_multiplier = 1.0 + (distance_from_center_y / img_center_y) * 1.0
            adjusted_search_radius = int(search_radius * radius_multiplier)
            adjusted_tolerance = tolerance * radius_multiplier

            logger.debug(
                f"Mark '{mark.id}' at y={expected_y}: "
                f"radius={adjusted_search_radius}px (x{radius_multiplier:.2f}), "
                f"tolerance={adjusted_tolerance:.2f}"
            )
        else:
            adjusted_search_radius = search_radius
            adjusted_tolerance = tolerance

        found = _try_detect_registration_mark(
            image, mark, adjusted_search_radius, adjusted_tolerance
        )
        if found is not None:
            detected_positions.append(found)
            logger.debug(f"Mark '{mark.id}' detected at ({found[0]}, {found[1]})")
        else:
            logger.warning(
                f"Registration mark '{mark.id}' not detected, using expected position"
            )
            detected_positions.append((expected_x, expected_y))

    return detected_positions


def calculate_alignment_transform(
    detected_marks: List[Tuple[int, int]],
    expected_marks: List[RegistrationMark],
    method: str = "affine"
) -> Optional[np.ndarray]:
    """
    Calculate transformation matrix to align detected marks to expected positions.
    """
    if len(detected_marks) < 3:
        logger.warning("Need at least 3 marks for alignment")
        return None

    src_points = np.array(detected_marks, dtype=np.float32)
    dst_points = np.array(
        [(m.position.x, m.position.y) for m in expected_marks],
        dtype=np.float32
    )

    if method == "affine":
        if len(detected_marks) >= 3:
            M = cv2.estimateAffinePartial2D(src_points, dst_points)[0]
            return M
    elif method == "similarity":
        if len(detected_marks) >= 2:
            M = cv2.estimateAffinePartial2D(
                src_points,
                dst_points,
                method=cv2.LMEDS
            )[0]
            return M

    return None


def apply_alignment(
    image: np.ndarray,
    transform_matrix: np.ndarray,
    output_size: Optional[Tuple[int, int]] = None
) -> np.ndarray:
    """
    Apply alignment transformation to image.
    """
    if output_size is None:
        output_size = (image.shape[1], image.shape[0])

    aligned = cv2.warpAffine(
        image,
        transform_matrix,
        output_size,
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(255, 255, 255)
    )

    return aligned


def warp_fiducials_to_canonical(
    image: np.ndarray,
    template: Template,
    search_radius_fraction: float = 0.085,
    tolerance: float = 0.95,
) -> Tuple[np.ndarray, bool]:
    """
    Apply a perspective warp so detected fiducial centers match template coordinates.

    Requires exactly four registration marks, all detected.
    """
    marks = template.registration_marks
    if len(marks) != 4:
        logger.debug(
            f"Fiducial homography skipped: need4 marks, template has {len(marks)}"
        )
        return image, False

    work = image
    if len(image.shape) == 3:
        work = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # First try global detection for your corner-square layout
    all_square = all(getattr(m, "type", None) == "square" for m in marks)
    if all_square:
        global_pts = _detect_fiducials_global(work)
        if len(global_pts) == 4:
            detected = _match_detected_points_to_expected(global_pts, marks)
        else:
            detected = []
    else:
        detected = []

    # Fall back to local search if needed
    if len(detected) != 4:
        img_height, img_width = work.shape[:2]
        img_center_y = img_height / 2
        img_diagonal = np.sqrt(img_width**2 + img_height**2)
        base_radius = max(48, int(img_diagonal * search_radius_fraction))

        detected = []
        for mark in marks:
            distance_from_center_y = abs(mark.position.y - img_center_y)
            radius_multiplier = 1.0 + (distance_from_center_y / img_center_y) * 1.0
            adjusted_radius = int(base_radius * radius_multiplier)
            adjusted_tolerance = tolerance * radius_multiplier

            pt = _try_detect_registration_mark(
                work, mark, adjusted_radius, adjusted_tolerance
            )
            if pt is None:
                logger.warning(
                    f"Fiducial homography: mark '{mark.id}' not detected "
                    f"(search radius {adjusted_radius}px)"
                )
                return image, False
            detected.append(pt)

    src_raw = np.array(detected, dtype=np.float32)
    dst_raw = np.array(
        [(m.position.x, m.position.y) for m in marks],
        dtype=np.float32,
    )

    src = order_points(src_raw)
    dst = order_points(dst_raw)

    area_src = abs(float(cv2.contourArea(src.reshape(-1, 1, 2))))
    area_dst = abs(float(cv2.contourArea(dst.reshape(-1, 1, 2))))
    if area_src < 200.0 or area_dst < 200.0:
        logger.warning("Fiducial homography rejected: degenerate quad area")
        return image, False

    ratio = area_src / area_dst
    if ratio < 0.12 or ratio > 8.0:
        logger.warning(
            f"Fiducial homography rejected: area ratio src/dst={ratio:.3f} out of range"
        )
        return image, False

    try:
        H = cv2.getPerspectiveTransform(src, dst)
    except cv2.error as e:
        logger.warning(f"Fiducial homography: getPerspectiveTransform failed: {e}")
        return image, False

    det_h = float(np.linalg.det(H[:2, :2]))
    if not (5e-3 < abs(det_h) < 2e2):
        logger.warning(
            f"Fiducial homography rejected: det(linear part)={det_h:.2e} out of safe range"
        )
        return image, False

    w, h = template.canonical_size.width, template.canonical_size.height
    border = 255 if len(image.shape) == 2 else (255, 255, 255)
    aligned = cv2.warpPerspective(
        image,
        H,
        (w, h),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=border,
    )

    logger.success("Fiducial homography applied (four marks → template coordinates)")
    return aligned, True


def _validate_alignment_transform(transform_matrix: np.ndarray) -> Tuple[bool, str]:
    """
    Validate that alignment transform is reasonable.
    """
    a, b = transform_matrix[0, 0], transform_matrix[0, 1]
    c, d = transform_matrix[1, 0], transform_matrix[1, 1]
    tx, ty = transform_matrix[0, 2], transform_matrix[1, 2]

    rotation_rad = np.arctan2(c, a)
    rotation_deg = np.degrees(rotation_rad)
    if abs(rotation_deg) > 1.0:
        return False, f"Excessive rotation: {rotation_deg:.2f}°"

    scale_x = np.sqrt(a**2 + c**2)
    scale_y = np.sqrt(b**2 + d**2)
    if not (0.97 <= scale_x <= 1.03) or not (0.97 <= scale_y <= 1.03):
        return False, f"Excessive scale: sx={scale_x:.3f}, sy={scale_y:.3f}"

    if abs(tx) > 30 or abs(ty) > 40:
        return False, f"Excessive translation: tx={tx:.1f}, ty={ty:.1f}"

    det = a * d - b * c
    if not (0.95 <= det <= 1.05):
        return False, f"Excessive skew: det={det:.3f}"

    return True, (
        f"rot={rotation_deg:.2f}°, scale=({scale_x:.3f},{scale_y:.3f}), "
        f"t=({tx:.1f},{ty:.1f})"
    )


def align_image_with_template(
    image: np.ndarray,
    template: Template,
    strict: bool = False
) -> Tuple[np.ndarray, bool]:
    """
    Align image using template registration marks.
    """
    if not template.registration_marks or len(template.registration_marks) < 3:
        logger.warning("Template has insufficient registration marks, skipping alignment")
        return image, False

    try:
        detected_marks = detect_registration_marks(
            image,
            template.registration_marks
        )

        expected_positions = [(m.position.x, m.position.y) for m in template.registration_marks]
        fallback_count = sum(
            1 for det, exp in zip(detected_marks, expected_positions)
            if det[0] == exp[0] and det[1] == exp[1]
        )
        total_marks = len(template.registration_marks)

        if fallback_count > total_marks // 2:
            logger.warning(
                f"Alignment skipped: {fallback_count}/{total_marks} marks used fallback positions. "
                f"Transform would be unreliable."
            )
            return image, False

        displacements = [
            np.sqrt((det[0] - exp[0])**2 + (det[1] - exp[1])**2)
            for det, exp in zip(detected_marks, expected_positions)
            if not (det[0] == exp[0] and det[1] == exp[1])
        ]

        if displacements:
            mean_disp = np.mean(displacements)
            max_disp = np.max(displacements)
            logger.info(
                f"Mark displacement: mean={mean_disp:.1f}px, max={max_disp:.1f}px "
                f"({len(displacements)} real detections, {fallback_count} fallbacks)"
            )

            bubble_radius = 25
            if mean_disp < bubble_radius * 0.6:
                logger.info(
                    f"Alignment skipped: marks already close to expected "
                    f"(mean={mean_disp:.1f}px < {bubble_radius * 0.6:.0f}px threshold). "
                    f"Perspective correction is sufficient."
                )
                return image, False

        transform_matrix = calculate_alignment_transform(
            detected_marks,
            template.registration_marks
        )

        if transform_matrix is None:
            if strict:
                raise AlignmentError("Failed to calculate alignment transform")
            logger.warning("Alignment skipped: insufficient marks detected")
            return image, False

        is_valid, validation_msg = _validate_alignment_transform(transform_matrix)
        logger.info(f"Alignment transform: {validation_msg}")

        if not is_valid:
            logger.warning(
                f"Alignment transform rejected: {validation_msg}. "
                f"Skipping alignment to preserve perspective correction."
            )
            return image, False

        aligned = apply_alignment(
            image,
            transform_matrix,
            output_size=(template.canonical_size.width, template.canonical_size.height)
        )

        logger.success("Image aligned using registration marks")
        return aligned, True

    except Exception as e:
        if strict:
            raise AlignmentError(f"Alignment failed: {e}")
        logger.error(f"Alignment failed: {e}, proceeding without alignment")
        return image, False


# Legacy function for backward compatibility
def align_image(image):
    """Legacy placeholder function."""
    logger.debug("Using legacy align_image (no template provided)")
    return image