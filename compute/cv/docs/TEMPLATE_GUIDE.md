# Template System Guide - How to Create and Use Multiple Forms

## 🎯 Overview

**Yes, the system supports multiple templates/forms!** Each template defines the exact geometry (coordinates, positions) for:
- Registration marks (alignment points)
- Bubble positions for each question
- Paper size and dimensions
- Detection thresholds

When you specify a template (e.g., `template_id="form_A"`), the pipeline automatically uses those specific coordinates.

---

## 📂 Template Files Location

```
compute/cv/app/templates/
├── templates/
│   ├── form_A.json          ← Standard 20-question form
│   ├── form_B.json          ← (You can add more)
│   ├── form_C.json          ← (Custom layouts)
│   └── midterm_exam.json    ← (Any name you want)
├── loader.py                ← Loads and caches templates
└── README.md
```

---

## 🔧 How to Create a New Template

### Step 1: Measure Your Physical Form

You need to know the **exact pixel coordinates** of bubbles after the form is scanned at canonical size.

**Recommended approach:**
1. Design your form at A4 size (210mm × 297mm)
2. Set canonical size to **2100×2970 pixels** (300 DPI)
3. Measure positions using image editing software (Photoshop, GIMP, etc.)

### Step 2: Create JSON Template File

Create `app/templates/templates/your_form.json`:

```json
{
  "template_id": "midterm_exam_2024",
  "name": "Midterm Examination 2024 - 50 Questions",
  "version": "1.0.0",
  
  "canonical_size": {
    "width": 2100,
    "height": 2970
  },
  
  "registration_marks": [
    {
      "id": "top_left",
      "position": { "x": 100, "y": 100 },
      "type": "circle",
      "size": 20
    },
    {
      "id": "top_right",
      "position": { "x": 2000, "y": 100 },
      "type": "circle",
      "size": 20
    },
    {
      "id": "bottom_left",
      "position": { "x": 100, "y": 2870 },
      "type": "circle",
      "size": 20
    },
    {
      "id": "bottom_right",
      "position": { "x": 2000, "y": 2870 },
      "type": "circle",
      "size": 20
    }
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
        "A": { "x": 300, "y": 400 },
        "B": { "x": 380, "y": 400 },
        "C": { "x": 460, "y": 400 },
        "D": { "x": 540, "y": 400 }
      }
    },
    {
      "question_id": 2,
      "options": {
        "A": { "x": 300, "y": 480 },
        "B": { "x": 380, "y": 480 },
        "C": { "x": 460, "y": 480 },
        "D": { "x": 540, "y": 480 }
      }
    }
    // ... add all your questions
  ]
}
```

### Step 3: Use the New Template

```python
from app.pipeline.grade import run_detection_pipeline

result = run_detection_pipeline(
    scan_id="scan_123",
    image_path="storage/scans/midterm_001.jpg",
    template_id="midterm_exam_2024",  # ← Your new template!
    strict_quality=False
)
```

---

## 📐 Template Structure Explained

### 1. **Canonical Size**
```json
"canonical_size": {
  "width": 2100,
  "height": 2970
}
```
- The paper will be warped to this size during perspective correction
- **A4 at 300 DPI** = 2100×2970 pixels
- **Letter at 300 DPI** = 2550×3300 pixels
- All coordinates are relative to this size

### 2. **Registration Marks**
```json
"registration_marks": [
  {
    "id": "top_left",
    "position": { "x": 100, "y": 100 },
    "type": "circle",    // or "square"
    "size": 20           // radius or half-side
  }
]
```
- **Purpose:** Fine-tune alignment after perspective correction
- **Minimum:** 3 marks (4 recommended for best results)
- **Type:** "circle" or "square"
- **Position:** Where the mark CENTER should be
- **Size:** Radius for circles, half-side for squares

### 3. **Bubble Configuration**
```json
"bubble_config": {
  "radius": 12,
  "fill_threshold": 0.30,
  "ambiguous_threshold": 0.65
}
```
- **radius:** Bubble radius in pixels (ROI = 2×radius square)
- **fill_threshold:** Min ratio to consider "filled" (0.30 = 30% dark)
- **ambiguous_threshold:** If multiple bubbles > this, mark as ambiguous

### 4. **Questions**
```json
"questions": [
  {
    "question_id": 1,
    "options": {
      "A": { "x": 300, "y": 400 },
      "B": { "x": 380, "y": 400 },
      "C": { "x": 460, "y": 400 },
      "D": { "x": 540, "y": 400 }
    }
  }
]
```
- **question_id:** Unique identifier (usually 1, 2, 3, ...)
- **options:** Dict of option → position
- **x, y:** CENTER coordinates of bubble circle
- Can have any number of options (A-B-C-D, True-False, 1-5, etc.)

