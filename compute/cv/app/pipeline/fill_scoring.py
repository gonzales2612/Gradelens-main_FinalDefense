"""
Fill scoring module.
Measures how filled each bubble is by analyzing pixel darkness.
"""
import cv2
import numpy as np
from typing import Dict, Tuple, List
from loguru import logger

from app.schemas.template import BubbleConfig
from app.utils.image_utils import create_circular_mask


def calculate_fill_ratio(
    roi: np.ndarray,
    radius: int,
    dark_threshold: int = 127,
    use_adaptive: bool = True
) -> float:
    """
    Calculate fill ratio of a bubble ROI.
    
    Fill ratio = (dark pixels inside circle) / (total pixels inside circle)
    
    Args:
        roi: Grayscale ROI image (square)
        radius: Bubble radius
        dark_threshold: Pixel value below which is considered "dark/filled"
        use_adaptive: Whether to use adaptive thresholding
        
    Returns:
        Fill ratio (0.0 = empty, 1.0 = fully filled)
    """
    if roi is None or roi.size == 0:
        return 0.0
    
    # Ensure grayscale
    if len(roi.shape) == 3:
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    else:
        gray = roi
    
    # Create circular mask
    # Use a scoring radius close to the actual bubble radius.
    # Previously 0.85 was too aggressive and missed half-filled bubbles
    # that were slightly offset. 0.95 captures more of the filled area
    # while still avoiding most edge artifacts.
    scoring_radius = max(3, int(radius * 0.95))
    center = roi.shape[0] // 2
    mask = create_circular_mask(
        gray.shape,
        (center, center),
        scoring_radius
    )
    
    # Apply mask
    masked = cv2.bitwise_and(gray, gray, mask=mask)
    
    # Count pixels inside circle
    circle_pixels = np.sum(mask > 0)
    
    if circle_pixels == 0:
        return 0.0
    
    # Threshold to binary
    if use_adaptive:
        # Get mean brightness of pixels inside the circle only
        circle_area = masked[mask > 0]
        mean_brightness = np.mean(circle_area) if len(circle_area) > 0 else 128
        
        # Compute resolution-adaptive kernel sizes
        roi_dim = max(roi.shape[:2])
        blur_k = max(3, int(roi_dim * 0.08) | 1)  # ~8% of ROI, ensure odd
        adaptive_block = max(7, int(roi_dim * 0.25) | 1)  # ~25% of ROI, ensure odd
        
        # Erosion kernel to strip printed circle border (~2-3px thick).
        # Without this, the border inflates empty-bubble fill by ~8-12%,
        # narrowing the gap between "filled" and "empty" and causing
        # inconsistent detection.
        border_erosion_kernel = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE, (3, 3)
        )
        
        if mean_brightness > 200:  # Very bright image - likely unfilled bubble
            # For bright images, use stricter threshold to avoid false positives
            blurred = cv2.GaussianBlur(masked, (blur_k, blur_k), 0)
            _, binary = cv2.threshold(
                blurred,
                0,
                255,
                cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
            )
            binary = cv2.bitwise_and(binary, binary, mask=mask)
            # Erode to remove printed border pixels
            binary = cv2.erode(binary, border_erosion_kernel, iterations=1)
            dark_pixels = np.sum(binary > 0)
        elif mean_brightness < 100:  # Dark image - likely filled bubble
            # For dark images, use simpler threshold
            dark_pixels = np.sum((circle_area < dark_threshold))
        else:
            # Adaptive threshold for normal lighting
            blurred = cv2.GaussianBlur(gray, (blur_k, blur_k), 0)
            binary = cv2.adaptiveThreshold(
                blurred,
                255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY_INV,
                blockSize=adaptive_block,
                C=5
            )
            binary = cv2.bitwise_and(binary, binary, mask=mask)
            # Erode to remove printed border pixels
            binary = cv2.erode(binary, border_erosion_kernel, iterations=1)
            dark_pixels = np.sum(binary > 0)
    else:
        # Simple threshold
        dark_pixels = np.sum((masked < dark_threshold) & (mask > 0))
    
    fill_ratio = dark_pixels / circle_pixels
    
    return float(np.clip(fill_ratio, 0.0, 1.0))


