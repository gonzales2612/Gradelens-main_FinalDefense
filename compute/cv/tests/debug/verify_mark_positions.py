"""
Verify Registration Mark Positions

Analyzes a generated test form to check if registration marks are drawn
at the exact positions specified in the template.

Example Usage:

python -m tests.debug.verify_mark_positions --image tests/fixtures/images/test_perfect_form_60q.png --template form_60q

"""
import sys
from pathlib import Path
import cv2
import numpy as np
from loguru import logger

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.templates.loader import load_template


def find_mark_center(image: np.ndarray, expected_x: int, expected_y: int, 
                     search_radius: int = 100) -> tuple:
    """Find the actual center of a registration mark."""
    # Extract region around expected position
    x1 = max(0, expected_x - search_radius)
    y1 = max(0, expected_y - search_radius)
    x2 = min(image.shape[1], expected_x + search_radius)
    y2 = min(image.shape[0], expected_y + search_radius)
    
    roi = image[y1:y2, x1:x2]
    
    # Threshold to find black marks
    _, binary = cv2.threshold(roi, 127, 255, cv2.THRESH_BINARY_INV)
    
    # Find contours
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return None
    
    # Find largest contour (should be the mark)
    largest = max(contours, key=cv2.contourArea)
    
    # Get moments to find centroid
    M = cv2.moments(largest)
    if M['m00'] == 0:
        return None
    
    cx = int(M['m10'] / M['m00'])
    cy = int(M['m01'] / M['m00'])
    
    # Convert back to image coordinates
    actual_x = x1 + cx
    actual_y = y1 + cy
    
    # Also get bounding box
    x, y, w, h = cv2.boundingRect(largest)
    bbox = (x1 + x, y1 + y, w, h)
    
    return (actual_x, actual_y, bbox)


def verify_marks(image_path: str, template_id: str):
    """Verify all registration mark positions."""
    # Load image and template
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if image is None:
        logger.error(f"Failed to load image: {image_path}")
        return
    
    template = load_template(template_id)
    
    logger.info(f"Verifying {len(template.registration_marks)} registration marks")
    logger.info(f"Image size: {image.shape[1]}x{image.shape[0]}")
    logger.info(f"Template size: {template.canonical_size.width}x{template.canonical_size.height}")
    
    print("\n" + "="*80)
    print("REGISTRATION MARK VERIFICATION")
    print("="*80)
    
    for mark in template.registration_marks:
        expected_x = mark.position.x
        expected_y = mark.position.y
        
        result = find_mark_center(image, expected_x, expected_y)
        
        if result:
            actual_x, actual_y, bbox = result
            bx, by, bw, bh = bbox
            
            offset_x = actual_x - expected_x
            offset_y = actual_y - expected_y
            distance = np.sqrt(offset_x**2 + offset_y**2)
            
            print(f"\n{mark.id.upper()}:")
            print(f"  Type: {mark.type}, Size: {mark.size}")
            print(f"  Expected: ({expected_x}, {expected_y})")
            print(f"  Detected: ({actual_x}, {actual_y})")
            print(f"  Offset: ({offset_x:+.0f}, {offset_y:+.0f}) = {distance:.1f}px")
            print(f"  BBox: ({bx}, {by}) size {bw}x{bh}")
            
            if mark.type == "square":
                # For squares, verify if drawn centered or corner-based
                expected_bbox_centered = (
                    expected_x - mark.size // 2,
                    expected_y - mark.size // 2,
                    mark.size,
                    mark.size
                )
                print(f"  Expected BBox (if centered): ({expected_bbox_centered[0]}, {expected_bbox_centered[1]}) size {expected_bbox_centered[2]}x{expected_bbox_centered[3]}")
                
                # Check if bbox matches centered drawing
                bbox_matches_centered = (
                    abs(bx - expected_bbox_centered[0]) < 5 and
                    abs(by - expected_bbox_centered[1]) < 5
                )
                
                print(f"  ✓ Drawn centered: {bbox_matches_centered}")
        else:
            print(f"\n{mark.id.upper()}: ❌ NOT FOUND")
    
    print("\n" + "="*80)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Verify registration mark positions")
    parser.add_argument("--image", required=True, help="Path to test form image")
    parser.add_argument("--template", required=True, help="Template ID")
    
    args = parser.parse_args()
    
    verify_marks(args.image, args.template)
