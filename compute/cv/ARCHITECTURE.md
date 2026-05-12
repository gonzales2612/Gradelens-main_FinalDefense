# GradeLens Compute Layer Architecture

## 🏗️ System Overview

The compute layer is a Python-based microservice responsible for Computer Vision (CV) operations in the GradeLens OMR (Optical Mark Recognition) system.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         COMPUTE LAYER (Python)                          │
│                                                                         │
│  ┌───────────────┐         ┌────────────────────────────────────┐     │
│  │  Redis Queue  │────────▶│        scan_worker.py              │     │
│  │  (scan_jobs)  │         │  • Queue consumer                  │     │
│  └───────────────┘         │  • Job orchestration               │     │
│                            │  • Error handling                  │     │
│                            └────────────┬───────────────────────┘     │
│                                         │ calls                       │
│                                         ▼                             │
│                            ┌────────────────────────────────────┐     │
│                            │         grade.py                   │     │
│                            │  • Pipeline orchestrator           │     │
│                            │  • Stage coordination              │     │
│                            │  • Result assembly                 │     │
│                            └────────────┬───────────────────────┘     │
│                                         │ coordinates                 │
│                                         ▼                             │
│                        ┌────────────────────────────┐                 │
│                        │    7-STAGE PIPELINE        │                 │
│                        └────────────────────────────┘                 │
│                                                                         │
│  Stage 1: preprocess.py        ──▶  Quality validation                │
│  Stage 2: paper_detection.py   ──▶  Find paper boundary               │
│  Stage 3: perspective.py        ──▶  Warp to canonical size           │
│  Stage 4: align.py              ──▶  Registration mark alignment      │
│  Stage 5: roi_extraction.py    ──▶  Extract bubble regions            │
│  Stage 6: fill_scoring.py      ──▶  Measure fill ratios               │
│  Stage 7: Result assembly       ──▶  Generate DetectionResult         │
│                                                                         │
│  ┌───────────────┐                                                     │
│  │  Redis Queue  │◀────────────────────────────────────────────────   │
│  │(scan_results) │         DetectionResult (JSON)                      │
│  └───────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Directory Structure

```
compute/cv/
├── app/
│   ├── pipeline/           # Core CV pipeline stages
│   ├── workers/            # Redis queue consumers
│   ├── schemas/            # Pydantic data models
│   ├── templates/          # Template definitions & loader
│   ├── utils/              # Utility functions
│   └── api/                # FastAPI endpoints (health)
│
├── tests/                  # Test infrastructure
│   ├── debug/              # Debug & visualization tools
│   ├── fixtures/           # Test data
│   └── utils/              # Test helpers
│
├── main.py                 # FastAPI application entry
├── requirements.txt        # Dependencies
└── Dockerfile              # Container definition
```

---

## 🔄 Data Flow Diagram

