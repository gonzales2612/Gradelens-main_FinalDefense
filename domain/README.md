# Domain Schemas

This directory contains language-agnostic schema definitions that establish contracts between the system layers.

## Philosophy

**Separation of Concerns:**
- **Python CV Layer** outputs **detection results** (facts)
- **Node.js Business Layer** applies **grading logic** (decisions)
- Schemas enforce clean boundaries and prevent responsibility leakage

## Schema Overview

### 1. `template.schema.json`
**Purpose:** Defines the physical layout of an exam form  
**Owner:** System Administrator / Template Designer  
**Used By:** Python CV pipeline  

**Key Concepts:**
- **Canonical Size:** Standard dimensions after perspective correction (e.g., 2100×2970px for A4@300dpi)
- **Registration Marks:** 3-4 alignment markers (corners) for fine-tuning perspective
- **Bubble Config:** Global settings (radius, thresholds)
- **Questions:** Per-question bubble coordinates in template space

**Example:**
```json
{
  "template_id": "form_A",
  "canonical_size": {"width": 2100, "height": 2970},
  "registration_marks": [
    {"id": "top_left", "position": {"x": 100, "y": 100}, "type": "circle", "size": 20}
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
        "B": {"x": 380, "y": 400},
        "C": {"x": 460, "y": 400},
        "D": {"x": 540, "y": 400}
      }
    }
  ]
}
```

---

### 2. `answer_key.schema.json`
**Purpose:** Defines correct answers for an exam instance  
**Owner:** Teacher / Exam Creator  
**Used By:** Node.js grading logic  

**Key Concepts:**
- Links to a specific `template_id`
- Stores correct answers and point values
- Includes grading policy (penalties, partial credit, review rules)

**Example:**
```json
{
  "exam_id": "math_midterm_2026",
  "template_id": "form_A",
  "answers": [
    {"question_id": 1, "correct": "B", "points": 2},
    {"question_id": 2, "correct": "D", "points": 2}
  ],
  "grading_policy": {
    "partial_credit": false,
    "penalty_incorrect": 0,
    "require_manual_review_on_ambiguity": true
  }
}
```

---

### 3. `detection_result.schema.json`
**Purpose:** Raw output from Python CV pipeline  
**Owner:** Python CV Worker  
**Consumed By:** Node.js Business Logic Layer  

**CRITICAL:** This schema contains **FACTS ONLY** - no grading decisions.

**What it includes:**
- Per-question fill ratios (0.0 = empty, 1.0 = fully filled)
- Detected answer(s) based on fill threshold
- Detection status (answered/unanswered/ambiguous/error)
- Image quality metrics (blur, brightness, skew)
- Warnings and errors

**What it does NOT include:**
- Whether the answer is correct
- Point scores
- Pass/fail status

**Example:**
```json
{
  "scan_id": "scan_abc123",
  "template_id": "form_A",
  "status": "success",
  "detections": [
    {
      "question_id": 1,
      "fill_ratios": {"A": 0.05, "B": 0.82, "C": 0.04, "D": 0.03},
      "selected": ["B"],
      "detection_status": "answered",
      "confidence": 0.77
    },
    {
      "question_id": 2,
      "fill_ratios": {"A": 0.68, "B": 0.71, "C": 0.05, "D": 0.06},
      "selected": ["A", "B"],
      "detection_status": "ambiguous",
      "confidence": 0.03
    }
  ],
  "quality_metrics": {
    "blur_score": 312.4,
    "brightness_mean": 198.5,
    "skew_angle": 1.2
  },
  "warnings": [
    {"code": "MULTIPLE_AMBIGUOUS", "message": "2 questions have ambiguous marks"}
  ]
}
```

---

### 4. `grading_result.schema.json`
**Purpose:** Business logic output after comparing detection to answer key  
**Owner:** Node.js Grading Service  
**Consumed By:** Frontend, Database, Reporting  

**What it includes:**
- Correctness determination (is_correct)
- Points earned vs possible
- Overall score summary
- Manual review flags

