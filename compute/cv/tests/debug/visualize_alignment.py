"""
Alignment Visualization Tool

Creates comprehensive visualizations showing:
1. Original image with paper boundary
2. Perspective-corrected image
3. Registration marks (expected vs detected)
4. ROI boxes for all questions
5. Side-by-side comparison

Usage:
    python -m tests.debug.visualize_alignment --image <path> --template <template_id>

Example:
    python -m tests.debug.visualize_alignment
        --image tests/fixtures/images/test_perfect_gl_form_60.png
        --template gl_form_60
        --output tests/output/alignment_debug.png
"""
import argparse
import sys
from pathlib import Path
import cv2
import numpy as np
from loguru import logger

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.templates.loader import load_template
from app.pipeline.preprocess import preprocess_image
from app.pipeline.paper_detection import detect_paper_boundary
from app.pipeline.perspective import correct_perspective
from app.pipeline.align import detect_registration_marks, align_image_with_template


def draw_paper_boundary(image: np.ndarray, boundary: np.ndarray) -> np.ndarray:
    """Draw detected paper boundary on image."""
    vis = image.copy()
    if len(vis.shape) == 2:
        vis = cv2.cvtColor(vis, cv2.COLOR_GRAY2BGR)
    
    # Draw boundary polygon
    pts = boundary.reshape((-1, 1, 2)).astype(np.int32)
    cv2.polylines(vis, [pts], True, (0, 255, 0), 3)
    
    # Draw corner points
    for i, (x, y) in enumerate(boundary):
        cv2.circle(vis, (int(x), int(y)), 10, (0, 0, 255), -1)
        cv2.putText(
            vis, f"C{i+1}",
            (int(x) + 15, int(y) - 15),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8, (0, 0, 255), 2
        )
    
    return vis