```
                        ┌─────────────────────┐
                        │   Node.js (API)     │
                        │  scan.controller.ts │
                        └──────────┬──────────┘
                                   │
                                   │ publishes ScanJob
                                   ▼
                        ┌─────────────────────┐
                        │   Redis (Buffer)    │
                        │   Queue: scan_jobs  │
                        └──────────┬──────────┘
                                   │
                                   │ BLPOP (blocking)
                                   ▼
                        ┌─────────────────────┐
                        │   scan_worker.py    │
                        │   • Parse ScanJob   │
                        │   • Call pipeline   │
                        └──────────┬──────────┘
                                   │
                                   │ run_detection_pipeline()
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          PIPELINE STAGES                             │
│                                                                      │
│  1. preprocess.py                                                    │
│     ├─ Load image                                                    │
│     ├─ Calculate blur score (Laplacian)                             │
│     ├─ Calculate brightness stats                                   │
│     ├─ Calculate skew angle                                         │
│     ├─ Apply CLAHE enhancement                                      │
│     └─ Return (image, quality_metrics)                              │
│                                                                      │
│  2. paper_detection.py                                               │
│     ├─ Canny edge detection                                         │
│     ├─ Find contours                                                │
│     ├─ Identify largest quadrilateral                               │
│     ├─ Validate paper boundary                                      │
│     └─ Return boundary points                                        │
│                                                                      │
│  3. perspective.py                                                   │
│     ├─ Order corner points (TL, TR, BR, BL)                         │
│     ├─ Calculate transformation matrix                              │
│     ├─ Warp to canonical size (2100x2970)                           │
│     ├─ Validate perspective quality                                 │
│     └─ Return corrected image                                        │
│                                                                      │
│  4. align.py                                                         │
│     ├─ Load template registration marks                             │
│     ├─ Detect circles/squares in search regions                     │
│     ├─ Match detected marks to template                             │
│     ├─ Calculate affine transform                                   │
│     ├─ Apply alignment correction                                   │
│     └─ Return aligned image                                          │
│                                                                      │
│  5. roi_extraction.py                                                │
│     ├─ For each question in template:                               │
│     │  ├─ For each option (A, B, C, D):                            │
│     │  │  ├─ Get bubble coordinates                                │
│     │  │  ├─ Extract square ROI                                    │
│     │  │  ├─ Create circular mask                                  │
│     │  │  └─ Validate ROI quality                                  │
│     └─ Return bubbles dict                                           │
│                                                                      │
│  6. fill_scoring.py                                                  │
│     ├─ For each bubble ROI:                                         │
│     │  ├─ Apply adaptive threshold                                 │
│     │  ├─ Apply circular mask                                      │
│     │  ├─ Count dark pixels                                        │
│     │  ├─ Calculate fill_ratio                                     │
│     │  └─ Store ratio by option                                    │
│     ├─ Determine selected answer:                                   │
│     │  ├─ If max < 0.30 → unanswered                              │
│     │  ├─ If multiple > 0.65 → ambiguous                          │
│     │  └─ Else → answered (highest ratio)                          │
│     └─ Return detections list                                        │
│                                                                      │
│  7. Result Assembly (grade.py)                                       │
│     ├─ Collect all detections                                       │
│     ├─ Aggregate quality metrics                                    │
│     ├─ Collect warnings & errors                                    │
│     ├─ Determine overall status                                     │
│     └─ Create DetectionResult                                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ DetectionResult object
                                   ▼
                        ┌─────────────────────┐
                        │   scan_worker.py    │
                        │   • Serialize JSON  │
                        │   • Push to queue   │
                        └──────────┬──────────┘
                                   │
                                   │ RPUSH
                                   ▼
                        ┌─────────────────────┐
                        │   Redis (Buffer)    │
                        │ Queue: scan_results │
                        └──────────┬──────────┘
                                   │
                                   │ consumed by
                                   ▼
                        ┌─────────────────────┐
                        │   Node.js (API)     │
                        │   scan.service.ts   │
                        │   • Apply grading   │
                        │   • Save to MongoDB │
                        └─────────────────────┘
```

---

## 🧩 Module Dependencies

```
scan_worker.py
    │
    ├─▶ redis (library)
    ├─▶ schemas/scan_job.py
    ├─▶ schemas/detection_result.py
    └─▶ pipeline/grade.py
            │
            ├─▶ templates/loader.py
            │       └─▶ schemas/template.py
            │
            ├─▶ pipeline/preprocess.py
            │       ├─▶ utils/image_utils.py
            │       └─▶ cv2, numpy
            │
            ├─▶ pipeline/paper_detection.py
            │       ├─▶ utils/contour_utils.py
            │       ├─▶ utils/image_utils.py
            │       └─▶ cv2, numpy
            │
            ├─▶ pipeline/perspective.py
            │       ├─▶ utils/image_utils.py
            │       └─▶ cv2, numpy
            │
            ├─▶ pipeline/align.py
            │       ├─▶ utils/contour_utils.py
            │       ├─▶ utils/image_utils.py
            │       └─▶ cv2, numpy
            │
            ├─▶ pipeline/roi_extraction.py
            │       ├─▶ utils/image_utils.py
            │       └─▶ cv2, numpy
            │
            └─▶ pipeline/fill_scoring.py
                    ├─▶ utils/image_utils.py
                    └─▶ cv2, numpy
```

