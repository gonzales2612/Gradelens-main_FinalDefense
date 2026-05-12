"""
Utilities package initialization.
"""
from .image_utils import (
    resize_with_aspect_ratio,
    calculate_blur_score,
    calculate_brightness_stats,
    calculate_skew_angle,
    create_circular_mask,
    order_points,
    four_point_transform,
    safe_crop,
    draw_points,
    rotate_image
)

from .contour_utils import (
    approximate_contour,
    find_largest_contour,
    filter_contours_by_area,
    is_rectangle,
    find_quadrilateral,
    get_contour_center,
    find_circles,
    calculate_circularity,
    match_template_contours,
    get_bounding_box,
    get_rotated_bounding_box
)

from .visualization import (
    draw_detection_overlay,
    draw_paper_boundary,
    draw_registration_marks,
    create_pipeline_stages_grid,
    save_debug_image,
    draw_quality_metrics
)

__all__ = [
    # image_utils
    "resize_with_aspect_ratio",
    "calculate_blur_score",
    "calculate_brightness_stats",
    "calculate_skew_angle",
    "create_circular_mask",
    "order_points",
    "four_point_transform",
    "safe_crop",
    "draw_points",
    "rotate_image",
    
    # contour_utils
    "approximate_contour",
    "find_largest_contour",
    "filter_contours_by_area",
    "is_rectangle",
    "find_quadrilateral",
    "get_contour_center",
    "find_circles",
    "calculate_circularity",
    "match_template_contours",
    "get_bounding_box",
    "get_rotated_bounding_box",
    
    # visualization
    "draw_detection_overlay",
    "draw_paper_boundary",
    "draw_registration_marks",
    "create_pipeline_stages_grid",
    "save_debug_image",
    "draw_quality_metrics",
]