def score_question_bubbles(
    bubbles_rois: Dict[str, np.ndarray],
    bubble_config: BubbleConfig
) -> Dict[str, float]:
    """
    Score all bubbles for a single question.
    
    Args:
        bubbles_rois: Dictionary mapping option letter to ROI image
        bubble_config: Bubble configuration from template
        
    Returns:
        Dictionary mapping option letter to fill ratio
    """
    fill_ratios = {}
    
    for option, roi in bubbles_rois.items():
        try:
            fill_ratio = calculate_fill_ratio(
                roi,
                bubble_config.radius,
                dark_threshold=127
            )
            fill_ratios[option] = fill_ratio
        except Exception as e:
            logger.warning(f"Failed to score option {option}: {e}")
            fill_ratios[option] = 0.0
    
    return fill_ratios


def determine_selected_answers(
    fill_ratios: Dict[str, float],
    bubble_config: BubbleConfig
) -> Tuple[List[str], str, float]:
    """
    Determine which answer(s) are selected based on fill ratios.
    
    Uses baseline subtraction and relative scoring to handle thick
    printed circle borders that inflate ALL options' fill ratios.
    
    Logic:
    1. Subtract baseline (min fill = border contribution) from all ratios
    2. No option meaningfully above baseline → unanswered
    3. Multiple options with similar net fill (close competitors) → ambiguous
    4. Multiple bubbles > absolute ambiguous_threshold → ambiguous
    5. One clear winner with sufficient margin → answered
    
    Args:
        fill_ratios: Dictionary of option -> fill_ratio
        bubble_config: Bubble configuration with thresholds
        
    Returns:
        (selected_options, status, confidence)
        status: "answered", "unanswered", or "ambiguous"
        confidence: 0.0 - 1.0 (difference between top 2 net fills)
    """
    if not fill_ratios:
        return [], "unanswered", 0.0
    
    fill_threshold = bubble_config.fill_threshold
    ambiguous_threshold = bubble_config.ambiguous_threshold
    
    # --- Baseline subtraction ---
    # The minimum fill across options represents the printed circle
    # border artifact.  Subtracting it gives the "net fill" — only
    # the ink the student actually put down.
    baseline = min(fill_ratios.values())
    net_ratios = {k: max(0.0, v - baseline) for k, v in fill_ratios.items()}
    
    # Sort by absolute fill ratio
    sorted_abs = sorted(
        fill_ratios.items(),
        key=lambda x: x[1],
        reverse=True
    )
    top_option, top_ratio = sorted_abs[0]
    
    # Sort by net fill ratio
    sorted_net = sorted(
        net_ratios.items(),
        key=lambda x: x[1],
        reverse=True
    )
    top_net_option, top_net_val = sorted_net[0]
    
    # --- Unanswered check ---
    # Neither absolute nor net fill is meaningful
    if top_ratio < fill_threshold:
        return [], "unanswered", 0.0
    
    # --- Relative ambiguity detection (close competitors) ---
    # When the 2nd-highest net fill is close to the highest, the
    # question is ambiguous — we can't confidently pick one answer.
    # This catches skewed scans where thick borders make all fills
    # look similar (e.g. 21%, 9%, 25%, 27% → net 12%, 0%, 16%, 18%).
    if len(sorted_net) >= 2 and top_net_val > 0:
        # Minimum net fill to be considered a real competitor
        # (must be meaningfully above zero / noise)
        min_competitor_net = fill_threshold * 0.35
        
        second_net_option, second_net_val = sorted_net[1]
        
        if second_net_val > min_competitor_net:
            relative_ratio = second_net_val / top_net_val
            
            # If 2nd option's net fill is >= 55% of the top option,
            # the gap is too narrow to confidently pick one answer.
            if relative_ratio > 0.55:
                close_options = [
                    opt for opt, val in sorted_net
                    if val > min_competitor_net
                    and (top_net_val == 0 or val / top_net_val > 0.45)
                ]
                if len(close_options) > 1:
                    confidence = float(top_net_val - second_net_val)
                    logger.debug(
                        f"Ambiguous (close competitors): "
                        f"fills={{{', '.join(f'{k}:{v:.3f}' for k, v in sorted_abs)}}}, "
                        f"net={{{', '.join(f'{k}:{v:.3f}' for k, v in sorted_net)}}}, "
                        f"baseline={baseline:.3f}"
                    )
                    return close_options, "ambiguous", confidence
    
    # --- Absolute ambiguity detection (existing) ---
    # Multiple bubbles above the high absolute threshold
    high_fill_options = [
        opt for opt, ratio in fill_ratios.items()
        if ratio >= ambiguous_threshold
    ]
    if len(high_fill_options) > 1:
        return high_fill_options, "ambiguous", 0.0
    
    # --- Single answer selected ---
    if len(sorted_net) >= 2:
        confidence = float(sorted_net[0][1] - sorted_net[1][1])
    else:
        confidence = float(top_net_val)
    
    return [top_net_option], "answered", confidence