---

## 📦 Module Purposes

### 🔴 Core Workers

#### `app/workers/scan_worker.py`
**Purpose:** Redis queue consumer and job orchestrator
```
┌─────────────────────────────────────┐
│       scan_worker.py                │
│                                     │
│  • Blocks on scan_jobs queue       │
│  • Parses ScanJob payload          │
│  • Calls run_detection_pipeline()  │
│  • Handles errors gracefully       │
│  • Pushes DetectionResult to queue │
│  • Loops forever                   │
└─────────────────────────────────────┘
```
**Key Functions:**
- `run_worker()` - Main loop with error handling
- Deserializes `ScanJob` from JSON
- Serializes `DetectionResult` to JSON

---

### 🟢 Pipeline Orchestration

#### `app/pipeline/grade.py`
**Purpose:** Coordinates all pipeline stages
```
┌──────────────────────────────────────────────┐
│            grade.py                          │
│                                              │
│  run_detection_pipeline()                   │
│    ├─ Load template                         │
│    ├─ Stage 1: Preprocess                   │
│    ├─ Stage 2: Paper detection              │
│    ├─ Stage 3: Perspective correction       │
│    ├─ Stage 4: Alignment                    │
│    ├─ Stage 5: ROI extraction               │
│    ├─ Stage 6: Fill scoring                 │
│    └─ Stage 7: Result assembly              │
│                                              │
│  • Try-catch at each stage                  │
│  • Collects warnings (non-critical)         │
│  • Collects errors (critical)               │
│  • Fail-fast on critical errors             │
│  • Returns DetectionResult                  │
└──────────────────────────────────────────────┘
```
**Key Functions:**
- `run_detection_pipeline()` - Main orchestrator
- Error aggregation and status determination

---

### 🔵 Pipeline Stages

#### `app/pipeline/preprocess.py`
**Purpose:** Image quality validation and normalization
```
Input:  Image path
Output: (preprocessed_image, quality_metrics)

Steps:
  1. Load image (cv2.imread)
  2. Calculate blur score (Laplacian variance)
  3. Calculate brightness stats (mean, std)
  4. Estimate skew angle (Hough lines)
  5. Apply CLAHE contrast enhancement
  6. Apply Gaussian blur (denoise)
  7. Validate quality thresholds
```
**Thresholds:**
- Blur: > 100 acceptable, > 300 sharp
- Brightness: 50-230 range
- Skew: < 10° acceptable

---

#### `app/pipeline/paper_detection.py`
**Purpose:** Detect paper boundaries in image
```
Input:  Preprocessed image
Output: Boundary points (4 corners)

Steps:
  1. Canny edge detection
  2. Find external contours
  3. Identify largest quadrilateral
  4. Validate area ratio (25%-95%)
  5. Fallback to full image if needed
```
**Fallback Strategy:**
- No quadrilateral → use largest contour
- No valid contour → use entire image

---

#### `app/pipeline/perspective.py`
**Purpose:** Warp paper to rectangular canonical size
```
Input:  Image, boundary points, target size
Output: Corrected image

Steps:
  1. Order corner points (TL, TR, BR, BL)
  2. Calculate destination rectangle
  3. Compute perspective transform matrix
  4. Apply warpPerspective
  5. Validate rectangularity
```
**Canonical Size:** 2100×2970px (A4 at 300 DPI)

---

#### `app/pipeline/align.py`
**Purpose:** Fine-tune alignment using registration marks
```
Input:  Corrected image, template
Output: Aligned image

Steps:
  1. Load template registration marks
  2. Search for circles/squares in ROIs
  3. Match detected to expected positions
  4. Calculate affine transform (≥3 marks)
  5. Apply transform if successful
  6. Fallback to no alignment if <3 marks
```
**Search Strategy:**
- ±50px radius around expected position
- Hough circles for circle marks
- Contour matching for square marks

