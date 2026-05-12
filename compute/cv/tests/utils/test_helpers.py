"""
Test helper utilities.

Provides common functions for test setup, fixture loading, and validation.
"""
from pathlib import Path
from typing import Dict, Any, List
import json
import cv2
import numpy as np


def get_fixtures_dir() -> Path:
    """Get path to fixtures directory."""
    return Path(__file__).parent.parent / "fixtures"


def get_templates_dir() -> Path:
    """Get path to template fixtures."""
    return get_fixtures_dir() / "templates"


def get_images_dir() -> Path:
    """Get path to image fixtures."""
    return get_fixtures_dir() / "images"


def get_answer_keys_dir() -> Path:
    """Get path to answer key fixtures."""
    return get_fixtures_dir() / "answer_keys"


def load_test_template(template_name: str) -> Dict[str, Any]:
    """Load a test template from fixtures."""
    template_path = get_templates_dir() / f"{template_name}.json"
    
    if not template_path.exists():
        raise FileNotFoundError(f"Test template not found: {template_path}")
    
    with open(template_path) as f:
        return json.load(f)


def load_test_answer_key(key_name: str) -> Dict[int, str]:
    """Load a test answer key from fixtures."""
    key_path = get_answer_keys_dir() / f"{key_name}.json"
    
    if not key_path.exists():
        raise FileNotFoundError(f"Answer key not found: {key_path}")
    
    with open(key_path) as f:
        data = json.load(f)
        # Convert string keys to int
        return {int(k): v for k, v in data.items()}


def load_test_image(image_name: str) -> np.ndarray:
    """Load a test image from fixtures."""
    image_path = get_images_dir() / image_name
    
    if not image_path.exists():
        raise FileNotFoundError(f"Test image not found: {image_path}")
    
    image = cv2.imread(str(image_path))
    
    if image is None:
        raise ValueError(f"Failed to load image: {image_path}")
    
    return image


def list_test_images() -> List[str]:
    """List all test images in fixtures."""
    images_dir = get_images_dir()
    
    if not images_dir.exists():
        return []
    
    extensions = ["*.jpg", "*.png", "*.jpeg"]
    image_files = []
    
    for ext in extensions:
        image_files.extend([f.name for f in images_dir.glob(ext)])
    
    return sorted(image_files)


def ensure_output_dir(test_name: str) -> Path:
    """
    Create and return output directory for a test.
    
    Args:
        test_name: Name of the test (used as subdirectory name)
    
    Returns:
        Path to output directory
    """
    output_dir = Path(__file__).parent.parent.parent / "tests" / "output" / test_name
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def create_simple_answer_key(num_questions: int, pattern: str = "ABCD") -> Dict[int, str]:
    """
    Create a simple answer key with a repeating pattern.
    
    Args:
        num_questions: Number of questions
        pattern: Pattern to repeat (e.g., "ABCD")
    
    Returns:
        Answer key dict
    """
    answer_key = {}
    for i in range(1, num_questions + 1):
        answer_key[i] = pattern[(i - 1) % len(pattern)]
    return answer_key


def compare_images(img1: np.ndarray, img2: np.ndarray, 
                  threshold: float = 0.99) -> bool:
    """
    Compare two images for similarity.
    
    Args:
        img1: First image
        img2: Second image
        threshold: Similarity threshold (0-1)
    
    Returns:
        True if images are similar enough
    """
    if img1.shape != img2.shape:
        return False
    
    # Convert to grayscale if needed
    if len(img1.shape) == 3:
        img1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    if len(img2.shape) == 3:
        img2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
    
    # Calculate structural similarity
    diff = cv2.absdiff(img1, img2)
    similarity = 1.0 - (np.sum(diff) / (img1.shape[0] * img1.shape[1] * 255))
    
    return similarity >= threshold


def validate_detection_result(result: Dict[str, Any]) -> List[str]:
    """
    Validate a detection result structure.
    
    Returns:
        List of validation errors (empty if valid)
    """
    errors = []
    
    required_fields = [
        "scan_id", "template_id", "status", 
        "detections", "quality_metrics"
    ]
    
    for field in required_fields:
        if field not in result:
            errors.append(f"Missing required field: {field}")
    
    # Validate status
    valid_statuses = ["success", "needs_review", "failed"]
    if result.get("status") not in valid_statuses:
        errors.append(f"Invalid status: {result.get('status')}")
    
    # Validate detections
    if "detections" in result:
        if not isinstance(result["detections"], list):
            errors.append("detections must be a list")
        else:
            for i, detection in enumerate(result["detections"]):
                if "question_id" not in detection:
                    errors.append(f"Detection {i} missing question_id")
                if "selected" not in detection:
                    errors.append(f"Detection {i} missing selected")
                if "detection_status" not in detection:
                    errors.append(f"Detection {i} missing detection_status")
    
    return errors


def format_duration(seconds: float) -> str:
    """Format duration in human-readable format."""
    if seconds < 1:
        return f"{seconds*1000:.0f}ms"
    elif seconds < 60:
        return f"{seconds:.2f}s"
    else:
        mins = int(seconds / 60)
        secs = seconds % 60
        return f"{mins}m {secs:.0f}s"


def print_test_header(title: str):
    """Print formatted test header."""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70 + "\n")


def print_test_result(test_name: str, passed: bool, details: str = ""):
    """Print formatted test result."""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"     {details}")
