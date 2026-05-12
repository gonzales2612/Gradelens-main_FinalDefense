"""
Detailed bubble detection debugging tool.
Shows individual bubble ROIs and their calculated fill ratios.


Example usage:
    python -m tests.debug.debug_bubble_detection
        --image tests\fixtures\images\test_perfect_form_60q.png
        --template form_60q
        --questions 1 2 3 4 5 6 7 8 9 10 21 22 23 24 41 42 43 44

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
from app.pipeline.align import align_image_with_template
from app.pipeline.roi_extraction import extract_all_bubbles
from app.pipeline.fill_scoring import calculate_fill_ratio


def debug_bubble_detection(image_path: str, template_id: str, question_ids: list = None):
    """Debug bubble detection for specific questions."""
    
    # Load template
    template = load_template(template_id)
    logger.info(f"Template: {template.name}")
    logger.info(f"Bubble config: radius={template.bubble_config.radius}, "
                f"fill_threshold={template.bubble_config.fill_threshold}, "
                f"ambiguous_threshold={template.bubble_config.ambiguous_threshold}")
    
    # Process image
    logger.info(f"Processing: {image_path}")
    preprocessed, _ = preprocess_image(image_path)
    
    # Detect paper and correct perspective
    boundary = detect_paper_boundary(preprocessed)
    corrected = correct_perspective(
        preprocessed,
        boundary,
        (template.canonical_size.width, template.canonical_size.height)
    )
    
    if corrected is None:
        logger.error("Failed to correct perspective")
        return
    
    logger.success(f"Perspective corrected: {corrected.shape}")
    
    # Apply fine alignment using registration marks (CRITICAL - don't skip this!)
    try:
        aligned, alignment_success = align_image_with_template(
            corrected,
            template,
            strict=False
        )
        if alignment_success:
            logger.success(f"Fine alignment applied successfully")
        else:
            logger.warning("Alignment failed, using perspective-corrected image")
            aligned = corrected
    except Exception as e:
        logger.warning(f"Alignment error: {e}, using perspective-corrected image")
        aligned = corrected
    
    # Extract bubbles
    all_bubbles = extract_all_bubbles(aligned, template)
    
    # Debug specific questions or all if not specified
    questions_to_debug = question_ids if question_ids else [q.question_id for q in template.questions]
    
    # Save to cv/tests/output (relative to script location)
    tests_dir = Path(__file__).parent.parent
    output_dir = tests_dir / "output" / "bubble_debug"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    for qid in questions_to_debug:
        if qid not in all_bubbles:
            logger.warning(f"Question {qid} not found in extracted bubbles")
            continue
        
        bubbles = all_bubbles[qid]
        logger.info(f"\n{'='*60}")
        logger.info(f"Question {qid}:")
        
        # Create composite image showing all options
        roi_size = (template.bubble_config.radius + 5) * 2
        composite = np.ones((roi_size, roi_size * 4 + 30, 3), dtype=np.uint8) * 255
        
        fill_ratios = {}
        for i, (option, roi) in enumerate(sorted(bubbles.items())):
            # Debug ROI stats
            logger.debug(f"  {option} ROI: shape={roi.shape}, dtype={roi.dtype}, "
                        f"min={roi.min()}, max={roi.max()}, mean={roi.mean():.1f}")
            
            # Calculate fill ratio
            fill_ratio = calculate_fill_ratio(roi, template.bubble_config.radius)
            fill_ratios[option] = fill_ratio
            
            # Convert ROI to BGR for composite
            if len(roi.shape) == 2:
                roi_bgr = cv2.cvtColor(roi, cv2.COLOR_GRAY2BGR)
            else:
                roi_bgr = roi.copy()
            
            # Resize if needed
            if roi_bgr.shape[0] != roi_size:
                roi_bgr = cv2.resize(roi_bgr, (roi_size, roi_size))
            
            # Place in composite
            x_offset = i * (roi_size + 10)
            composite[0:roi_size, x_offset:x_offset+roi_size] = roi_bgr
            
            # Draw border color based on fill ratio
            if fill_ratio >= template.bubble_config.ambiguous_threshold:
                color = (0, 255, 0)  # Green - high fill
                thickness = 3
            elif fill_ratio >= template.bubble_config.fill_threshold:
                color = (0, 165, 255)  # Orange - medium fill
                thickness = 2
            else:
                color = (200, 200, 200)  # Gray - low fill
                thickness = 1
            
            cv2.rectangle(composite, (x_offset, 0), (x_offset+roi_size, roi_size), color, thickness)
            
            # Add label
            label = f"{option}: {fill_ratio:.3f}"
            cv2.putText(composite, label, (x_offset+5, roi_size-10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
            
            # Log details
            logger.info(f"  {option}: fill_ratio={fill_ratio:.3f} "
                       f"({'FILLED' if fill_ratio >= template.bubble_config.fill_threshold else 'EMPTY'})")
        
        # Determine selection
        sorted_fills = sorted(fill_ratios.items(), key=lambda x: x[1], reverse=True)
        top_option, top_ratio = sorted_fills[0]
        
        if top_ratio >= template.bubble_config.fill_threshold:
            logger.info(f"  → DETECTED: {top_option} (ratio={top_ratio:.3f})")
        else:
            logger.info(f"  → NO DETECTION (highest ratio={top_ratio:.3f} < threshold={template.bubble_config.fill_threshold})")
        
        # Save composite
        output_path = output_dir / f"question_{qid:02d}.png"
        cv2.imwrite(str(output_path), composite)
        logger.debug(f"  Saved: {output_path}")
    
    logger.success(f"\nDebug images saved to: {output_dir}")
    logger.info(f"\nThreshold Analysis:")
    logger.info(f"  fill_threshold = {template.bubble_config.fill_threshold}")
    logger.info(f"  ambiguous_threshold = {template.bubble_config.ambiguous_threshold}")
    logger.info(f"\nIf many bubbles show high visual darkness but low fill_ratio,")
    logger.info(f"consider lowering fill_threshold in the template JSON.")


def main():
    parser = argparse.ArgumentParser(description="Debug bubble detection in detail")
    parser.add_argument("--image", required=True, help="Path to test image")
    parser.add_argument("--template", required=True, help="Template ID")
    parser.add_argument("--questions", nargs="+", type=int, 
                       help="Specific question IDs to debug (default: all)")
    
    args = parser.parse_args()
    
    # Configure logging
    logger.remove()
    logger.add(sys.stderr, level="DEBUG")
    
    debug_bubble_detection(args.image, args.template, args.questions)


if __name__ == "__main__":
    main()