---

#### `app/pipeline/roi_extraction.py`
**Purpose:** Extract bubble regions from aligned image
```
Input:  Aligned image, template
Output: Bubbles dict {question_id: {option: {roi, position}}}

Steps:
  1. For each question in template:
  2.   For each option (A, B, C, D):
  3.     Get bubble center (x, y)
  4.     Extract square ROI (2×radius)
  5.     Create circular mask
  6.     Validate ROI (not empty, in bounds)
  7.     Store in nested dict
```
**Safety:**
- Bounds checking
- Empty ROI detection
- Quality validation

---

#### `app/pipeline/fill_scoring.py`
**Purpose:** Measure bubble fill ratios and determine answers
```
Input:  Bubbles dict, bubble_config
Output: List[QuestionDetection]

Steps:
  1. For each bubble ROI:
  2.   Apply adaptive threshold
  3.   Apply circular mask
  4.   Count dark pixels in circle
  5.   Calculate fill_ratio = dark/total
  6. For each question:
  7.   Get all option fill_ratios
  8.   Determine status:
  9.     - max < 0.30 → unanswered
 10.     - multiple > 0.65 → ambiguous
 11.     - else → answered (highest)
 12.   Calculate confidence (gap between top 2)
```
**Thresholds:**
- Filled: > 0.30
- Ambiguous: > 0.65 (multiple answers)
- Confidence: top_ratio - second_ratio

---

### 🟡 Utilities

#### `app/utils/image_utils.py`
**Purpose:** Geometric operations and quality metrics
```
Functions:
  • calculate_blur_score()      - Laplacian variance
  • calculate_brightness_stats() - Mean, std dev
  • calculate_skew_angle()      - Hough lines rotation
  • four_point_transform()      - Perspective warp
  • order_points()              - Corner ordering
  • create_circular_mask()      - Bubble masks
  • safe_crop()                 - Bounds-checked crop
  • resize_with_aspect_ratio()  - Smart resizing
```

---

#### `app/utils/contour_utils.py`
**Purpose:** Contour detection and shape analysis
```
Functions:
  • find_quadrilateral()        - Paper boundary
  • find_circles()              - Registration marks
  • calculate_circularity()     - Shape validation
  • get_contour_center()        - Centroid
  • filter_contours_by_area()   - Size filtering
  • match_template_contours()   - Position matching
```

---

#### `app/utils/visualization.py`
**Purpose:** Debug visualization tools
```
Functions:
  • draw_paper_boundary()         - Show detected paper
  • draw_registration_marks()     - Show alignment
  • draw_detection_overlay()      - Show detections
  • create_pipeline_stages_grid() - Multi-stage view
  • save_debug_image()            - Save with title
```

---

### 🟠 Templates & Schemas

#### `app/templates/loader.py`
**Purpose:** Template loading with caching
```
┌─────────────────────────────────┐
│      Template Loader            │
│                                 │
│  • Loads JSON templates         │
│  • Validates against schema     │
│  • Caches in memory             │
│  • Thread-safe access           │
└─────────────────────────────────┘

Templates define:
  • Canonical size (width, height)
  • Registration marks (positions)
  • Bubble configuration (radius, thresholds)
  • Questions (ID, options with coordinates)
```

---

#### `app/schemas/`
**Purpose:** Pydantic data models for validation
```
template.py          - Template, RegistrationMark, Question, Option
answer_key.py        - AnswerKey, Answer
detection_result.py  - DetectionResult, QuestionDetection
scan_job.py          - ScanJob (input)
scan_result.py       - DEPRECATED (use detection_result.py)
```

---

## 🧪 Test Infrastructure

```
tests/
├── debug/
│   ├── visualize_pipeline.py     # Step-by-step visualization
│   ├── generate_test_form.py     # Synthetic form generator
│   └── benchmark_accuracy.py     # Accuracy measurement
│
├── fixtures/
│   ├── templates/                # Test templates
│   ├── answer_keys/              # Known answers
│   └── images/                   # Test images
│
└── utils/
    └── test_helpers.py           # Test utilities
```

