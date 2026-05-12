"""
Test Form Generator

Generates synthetic exam forms with various conditions for testing the pipeline.
This allows comprehensive testing without needing real scans.

Usage:
    python -m tests.debug.generate_test_form --template form_A --output <dir> --conditions <conditions>

Example:
    python -m tests.debug.generate_test_form
        --template form_A
        --output tests/fixtures/images
        --conditions perfect,blurry,skewed,dark

    /

    # Generate with random answers and save answer key
    python -m tests.debug.generate_test_form
    --template form_A
    --output tests/fixtures/images
    --conditions perfect
    --random-answers --seed 42
    --save-answer-key tests/fixtures/answer_keys/answers_form_A.json

    /

    # Generate using existing answer key file
    python -m tests.debug.generate_test_form
    --template form_60q
    --output tests/fixtures/images
    --conditions perfect
    --load-answer-key
    tests/fixtures/answer_keys/form_60q_answers.json

"""
import argparse
import sys
import random
from pathlib import Path
from typing import List, Dict, Tuple
import cv2
import numpy as np
from loguru import logger

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.templates.loader import load_template
from app.schemas.template import Template


class TestFormGenerator:
    """Generates synthetic test forms with various conditions."""
    
    def __init__(self, template_id: str, output_dir: str):
        self.template_id = template_id
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.template = load_template(template_id)
        
    def generate_all_conditions(self, answers: Dict[int, str] = None) -> List[Path]:
        """Generate forms with all standard test conditions."""
        conditions = [
            "perfect",
            "slight_skew",
            "moderate_skew",
            "heavy_skew",
            "slight_blur",
            "heavy_blur",
            "low_contrast",
            "dark",
            "bright",
            "noisy",
            "shadow",
            "perspective_top",
            "perspective_bottom",
            "light_marks",
            "multiple_marks",
            "erased_marks"
        ]
        
        generated = []
        for condition in conditions:
            logger.info(f"Generating: {condition}")
            path = self.generate_form(condition, answers)
            generated.append(path)
        
        return generated
    
    def generate_form(self, condition: str, answers: Dict[int, str] = None) -> Path:
        """
        Generate a single form with specified condition.
        
        Args:
            condition: Type of degradation/variation
            answers: Dict mapping question_id to option (e.g., {1: 'A', 2: 'B'})
        """
        # Create blank form
        form = self._create_blank_form()
        
        # Add registration marks
        form = self._add_registration_marks(form)
        
        # Add question numbers and bubbles
        form = self._add_questions_and_bubbles(form)
        
        # Fill answers if provided
        if answers:
            form = self._fill_answers(form, answers, condition)
        
        # Apply degradation/transformation
        form = self._apply_condition(form, condition)
        
        # Save
        filename = f"test_{condition}_{self.template_id}.png"
        output_path = self.output_dir / filename
        cv2.imwrite(str(output_path), form)
        
        logger.info(f"  Saved: {filename}")
        return output_path
    
    def _create_blank_form(self) -> np.ndarray:
        """Create blank white form at canonical size."""
        width = self.template.canonical_size.width
        height = self.template.canonical_size.height
        
        # Create white background
        form = np.ones((height, width), dtype=np.uint8) * 255
        
        # Don't draw border - it interferes with corner registration marks
        # If border is needed, it should be drawn AFTER marks or much further in
        
        # Render header fields if present
        if hasattr(self.template, 'header_fields') and self.template.header_fields:
            form = self._add_header_fields(form)
        else:
            # Fallback: Add simple header for templates without header_fields
            cv2.putText(form, "SAMPLE EXAM FORM", (width // 2 - 200, 150),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, 0, 2)
        
        return form
    
    def _add_header_fields(self, form: np.ndarray) -> np.ndarray:
        """Render header fields (title, subtitle, text fields) from template."""
        for field in self.template.header_fields:
            x, y = field.position.x, field.position.y
            
            if field.type == "title":
                # Large centered title
                font_size = field.font_size if hasattr(field, 'font_size') and field.font_size else 2.0
                thickness = 3 if field.font_weight == "bold" else 2
                text_size = cv2.getTextSize(field.label, cv2.FONT_HERSHEY_SIMPLEX, font_size, thickness)[0]
                text_x = x - text_size[0] // 2
                cv2.putText(form, field.label, (text_x, y),
                           cv2.FONT_HERSHEY_SIMPLEX, font_size, 0, thickness)
            
            elif field.type == "subtitle":
                # Small centered subtitle
                font_size = field.font_size if hasattr(field, 'font_size') and field.font_size else 0.7
                text_size = cv2.getTextSize(field.label, cv2.FONT_HERSHEY_SIMPLEX, font_size, 1)[0]
                text_x = x - text_size[0] // 2
                cv2.putText(form, field.label, (text_x, y),
                           cv2.FONT_HERSHEY_SIMPLEX, font_size, 0, 1)
            
            elif field.type == "text_field":
                # Input field with label and box
                label_width = cv2.getTextSize(field.label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)[0][0]
                
                # Draw label
                cv2.putText(form, field.label, (x, y + 25),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, 0, 1)
                
                # Draw input box
                box_x = x + label_width + 15
                box_width = field.width - label_width - 20 if hasattr(field, 'width') and field.width else 400
                box_height = field.height if hasattr(field, 'height') and field.height else 40
                
                cv2.rectangle(form, 
                             (box_x, y), 
                             (box_x + box_width, y + box_height),
                             0, 2)
        
        return form
    
    def _add_registration_marks(self, form: np.ndarray) -> np.ndarray:
        """
        Draw registration marks at exact positions specified in template.
        
        The template coordinates represent the CENTER of each mark.
        For squares, we draw them centered at (x, y) with the specified size.
        """
        for mark in self.template.registration_marks:
            x, y = mark.position.x, mark.position.y
            
            if mark.type == "circle":
                # Filled black circle centered at (x, y)
                cv2.circle(form, (x, y), mark.size, 0, -1)
                
            elif mark.type == "square":
                # Calculate square bounds centered at (x, y)
                half = mark.size // 2
                x1, y1 = x - half, y - half
                x2, y2 = x + half, y + half
                
                # Draw filled black square (no border to avoid detection issues)
                cv2.rectangle(form, (x1, y1), (x2, y2), 0, -1)
        
        return form
    
    def _add_questions_and_bubbles(self, form: np.ndarray) -> np.ndarray:
        """Draw question numbers and bubble outlines."""
        radius = self.template.bubble_config.radius
        
        for question in self.template.questions:
            # options is Dict[str, Position]
            first_key, first_pos = next(iter(question.options.items()))
            qnum_x = first_pos.x - 60
            qnum_y = first_pos.y + 5
            
            cv2.putText(form, str(question.question_id), 
                       (qnum_x, qnum_y),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, 0, 1)
            
            # Draw bubble circles for each option
            for option_id, pos in question.options.items():
                # Outer circle
                cv2.circle(form, (pos.x, pos.y), radius, 0, 2)
                
                # Option label above bubble
                label_x = pos.x - 8
                label_y = pos.y - radius - 10
                cv2.putText(form, option_id,
                           (label_x, label_y),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, 0, 1)
        
        return form
    
    def _fill_answers(self, form: np.ndarray, answers: Dict[int, str], 
                     condition: str) -> np.ndarray:
        """
        Fill bubbles according to answers.
        
        Args:
            answers: Dict mapping question_id to option_id
            condition: Affects how marks are drawn
        """
        radius = self.template.bubble_config.radius
        
        for question_id, option_id in answers.items():
            # Find the question and option
            question = next((q for q in self.template.questions 
                           if q.question_id == question_id), None)
            if not question:
                continue
            
            pos = question.options.get(option_id)
            if not pos:
                continue
            
            # Fill based on condition
            if "light_marks" in condition:
                # Light fill (60% darkness)
                self._draw_bubble_fill(form, pos.x, pos.y, radius, 
                                      intensity=0.6)
            elif "multiple_marks" in condition:
                # Fill correct answer normally
                self._draw_bubble_fill(form, pos.x, pos.y, radius)
                # Also lightly mark another option
                other_options = [p for k, p in question.options.items() if k != option_id]
                if other_options:
                    other = other_options[0]
                    self._draw_bubble_fill(form, other.x, other.y, radius, 
                                          intensity=0.4)
            elif "erased_marks" in condition:
                # Draw fill with some white patches
                self._draw_bubble_fill(form, pos.x, pos.y, radius)
                # Add eraser marks
                for _ in range(3):
                    ex = pos.x + np.random.randint(-radius//2, radius//2)
                    ey = pos.y + np.random.randint(-radius//2, radius//2)
                    cv2.circle(form, (ex, ey), radius//3, 255, -1)
            else:
                # Normal fill
                self._draw_bubble_fill(form, pos.x, pos.y, radius)
        
        return form
    
    def _draw_bubble_fill(self, form: np.ndarray, x: int, y: int, 
                         radius: int, intensity: float = 1.0):
        """Draw a filled bubble with specified darkness."""
        # Create filled circle with intensity
        color = int(255 * (1 - intensity))  # 0=black, 255=white
        cv2.circle(form, (x, y), radius - 3, color, -1)
    
    def _apply_condition(self, form: np.ndarray, condition: str) -> np.ndarray:
        """Apply degradation/transformation based on condition."""
        
        if condition == "perfect":
            return form
        
        elif "skew" in condition:
            angle = {
                "slight_skew": 3,
                "moderate_skew": 8,
                "heavy_skew": 15
            }.get(condition, 5)
            return self._apply_rotation(form, angle)
        
        elif "blur" in condition:
            kernel_size = {
                "slight_blur": 5,
                "heavy_blur": 15
            }.get(condition, 7)
            return cv2.GaussianBlur(form, (kernel_size, kernel_size), 0)
        
        elif condition == "low_contrast":
            # Reduce contrast
            return cv2.convertScaleAbs(form, alpha=0.5, beta=128)
        
        elif condition == "dark":
            # Make darker
            return cv2.convertScaleAbs(form, alpha=1.0, beta=-60)
        
        elif condition == "bright":
            # Make brighter
            return cv2.convertScaleAbs(form, alpha=1.0, beta=40)
        
        elif condition == "noisy":
            # Add Gaussian noise
            noise = np.random.normal(0, 15, form.shape).astype(np.int16)
            noisy = np.clip(form.astype(np.int16) + noise, 0, 255)
            return noisy.astype(np.uint8)
        
        elif condition == "shadow":
            # Add gradient shadow
            shadow = self._create_shadow_gradient(form.shape)
            return cv2.addWeighted(form, 0.7, shadow, 0.3, 0)
        
        elif "perspective" in condition:
            if condition == "perspective_top":
                return self._apply_perspective(form, "top")
            elif condition == "perspective_bottom":
                return self._apply_perspective(form, "bottom")
        
        return form
    
    def _apply_rotation(self, image: np.ndarray, angle: float) -> np.ndarray:
        """Rotate image by angle."""
        h, w = image.shape[:2]
        center = (w // 2, h // 2)
        
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(image, M, (w, h), 
                                 borderMode=cv2.BORDER_CONSTANT,
                                 borderValue=255)
        return rotated
    
    def _create_shadow_gradient(self, shape: Tuple[int, int]) -> np.ndarray:
        """Create a shadow gradient image."""
        h, w = shape
        gradient = np.zeros((h, w), dtype=np.uint8)
        
        for y in range(h):
            intensity = int(100 + (155 * y / h))
            gradient[y, :] = intensity
        
        return gradient
    
    def _apply_perspective(self, image: np.ndarray, direction: str) -> np.ndarray:
        """Apply perspective transformation."""
        h, w = image.shape[:2]
        
        # Define source points (corners of image)
        src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
        
        # Define destination points (perspective distortion)
        if direction == "top":
            # Top edge narrower (viewing from below)
            offset = 150
            dst = np.float32([
                [offset, 0],
                [w - offset, 0],
                [w, h],
                [0, h]
            ])
        else:  # bottom
            # Bottom edge narrower (viewing from above)
            offset = 150
            dst = np.float32([
                [0, 0],
                [w, 0],
                [w - offset, h],
                [offset, h]
            ])
        
        M = cv2.getPerspectiveTransform(src, dst)
        warped = cv2.warpPerspective(image, M, (w, h),
                                     borderMode=cv2.BORDER_CONSTANT,
                                     borderValue=255)
        return warped


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Generate synthetic test forms")
    parser.add_argument("--template", required=True, help="Template ID (e.g., form_A)")
    parser.add_argument("--output", required=True, help="Output directory")
    parser.add_argument("--conditions", default="all", 
                       help="Comma-separated conditions or 'all' (default: all)")
    parser.add_argument("--answers", help="Answer key as JSON, e.g., '{\"1\":\"A\",\"2\":\"B\"}'")
    parser.add_argument("--load-answer-key", help="Path to load answer key JSON file")
    parser.add_argument("--random-answers", action="store_true", 
                        help="Fill a random answer for each question")
    parser.add_argument("--seed", type=int, help="Random seed for reproducibility")
    parser.add_argument("--save-answer-key", help="Path to save generated answer key JSON")
    
    args = parser.parse_args()
    
    # Configure logging
    logger.remove()
    logger.add(sys.stderr, level="INFO")
    
    # Parse answers if provided
    answers = None
    import json
    
    # Load from file if specified
    if args.load_answer_key:
        try:
            with open(args.load_answer_key, "r", encoding="utf-8") as f:
                answers = json.load(f)
                # Convert string keys to int
                answers = {int(k): v for k, v in answers.items()}
                logger.info(f"Loaded answer key from: {args.load_answer_key}")
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logger.error(f"Failed to load answer key: {e}")
            sys.exit(1)
    # Or parse from command line argument
    elif args.answers:
        try:
            answers = json.loads(args.answers)
            # Convert string keys to int
            answers = {int(k): v for k, v in answers.items()}
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse answers JSON: {e}")
            logger.error(f"Received: {args.answers}")
            logger.info("Tip: In PowerShell, use double quotes and escape inner quotes:")
            logger.info('  --answers \'{"1":"A","2":"B"}\'')
            sys.exit(1)
    
    # Initialize generator to access template
    generator = TestFormGenerator(args.template, args.output)
    
    # Generate random answers if requested and not provided explicitly
    if args.random_answers and not answers:
        if args.seed is not None:
            random.seed(args.seed)
        # Build a random answer for each question from available option keys
        answers = {}
        for q in generator.template.questions:
            opts = list(q.options.keys())
            if not opts:
                continue
            answers[q.question_id] = random.choice(opts)
        logger.info(f"Generated random answers for {len(answers)} questions")
        # Optionally save the generated answer key
        if args.save_answer_key:
            import json
            out_path = Path(args.save_answer_key)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump({str(k): v for k, v in answers.items()}, f, indent=2)
            logger.info(f"Saved answer key to: {out_path}")
    
    if args.conditions == "all":
        logger.info("Generating all test conditions...")
        generated = generator.generate_all_conditions(answers)
        logger.success(f"✅ Generated {len(generated)} test forms")
    else:
        conditions = args.conditions.split(",")
        logger.info(f"Generating {len(conditions)} conditions...")
        generated = []
        for condition in conditions:
            path = generator.generate_form(condition.strip(), answers)
            generated.append(path)
        logger.success(f"✅ Generated {len(generated)} test forms")
    
    logger.info(f"Output directory: {args.output}")


if __name__ == "__main__":
    main()
