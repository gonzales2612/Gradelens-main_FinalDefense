# Templates Directory

This directory contains template definitions (JSON files) that define the physical layout of exam forms.

## Structure

Each template is a JSON file named `{template_id}.json`, for example:
- `form_A.json`
- `midterm_v2.json`
- `exam_short.json`

## Usage

```python
from app.templates.loader import load_template

# Load a template
template = load_template("form_A")

# Access properties
print(f"Questions: {len(template.questions)}")
print(f"Bubble radius: {template.bubble_config.radius}px")
```

## Creating a New Template

1. **Design the physical form** (or use existing printed form)
2. **Scan at high resolution** (300+ DPI recommended)
3. **Measure bubble coordinates** using the debug visualization tools
4. **Create JSON file** following the schema (see `domain/schemas/template.schema.json`)
5. **Validate** by loading it in Python
6. **Test** with real scans

## Example Minimal Template

```json
{
  "template_id": "simple_test",
  "name": "Simple 5-Question Test",
  "canonical_size": {"width": 2100, "height": 2970},
  "registration_marks": [
    {"id": "top_left", "position": {"x": 100, "y": 100}, "type": "circle"}
  ],
  "bubble_config": {
    "radius": 12,
    "fill_threshold": 0.30,
    "ambiguous_threshold": 0.65
  },
  "questions": [
    {
      "question_id": 1,
      "options": {
        "A": {"x": 300, "y": 400},
        "B": {"x": 380, "y": 400}
      }
    }
  ]
}
```

## Coordinate System

- **Origin**: Top-left corner (0, 0)
- **X-axis**: Left to right
- **Y-axis**: Top to bottom
- **Units**: Pixels in canonical space (after perspective correction)

## Best Practices

1. **Use 4 registration marks** in corners for best alignment
2. **Maintain consistent spacing** between bubbles (minimum 20px)
3. **Test with multiple printers** (scaling can vary)
4. **Calibrate thresholds** with real student marks, not perfect test fills
5. **Version your templates** when making layout changes

## Debugging

Use the visualization tools in `compute/cv/tests/debug/` to:
- See detected bubble positions
- Verify alignment accuracy
- Tune threshold values