### Debugging Tools Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEST INFRASTRUCTURE                          │
│                                                                 │
│  generate_test_form.py                                          │
│    │                                                            │
│    ├─ Creates synthetic forms                                  │
│    ├─ 16 test conditions (blur, skew, etc.)                   │
│    └─ Saves to fixtures/images/                               │
│                                                                 │
│  visualize_pipeline.py                                          │
│    │                                                            │
│    ├─ Runs full pipeline                                       │
│    ├─ Saves image for each stage                              │
│    ├─ Adds annotations & metrics                              │
│    └─ Creates summary grid                                     │
│                                                                 │
│  benchmark_accuracy.py                                          │
│    │                                                            │
│    ├─ Runs pipeline on test images                            │
│    ├─ Compares to known answers                               │
│    ├─ Calculates accuracy metrics                             │
│    ├─ Generates confusion matrix                              │
│    └─ Exports JSON report                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Execution Flow Example

```
                            START
                              │
                              ▼
            ┌─────────────────────────────────┐
            │  scan_worker.py (blocking)      │
            │  jobs = redis.blpop("scan_jobs")│
            └─────────────┬───────────────────┘
                          │
                          ▼
            ┌─────────────────────────────────┐
            │  Parse ScanJob                  │
            │  {                              │
            │    scan_id: "uuid",             │
            │    image_path: "scan_123.jpg",  │
            │    template: "form_A"           │
            │  }                              │
            └─────────────┬───────────────────┘
                          │
                          ▼
            ┌─────────────────────────────────────────────┐
            │  grade.run_detection_pipeline()             │
            └─────────────┬───────────────────────────────┘
                          │
                          ├─▶ load_template("form_A")
                          │   └─ Returns: Template object
                          │
                          ├─▶ preprocess_image("scan_123.jpg")
                          │   └─ Returns: (image, metrics)
                          │
                          ├─▶ detect_paper_boundary(image)
                          │   └─ Returns: boundary points
                          │
                          ├─▶ correct_perspective(image, boundary)
                          │   └─ Returns: corrected image
                          │
                          ├─▶ detect_registration_marks(corrected)
                          │   └─ Returns: detected marks
                          │
                          ├─▶ align_image_with_template(corrected, marks)
                          │   └─ Returns: aligned image
                          │
                          ├─▶ extract_all_bubbles(aligned, template)
                          │   └─ Returns: bubbles dict
                          │
                          ├─▶ score_all_questions(bubbles, config)
                          │   └─ Returns: detections list
                          │
                          └─▶ Assemble DetectionResult
                              └─ Returns: DetectionResult object
                          │
                          ▼
            ┌─────────────────────────────────────────────┐
            │  DetectionResult                            │
            │  {                                          │
            │    scan_id: "uuid",                         │
            │    template_id: "form_A",                   │
            │    status: "success",                       │
            │    detections: [                            │
            │      {                                      │
            │        question_id: 1,                      │
            │        selected: ["A"],                     │
            │        fill_ratios: {"A":0.82, "B":0.05},   │
            │        detection_status: "answered",        │
            │        confidence: 0.77                     │
            │      },                                     │
            │      ...                                    │
            │    ],                                       │
            │    quality_metrics: {...},                  │
            │    warnings: [],                            │
            │    errors: []                               │
            │  }                                          │
            └─────────────┬───────────────────────────────┘
                          │
                          ▼
            ┌─────────────────────────────────┐
            │  scan_worker.py                 │
            │  result_json = result.json()    │
            │  redis.rpush("scan_results",    │
            │              result_json)        │
            └─────────────┬───────────────────┘
                          │
                          ▼
                         END
            (Node.js picks up from scan_results)
```

---

## 🎯 Key Design Principles