**Example:**
```json
{
  "scan_id": "scan_abc123",
  "exam_id": "math_midterm_2026",
  "status": "needs_review",
  "grades": [
    {
      "question_id": 1,
      "detected": ["B"],
      "correct_answer": "B",
      "is_correct": true,
      "points_earned": 2,
      "points_possible": 2,
      "requires_review": false
    },
    {
      "question_id": 2,
      "detected": ["A", "B"],
      "correct_answer": "D",
      "is_correct": null,
      "points_earned": 0,
      "points_possible": 2,
      "requires_review": true,
      "review_reason": "ambiguous"
    }
  ],
  "score": {
    "points_earned": 2,
    "points_possible": 4,
    "percentage": 50.0,
    "correct_count": 1,
    "ambiguous_count": 1
  },
  "needs_manual_review": true
}
```

---

## Data Flow

```
┌─────────────────┐
│  Arduino/User   │
│  Uploads Image  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│     Node.js Ingress Layer       │
│  • Generate scan_id             │
│  • Store image                  │
│  • Queue job to Redis           │
└────────┬────────────────────────┘
         │ {scan_id, image_path, template_id}
         ▼
┌─────────────────────────────────┐
│       Redis Buffer Queue        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│    Python CV Worker             │
│  • Load template.json           │
│  • Preprocess image             │
│  • Detect paper & correct       │
│  • Extract bubble ROIs          │
│  • Score fill ratios            │
│  • Produce detection_result     │
└────────┬────────────────────────┘
         │ detection_result.json
         ▼
┌─────────────────────────────────┐
│  Node.js Business Logic Layer   │
│  • Load answer_key.json         │
│  • Compare detected vs correct  │
│  • Apply grading policy         │
│  • Produce grading_result       │
│  • Update MongoDB               │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   MongoDB (Persistence)         │
│  • Scan record                  │
│  • Detection results            │
│  • Grading results              │
│  • Audit logs                   │
└─────────────────────────────────┘
```

---

## Schema Validation

### Python (Pydantic)
```python
from pydantic import BaseModel
from app.schemas.template import Template
from app.schemas.detection_result import DetectionResult

# Load and validate
template = Template.parse_file("templates/form_A.json")
result = DetectionResult(scan_id="...", template_id="...", ...)
```

### TypeScript (Zod / JSON Schema)
```typescript
import { Template, AnswerKey, GradingResult } from '@/types/domain';

// Type-safe usage
const answerKey: AnswerKey = { exam_id: "...", template_id: "...", ... };
```

---

## Template Creation Workflow

1. **Design physical form** (print or generate PDF)
2. **Scan template at high resolution** (300+ dpi)
3. **Measure bubble coordinates** (use debug tools)
4. **Create template.json** (validate against schema)
5. **Test with sample scans** (verify alignment)
6. **Deploy to production**

---

## Best Practices

### Template Design
- Use **high-contrast** registration marks (solid black circles)
- Place marks in **corners** (not center) for best perspective correction
- Ensure **consistent spacing** between bubbles (minimum 20px)
- Avoid **decorative elements** near bubble regions
- Test with **multiple printers** (scaling varies)

### Threshold Tuning
- **fill_threshold (default: 0.30)**: Lower = more sensitive to light marks
- **ambiguous_threshold (default: 0.65)**: Higher = more tolerant of stray marks
- Calibrate with **real student scans**, not perfect test images

### Error Handling
- **Low blur_score** → Reject immediately, don't attempt grading
- **Paper not detected** → Flag for manual upload/review
- **Multiple ambiguous** → Require teacher review
- **Template mismatch** → Fail fast, log error

---

## Future Extensions

- **Multi-page support** (template sequences)
- **Free-response regions** (OCR integration)
- **Student ID bubbles** (automatic roster matching)
- **Version tolerance** (minor template updates without breaking)

---

## Questions?

For implementation details, see:
- Python: `compute/cv/app/schemas/`
- TypeScript: `application/api/src/types/`
- Models: `application/api/src/models/`