---

## 🎨 Design Patterns for Different Form Layouts

### Pattern 1: Single Column (20 questions)
```
Question 1:  ⚪ A  ⚪ B  ⚪ C  ⚪ D
Question 2:  ⚪ A  ⚪ B  ⚪ C  ⚪ D
Question 3:  ⚪ A  ⚪ B  ⚪ C  ⚪ D
...

Questions: x=300 (constant), y increments by 80px
Options: x increments by 80px, y=constant per question
```

### Pattern 2: Two Columns (50 questions)
```
Q1:  ⚪ A ⚪ B ⚪ C ⚪ D    Q26: ⚪ A ⚪ B ⚪ C ⚪ D
Q2:  ⚪ A ⚪ B ⚪ C ⚪ D    Q27: ⚪ A ⚪ B ⚪ C ⚪ D
...                        ...

Left column:  x_start = 300
Right column: x_start = 1200
```

### Pattern 3: True/False (50 questions)
```
Q1:  ⚪ T  ⚪ F
Q2:  ⚪ T  ⚪ F
...

Only 2 options per question
```

### Pattern 4: Likert Scale (1-5)
```
Q1:  ⚪ 1  ⚪ 2  ⚪ 3  ⚪ 4  ⚪ 5
Q2:  ⚪ 1  ⚪ 2  ⚪ 3  ⚪ 4  ⚪ 5
...

Options: "1", "2", "3", "4", "5"
```

---

## 🛠️ How to Adjust Coordinates for Existing Template

### Method 1: Manual JSON Editing

Open `app/templates/templates/form_A.json` and edit coordinates:

```json
{
  "question_id": 5,
  "options": {
    "A": { "x": 300, "y": 720 },   // ← Change these
    "B": { "x": 380, "y": 720 },
    "C": { "x": 460, "y": 720 },
    "D": { "x": 540, "y": 720 }
  }
}
```

**After editing, the pipeline will automatically use the new coordinates!**

### Method 2: Programmatic Generation

Create a script to generate templates programmatically:

```python
import json

def generate_template(num_questions, start_x, start_y, spacing):
    questions = []
    for i in range(1, num_questions + 1):
        y_pos = start_y + (i - 1) * spacing
        questions.append({
            "question_id": i,
            "options": {
                "A": {"x": start_x, "y": y_pos},
                "B": {"x": start_x + 80, "y": y_pos},
                "C": {"x": start_x + 160, "y": y_pos},
                "D": {"x": start_x + 240, "y": y_pos}
            }
        })
    
    template = {
        "template_id": "generated_form",
        "name": "Auto-generated Form",
        "version": "1.0.0",
        "canonical_size": {"width": 2100, "height": 2970},
        "registration_marks": [...],  # Add marks
        "bubble_config": {
            "radius": 12,
            "fill_threshold": 0.30,
            "ambiguous_threshold": 0.65
        },
        "questions": questions
    }
    
    with open("app/templates/templates/generated_form.json", "w") as f:
        json.dump(template, f, indent=2)

# Generate 50-question form
generate_template(50, start_x=300, start_y=400, spacing=50)
```

---

## 🔍 How to Measure Coordinates from Physical Form

### Option A: Use Image Editing Software

1. **Scan your blank form at 300 DPI**
2. **Open in GIMP/Photoshop**
3. **Check image size** (should be 2100×2970 for A4)
4. **Use crosshair cursor** to click bubble centers
5. **Read coordinates** from status bar
6. **Record in JSON**

### Option B: Use Test Scripts

We can create a helper tool to click on an image and record coordinates:

```python
# tools/template_mapper.py
import cv2
import json

coordinates = []

def click_handler(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        print(f"Clicked: ({x}, {y})")
        coordinates.append({"x": x, "y": y})

image = cv2.imread("blank_form_scan.png")
cv2.namedWindow("Click bubble centers")
cv2.setMouseCallback("Click bubble centers", click_handler)

while True:
    cv2.imshow("Click bubble centers", image)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

with open("coordinates.json", "w") as f:
    json.dump(coordinates, f, indent=2)
```

---

## 🚀 Using Templates in the Pipeline

### In Worker (scan_worker.py)

```python
# The worker receives template_id in the ScanJob
scan_job = {
    "scan_id": "uuid",
    "image_path": "scan_123.jpg",
    "template": "form_A"  # ← Template specified here
}

# Pipeline automatically loads correct template
result = run_detection_pipeline(
    scan_id=scan_job["scan_id"],
    image_path=scan_job["image_path"],
    template_id=scan_job["template"],  # ← Used here
    strict_quality=False
)
```