def score_all_questions(
    all_bubbles: Dict[int, Dict[str, np.ndarray]],
    bubble_config: BubbleConfig
) -> Dict[int, Dict]:
    """
    Score bubbles for all questions.
    
    Args:
        all_bubbles: Nested dict {question_id: {option: roi_image}}
        bubble_config: Bubble configuration
        
    Returns:
        Dict mapping question_id to detection result:
        {
            "fill_ratios": {option: ratio},
            "selected": [option],
            "status": "answered"|"unanswered"|"ambiguous",
            "confidence": float
        }
    """
    results = {}
    
    logger.debug(f"Scoring {len(all_bubbles)} questions")
    
    for question_id, bubbles_rois in all_bubbles.items():
        # Score each bubble
        fill_ratios = score_question_bubbles(bubbles_rois, bubble_config)
        
        # Determine selected answer(s)
        selected, status, confidence = determine_selected_answers(
            fill_ratios,
            bubble_config
        )
        
        results[question_id] = {
            "question_id": question_id,
            "fill_ratios": fill_ratios,
            "selected": selected,
            "detection_status": status,
            "confidence": confidence
        }
        
        logger.debug(
            f"Q{question_id}: status={status}, selected={selected}, "
            f"ratios={{{', '.join(f'{k}:{v:.2f}' for k, v in fill_ratios.items())}}}"
        )
    
    logger.success(f"Scored {len(results)} questions")
    
    return results


def validate_fill_ratios(
    fill_ratios: Dict[str, float],
    min_ratio: float = 0.0,
    max_ratio: float = 1.0
) -> Tuple[bool, str]:
    """
    Validate fill ratios are within expected range.
    
    Args:
        fill_ratios: Dictionary of option -> fill_ratio
        min_ratio: Minimum valid ratio
        max_ratio: Maximum valid ratio
        
    Returns:
        (is_valid, reason)
    """
    for option, ratio in fill_ratios.items():
        if not (min_ratio <= ratio <= max_ratio):
            return False, f"Option {option} ratio {ratio:.2f} out of range [{min_ratio}, {max_ratio}]"
    
    return True, "Valid"


def calculate_contrast_score(roi: np.ndarray) -> float:
    """
    Calculate contrast score of ROI.
    Low contrast = hard to detect fill.
    
    Args:
        roi: Grayscale ROI image
        
    Returns:
        Contrast score (standard deviation of pixel values)
    """
    if roi is None or roi.size == 0:
        return 0.0
    
    return float(np.std(roi))
