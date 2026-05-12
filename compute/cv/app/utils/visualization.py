"""
Visualization utilities for debugging CV pipeline.
Creates annotated images showing pipeline stages.
"""
import cv2
import numpy as np
from typing import List, Tuple, Dict, Optional
from pathlib import Path


def draw_detection_overlay(
    image: np.ndarray,
    detections: List[Dict],
    template_questions: List[Dict],
    show_fill_ratios: bool = True
) -> np.ndarray:
    """
    Draw bubble detection overlay on image.
    
    Args:
        image: Base image (BGR)
        detections: List of detection results per question
        template_questions: Template question definitions
        show_fill_ratios: Whether to show fill ratio text
        
    Returns:
        Annotated image
    """
    output = image.copy()
    
    for detection in detections:
        q_id = detection['question_id']
        fill_ratios = detection.get('fill_ratios', {})
        selected = detection.get('selected', [])
        
        # Find template question
        template_q = next((q for q in template_questions if q['question_id'] == q_id), None)
        if not template_q:
            continue
        
        # Draw each bubble
        for option, position in template_q['options'].items():
            x, y = position['x'], position['y']
            fill_ratio = fill_ratios.get(option, 0.0)
            is_selected = option in selected
            
            # Color based on fill ratio
            if is_selected:
                color = (0, 255, 0)  # Green for selected
                thickness = 3
            elif fill_ratio > 0.5:
                color = (0, 165, 255)  # Orange for high fill but not selected
                thickness = 2
            else:
                color = (200, 200, 200)  # Gray for empty
                thickness = 1
            
            # Draw circle
            cv2.circle(output, (x, y), 12, color, thickness)
            
            # Draw option letter
            cv2.putText(
                output,
                option,
                (x - 5, y + 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.4,
                (0, 0, 0),
                1
            )
            
            # Draw fill ratio
            if show_fill_ratios:
                ratio_text = f"{fill_ratio:.2f}"
                cv2.putText(
                    output,
                    ratio_text,
                    (x - 10, y + 25),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.3,
                    color,
                    1
                )
    
    return output


def draw_paper_boundary(
    image: np.ndarray,
    corners: np.ndarray,
    color: Tuple[int, int, int] = (0, 255, 0),
    thickness: int = 3
) -> np.ndarray:
    """
    Draw detected paper boundary.
    
    Args:
        image: Base image
        corners: 4 corner points
        color: Line color (BGR)
        thickness: Line thickness
        
    Returns:
        Annotated image
    """
    output = image.copy()
    
    # Draw polygon
    pts = corners.reshape((-1, 1, 2)).astype(np.int32)
    cv2.polylines(output, [pts], True, color, thickness)
    
    # Draw corner points
    for i, (x, y) in enumerate(corners):
        cv2.circle(output, (int(x), int(y)), 8, (255, 0, 0), -1)
        cv2.putText(
            output,
            f"C{i+1}",
            (int(x) + 10, int(y) - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 0, 0),
            2
        )
    
    return output


def draw_registration_marks(
    image: np.ndarray,
    marks: List[Tuple[int, int]],
    detected_marks: Optional[List[Tuple[int, int]]] = None
) -> np.ndarray:
    """
    Draw expected and detected registration marks.
    
    Args:
        image: Base image
        marks: Expected mark positions
        detected_marks: Detected mark positions (optional)
        
    Returns:
        Annotated image
    """
    output = image.copy()
    
    # Draw expected marks (blue circles)
    for i, (x, y) in enumerate(marks):
        cv2.circle(output, (x, y), 20, (255, 0, 0), 2)
        cv2.putText(
            output,
            f"M{i+1}",
            (x - 10, y - 25),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 0, 0),
            2
        )
    
    # Draw detected marks (green circles)
    if detected_marks:
        for x, y in detected_marks:
            cv2.circle(output, (x, y), 18, (0, 255, 0), 2)
    
    return output


def create_pipeline_stages_grid(
    stages: List[Tuple[str, np.ndarray]],
    grid_cols: int = 3
) -> np.ndarray:
    """
    Create a grid showing multiple pipeline stages.
    
    Args:
        stages: List of (stage_name, image) tuples
        grid_cols: Number of columns in grid
        
    Returns:
        Grid image
    """
    if not stages:
        return np.zeros((100, 100, 3), dtype=np.uint8)
    
    # Calculate grid dimensions
    n_stages = len(stages)
    grid_rows = (n_stages + grid_cols - 1) // grid_cols
    
    # Get max dimensions
    max_h = max(img.shape[0] for _, img in stages)
    max_w = max(img.shape[1] for _, img in stages)
    
    # Resize all to same size
    resized_stages = []
    for name, img in stages:
        # Convert to BGR if grayscale
        if len(img.shape) == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        
        # Resize
        img_resized = cv2.resize(img, (max_w, max_h))
        
        # Add title
        cv2.putText(
            img_resized,
            name,
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 255),
            2
        )
        
        resized_stages.append(img_resized)
    
    # Pad if needed
    while len(resized_stages) < grid_rows * grid_cols:
        resized_stages.append(np.zeros((max_h, max_w, 3), dtype=np.uint8))
    
    # Create grid
    rows = []
    for i in range(grid_rows):
        row_images = resized_stages[i * grid_cols:(i + 1) * grid_cols]
        rows.append(np.hstack(row_images))
    
    grid = np.vstack(rows)
    
    return grid


def save_debug_image(
    image: np.ndarray,
    scan_id: str,
    stage_name: str,
    output_dir: Path
) -> Path:
    """
    Save debug image to disk.
    
    Args:
        image: Image to save
        scan_id: Scan identifier
        stage_name: Pipeline stage name
        output_dir: Output directory
        
    Returns:
        Path to saved image
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    
    filename = f"{scan_id}_{stage_name}.jpg"
    filepath = output_dir / filename
    
    cv2.imwrite(str(filepath), image)
    
    return filepath


def draw_quality_metrics(
    image: np.ndarray,
    metrics: Dict[str, float],
    position: Tuple[int, int] = (10, 30)
) -> np.ndarray:
    """
    Draw quality metrics overlay on image.
    
    Args:
        image: Base image
        metrics: Dictionary of metric name -> value
        position: Starting text position (x, y)
        
    Returns:
        Annotated image
    """
    output = image.copy()
    
    x, y = position
    line_height = 25
    
    for i, (key, value) in enumerate(metrics.items()):
        text = f"{key}: {value:.2f}"
        
        # Color based on metric type
        if "blur" in key.lower() and value < 100:
            color = (0, 0, 255)  # Red for low blur
        elif "confidence" in key.lower() and value < 0.5:
            color = (0, 165, 255)  # Orange for low confidence
        else:
            color = (0, 255, 0)  # Green for good
        
        cv2.putText(
            output,
            text,
            (x, y + i * line_height),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            color,
            2
        )
    
    return output