### In Node.js (scan.controller.ts)

```typescript
// User selects template when uploading scan
await scanService.createScan({
  userId: req.user.id,
  imagePath: uploadedFile.path,
  templateId: "midterm_exam_2024",  // ← User choice
  examId: req.body.examId
});

// This gets queued to Redis with template_id
await redisService.publishScanJob({
  scan_id: scan.id,
  image_path: scan.imagePath,
  template: "midterm_exam_2024"  // ← Sent to worker
});
```

---

## 📊 Template Validation

The system automatically validates templates using Pydantic schemas:

```python
# app/schemas/template.py validates:
- template_id is present
- canonical_size has width and height
- registration_marks have valid positions
- bubble_config has required thresholds
- questions have valid IDs and options
- all coordinates are positive integers
```

If validation fails, you'll get clear error messages!

---

## 🧪 Testing New Templates

### Step 1: Generate Test Form

```bash
python -m tests.debug.generate_test_form \
    --template your_new_template \
    --output tests/fixtures/images \
    --conditions perfect \
    --answers '{"1":"A","2":"B","3":"C"}'
```

### Step 2: Visualize Pipeline

```bash
python -m tests.debug.visualize_pipeline \
    --image tests/fixtures/images/test_perfect_your_new_template.png \
    --template your_new_template \
    --output tests/output/debug_new_template
```

### Step 3: Check Alignment

Look at `4_aligned.png` - registration marks should be detected correctly.
Look at `5_roi_extraction.png` - bubbles should be centered in rectangles.

---

## ⚙️ Configuration per Template

Each template can have **different settings**:

```json
{
  "template_id": "large_bubbles_form",
  "bubble_config": {
    "radius": 20,              // ← Larger bubbles
    "fill_threshold": 0.25,    // ← More sensitive
    "ambiguous_threshold": 0.70
  }
}
```

```json
{
  "template_id": "strict_form",
  "bubble_config": {
    "radius": 10,              // ← Smaller bubbles
    "fill_threshold": 0.35,    // ← Less sensitive
    "ambiguous_threshold": 0.60
  }
}
```

---

## 🎯 Real-World Workflow

### Scenario: School needs 3 different exam forms

**Form A (Math):** 20 multiple choice (A-D)
**Form B (Science):** 30 multiple choice (A-E, 5 options)
**Form C (Survey):** 50 True/False

**Implementation:**

1. **Create 3 template files:**
   - `form_A_math.json` (20 questions, 4 options)
   - `form_B_science.json` (30 questions, 5 options)
   - `form_C_survey.json` (50 questions, 2 options)

2. **Each with different coordinates** based on layout

3. **Users select template** when creating exam in frontend

4. **Pipeline uses correct template** for each scan

---

## 🔄 How Pipeline Uses Templates

```
┌─────────────────────────────────────────────────────┐
│  1. Worker receives: template_id = "form_A"         │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│  2. grade.py calls: load_template("form_A")         │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│  3. loader.py reads: templates/form_A.json          │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│  4. Validates with Pydantic: Template object        │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│  5. Pipeline stages use template coordinates:       │
│     • align.py → registration_marks                 │
│     • roi_extraction.py → question.options[x,y]     │
│     • fill_scoring.py → bubble_config.thresholds    │
└─────────────────────────────────────────────────────┘
```

---

## 📝 Quick Reference: Coordinate Adjustments

| What to Change | Where to Edit | Field |
|----------------|---------------|-------|
| Paper size | template.json | `canonical_size.width/height` |
| Bubble size | template.json | `bubble_config.radius` |
| Bubble position | template.json | `questions[i].options.A.x/y` |
| Registration marks | template.json | `registration_marks[i].position.x/y` |
| Fill sensitivity | template.json | `bubble_config.fill_threshold` |
| Ambiguity threshold | template.json | `bubble_config.ambiguous_threshold` |

---

## ✅ Summary

**Question:** How do I adjust positions/coordinates?
**Answer:** Edit the JSON template file or create a new one!

**Question:** Multiple templates/forms?
**Answer:** Yes! Create multiple JSON files, specify `template_id` when scanning.

**Question:** Coordinates adjust automatically?
**Answer:** Yes! Pipeline loads the specified template and uses its coordinates.

**Next Steps:**
1. Review `app/templates/templates/form_A.json` to see structure
2. Create new template JSON for your custom form
3. Test with `generate_test_form.py` and `visualize_pipeline.py`
4. Update Node.js to let users select templates

---

**The system is fully template-driven and supports unlimited form layouts!** 🎉