def draw_registration_marks_detailed(
    image: np.ndarray,
    template,
    detected_marks=None
) -> np.ndarray:
    """Draw registration marks with search areas."""
    vis = image.copy()
    if len(vis.shape) == 2:
        vis = cv2.cvtColor(vis, cv2.COLOR_GRAY2BGR)
    
    img_height = vis.shape[0]
    img_center_y = img_height / 2
    
    for i, mark in enumerate(template.registration_marks):
        x, y = mark.position.x, mark.position.y
        
        # Calculate adaptive search radius
        distance_from_center_y = abs(y - img_center_y)
        radius_multiplier = 1.0 + (distance_from_center_y / img_center_y) * 1.0
        search_radius = int(50 * radius_multiplier)
        
        # Draw search area (light blue rectangle)
        cv2.rectangle(
            vis,
            (x - search_radius, y - search_radius),
            (x + search_radius, y + search_radius),
            (255, 200, 100), 2
        )
        
        # Draw expected position
        if mark.type == "circle":
            cv2.circle(vis, (x, y), mark.size, (255, 0, 0), 2)
        else:  # square
            half_size = mark.size // 2
            cv2.rectangle(
                vis,
                (x - half_size, y - half_size),
                (x + half_size, y + half_size),
                (255, 0, 0), 2
            )
        
        # Label expected
        cv2.putText(
            vis, f"{mark.id}",
            (x - 60, y - search_radius - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6, (255, 0, 0), 2
        )
        
        # Draw search radius info
        cv2.putText(
            vis, f"R={search_radius}px",
            (x + search_radius + 5, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.4, (255, 200, 100), 1
        )
        
        # Draw detected position if available
        if detected_marks and i < len(detected_marks):
            det_x, det_y = detected_marks[i]
            
            # Draw detected mark (green)
            cv2.circle(vis, (det_x, det_y), mark.size + 5, (0, 255, 0), 2)
            
            # Draw line from expected to detected
            cv2.line(vis, (x, y), (det_x, det_y), (0, 255, 255), 1)
            
            # Calculate and show offset
            offset = np.sqrt((det_x - x)**2 + (det_y - y)**2)
            cv2.putText(
                vis, f"Δ={offset:.1f}px",
                (det_x + 10, det_y + 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.4, (0, 255, 0), 1
            )
    
    return vis


def draw_question_rois(image: np.ndarray, template) -> np.ndarray:
    """Draw ROI boxes for all questions."""
    vis = image.copy()
    if len(vis.shape) == 2:
        vis = cv2.cvtColor(vis, cv2.COLOR_GRAY2BGR)
    
    for question in template.questions:
        # Get bubble positions
        positions = [(pos.x, pos.y) for pos in question.options.values()]
        if not positions:
            continue
        
        # Calculate bounding box
        xs = [p[0] for p in positions]
        ys = [p[1] for p in positions]
        x1, y1 = min(xs) - 20, min(ys) - 20
        x2, y2 = max(xs) + 20, max(ys) + 20
        
        # Draw box
        color = (0, 255, 0) if question.question_id <= 15 else \
                (255, 165, 0) if question.question_id <= 30 else \
                (0, 165, 255)
        cv2.rectangle(vis, (x1, y1), (x2, y2), color, 1)
        
        # Draw question number
        cv2.putText(
            vis, f"Q{question.question_id}",
            (x1, y1 - 5),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.4, color, 1
        )
        
        # Draw bubble circles
        for option, pos in question.options.items():
            cv2.circle(vis, (pos.x, pos.y), template.bubble_config.radius, (200, 200, 200), 1)
            cv2.putText(
                vis, option,
                (pos.x - 4, pos.y + 4),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.3, (0, 0, 0), 1
            )
    
    return vis


def create_alignment_visualization(image_path: Path, template_id: str, output_path: Path):
    """Create comprehensive alignment visualization."""
    logger.info(f"Processing: {image_path}")
    
    # Load template
    template = load_template(template_id)
    logger.info(f"Template loaded: {template.name}")
    
    # Stage 1: Preprocess
    logger.info("Stage 1: Preprocessing...")
    preprocessed, _ = preprocess_image(str(image_path))
    
    # Stage 2: Detect paper boundary
    logger.info("Stage 2: Paper detection...")
    try:
        boundary = detect_paper_boundary(preprocessed)
        vis_boundary = draw_paper_boundary(preprocessed, boundary)
        
        # Stage 3: Perspective correction
        logger.info("Stage 3: Perspective correction...")
        corrected = correct_perspective(
            preprocessed,
            boundary,
            (template.canonical_size.width, template.canonical_size.height)
        )
    except Exception as e:
        logger.warning(f"Paper detection failed: {e}")
        logger.info("Using fallback: treating image as already canonical size")
        
        # Fallback: For synthetic test forms without borders, use image as-is
        target_size = (template.canonical_size.width, template.canonical_size.height)
        
        # Resize to canonical size if needed
        if preprocessed.shape[:2][::-1] != target_size:
            corrected = cv2.resize(preprocessed, target_size)
        else:
            corrected = preprocessed
        
        # Create a simple boundary visualization (entire image)
        vis_boundary = preprocessed.copy()
        if len(vis_boundary.shape) == 2:
            vis_boundary = cv2.cvtColor(vis_boundary, cv2.COLOR_GRAY2BGR)
        h, w = vis_boundary.shape[:2]
        cv2.rectangle(vis_boundary, (0, 0), (w-1, h-1), (0, 255, 0), 3)
        cv2.putText(
            vis_boundary, "No border detected - using entire image",
            (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2
        )
    
    # Stage 4: Detect registration marks
    logger.info("Stage 4: Registration mark detection...")
    detected_marks = detect_registration_marks(
        corrected,
        template.registration_marks,
        search_radius=50,
        tolerance=0.3,
        adaptive_search=True
    )
    
    # Stage 5: Fine alignment
    logger.info("Stage 5: Fine alignment...")
    aligned, alignment_success = align_image_with_template(
        corrected,
        template,
        strict=False
    )
    
    logger.info(f"Alignment success: {alignment_success}")
    
    # Create visualizations
    vis_marks_before = draw_registration_marks_detailed(corrected, template, detected_marks)
    vis_marks_after = draw_registration_marks_detailed(aligned, template, None)
    vis_rois = draw_question_rois(aligned, template)
    
    # Resize all to same width for stacking
    target_width = 1400
    def resize_to_width(img, width):
        h, w = img.shape[:2]
        scale = width / w
        return cv2.resize(img, (width, int(h * scale)))
    
    vis_boundary = resize_to_width(vis_boundary, target_width)
    vis_marks_before = resize_to_width(vis_marks_before, target_width)
    vis_marks_after = resize_to_width(vis_marks_after, target_width)
    vis_rois = resize_to_width(vis_rois, target_width)
    
    # Add titles
    def add_title(img, title):
        img = img.copy()
        cv2.rectangle(img, (0, 0), (img.shape[1], 60), (255, 255, 255), -1)
        cv2.putText(
            img, title,
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.2, (0, 0, 0), 2
        )
        return img
    
    vis_boundary = add_title(vis_boundary, "1. Original + Paper Boundary")
    vis_marks_before = add_title(vis_marks_before, "2. After Perspective Correction + Registration Marks")
    vis_marks_after = add_title(vis_marks_after, "3. After Fine Alignment")
    vis_rois = add_title(vis_rois, "4. Question ROI Boxes")
    
    # Stack vertically
    output = np.vstack([vis_boundary, vis_marks_before, vis_marks_after, vis_rois])
    
    # Save
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), output)
    logger.success(f"Visualization saved: {output_path}")
    
    # Also save individual stages
    stage_dir = output_path.parent / f"{output_path.stem}_stages"
    stage_dir.mkdir(exist_ok=True)
    
    cv2.imwrite(str(stage_dir / "1_boundary.png"), vis_boundary)
    cv2.imwrite(str(stage_dir / "2_marks_detected.png"), vis_marks_before)
    cv2.imwrite(str(stage_dir / "3_aligned.png"), vis_marks_after)
    cv2.imwrite(str(stage_dir / "4_rois.png"), vis_rois)
    
    logger.success(f"Individual stages saved: {stage_dir}")


def main():
    parser = argparse.ArgumentParser(description="Visualize alignment pipeline stages")
    parser.add_argument("--image", required=True, help="Path to image file")
    parser.add_argument("--template", required=True, help="Template ID (e.g., gl_form_60)")
    parser.add_argument("--output", default="tests/output/alignment_debug.png",
                       help="Output path for visualization")
    
    args = parser.parse_args()
    
    image_path = Path(args.image)
    if not image_path.exists():
        logger.error(f"Image not found: {image_path}")
        sys.exit(1)
    
    output_path = Path(args.output)
    
    create_alignment_visualization(image_path, args.template, output_path)


if __name__ == "__main__":
    main()