### 1. **Separation of Concerns**
```
Python (CV Layer)     →  Outputs FACTS (DetectionResult)
Node.js (Logic Layer) →  Makes DECISIONS (GradingResult)
```

### 2. **Fail-Fast with Partial Results**
```
Critical Error  → Return partial DetectionResult with error
Warning         → Continue pipeline, include in warnings
Success         → Full DetectionResult with all data
```

### 3. **Template-Based Approach**
```
No ML required
Deterministic
Fast & reliable
Debuggable
```

### 4. **Quality-First**
```
Every stage validates quality
Metrics collected throughout
Early rejection of poor images
Confidence scoring on detections
```

### 5. **Observability**
```
Comprehensive logging (loguru)
Quality metrics collection
Warning/error aggregation
Debug visualization tools
```

---

## 📊 Performance Characteristics

```
┌─────────────────────────┬──────────────┬─────────────────┐
│ Stage                   │ Avg Time     │ Primary Op      │
├─────────────────────────┼──────────────┼─────────────────┤
│ Preprocessing           │ ~100-200ms   │ CLAHE, metrics  │
│ Paper Detection         │ ~50-100ms    │ Canny, contours │
│ Perspective Correction  │ ~30-50ms     │ warpPerspective │
│ Alignment               │ ~100-150ms   │ Circle detect   │
│ ROI Extraction          │ ~20-30ms     │ Crop operations │
│ Fill Scoring            │ ~50-100ms    │ Threshold, mask │
│ Result Assembly         │ ~5-10ms      │ Object creation │
├─────────────────────────┼──────────────┼─────────────────┤
│ TOTAL PIPELINE          │ ~500-800ms   │                 │
└─────────────────────────┴──────────────┴─────────────────┘
```

---

## 🔌 External Dependencies

```
OpenCV (cv2)        - All image operations
NumPy              - Array operations
Redis              - Queue communication
Pydantic           - Data validation
Loguru             - Logging
FastAPI (optional) - Health endpoint
```

---

## 🚀 Deployment Considerations

### Docker Container
```
FROM python:3.11-slim
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app/ /app/
CMD ["python", "-m", "app.workers.scan_worker"]
```

### Environment Variables
```
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
SCAN_JOBS_QUEUE=scan_jobs
SCAN_RESULTS_QUEUE=scan_results
TEMPLATE_DIR=/app/templates
```

---

## 📈 Monitoring Points

```
Worker Level:
  • Queue depth (scan_jobs)
  • Processing rate (scans/minute)
  • Error rate (failed/total)
  • Average processing time

Pipeline Level:
  • Stage success rates
  • Quality metrics distribution
  • Warning frequency by type
  • Confidence score distribution

Business Level:
  • Detection accuracy (vs manual review)
  • Review rate (needs_review/total)
  • Failure reasons breakdown
  • Processing latency P50/P95/P99
```

---

## 🔍 Troubleshooting Guide

### High Error Rate
```
Check: Quality metrics in DetectionResult
Action: Adjust preprocessing thresholds
Tool: visualize_pipeline.py for samples
```

### Low Confidence Scores
```
Check: Fill ratio distributions
Action: Tune filled_threshold/ambiguous_threshold
Tool: benchmark_accuracy.py with test forms
```

### Alignment Failures
```
Check: Registration mark detection count
Action: Verify template mark coordinates
Tool: visualize_pipeline.py stage 4
```

### Slow Processing
```
Check: Image sizes, queue depth
Action: Resize images, scale workers
Tool: Profiling, logs
```

---

## 📚 Related Documentation

- **Phase 2:** [PHASE_2_COMPLETE.md](PHASE_2_COMPLETE.md) - Pipeline implementation details
- **Phase 3:** [PHASE_3_COMPLETE.md](PHASE_3_COMPLETE.md) - Test infrastructure
- **Tests:** [tests/README.md](tests/README.md) - Testing guide
- **Domain:** [../domain/README.md](../../domain/README.md) - Schema contracts

---

**Last Updated:** Phase 3 Complete (January 2026)
