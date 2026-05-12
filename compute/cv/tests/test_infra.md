# Test Infrastructure - Phase 3

Complete test suite for validating and debugging the GradeLens OMR pipeline.

## 📁 Directory Structure

```
tests/
├── __init__.py
├── README.md                    # This file
├── debug/                       # Debug & visualization tools
│   ├── __init__.py
│   ├── visualize_pipeline.py   # Step-by-step pipeline visualization
│   ├── generate_test_form.py   # Synthetic form generator
│   └── benchmark_accuracy.py   # Accuracy measurement
├── fixtures/                    # Test data
│   ├── __init__.py
│   ├── templates/              # Test templates
│   │   ├── test_simple.json
│   │   └── ...
│   ├── answer_keys/            # Known correct answers
│   │   ├── test_simple_answers.json
│   │   ├── answers_form_A.json
│   │   └── ...
│   └── images/                 # Test images
│       ├── README.md
│       └── (generated/real scans)
└── utils/                      # Test utilities
    ├── __init__.py
    └── test_helpers.py         # Common test functions
```

---

## 🛠️ Debug Tools

### 1. Pipeline Visualizer (`visualize_pipeline.py`)

**Purpose:** Visualize each pipeline stage to debug issues.

**Usage:**
```bash
python -m tests.debug.visualize_pipeline \
    --image storage/scans/test_scan.jpg \
    --template form_A \
    --output tests/output/debug_001
```

**Output:**
- `1_preprocess.png` - Quality metrics overlay
- `2_paper_detection.png` - Paper boundary visualization
- `3_perspective_corrected.png` - Warped to canonical size
- `4_aligned.png` - Registration marks and alignment
- `5_roi_extraction.png` - Bubble ROI rectangles
- `6_fill_scoring.png` - Detection results overlay
- `00_summary_grid.png` - All stages in grid view

**When to use:**
- Debugging failed scans
- Understanding pipeline behavior
- Verifying template alignment
- Checking detection quality

---

### 2. Test Form Generator (`generate_test_form.py`)

**Purpose:** Create synthetic exam forms with various conditions.

**Usage:**

Generate all test conditions:
```bash
python -m tests.debug.generate_test_form \
    --template form_A \
    --output tests/fixtures/images \
    --conditions all \
    --answers '{"1":"A","2":"B","3":"C","4":"D","5":"A"}'
```

Generate specific conditions:
```bash
python -m tests.debug.generate_test_form \
    --template form_A \
    --output tests/fixtures/images \
    --conditions perfect,blurry,skewed
```

**Available Conditions:**
- `perfect` - Ideal scan conditions
- `slight_skew` - 3° rotation
- `moderate_skew` - 8° rotation  
- `heavy_skew` - 15° rotation
- `slight_blur` - Minor motion blur
- `heavy_blur` - Significant blur
- `low_contrast` - Faded appearance
- `dark` - Underexposed
- `bright` - Overexposed
- `noisy` - Gaussian noise
- `shadow` - Gradient shadow
- `perspective_top` - Viewing from below
- `perspective_bottom` - Viewing from above
- `light_marks` - Lightly filled bubbles
- `multiple_marks` - Multiple bubbles marked
- `erased_marks` - Partially erased marks

**When to use:**
- Creating test datasets
- Testing edge cases
- Benchmarking accuracy
- Validating threshold tuning

---

### 3. Accuracy Benchmark (`benchmark_accuracy.py`)

**Purpose:** Measure detection accuracy against known answer keys.

**Usage:**
```bash
python -m tests.debug.benchmark_accuracy \
    --test-dir tests/fixtures/images \
    --template form_A \
    --answer-key tests/fixtures/answer_keys/answers_form_A.json \
    --report tests/output/accuracy_report.json
```

**Output:**
```
==================================================================
BENCHMARK SUMMARY
==================================================================
Total Images:      16
Total Questions:   320
Overall Accuracy:  96.25%
Avg Confidence:    0.847
Perfect Scans:     12
Failed Scans:      0
Needs Review:      2

Accuracy by Condition:
------------------------------------------------------------------
  perfect              : 100.00% (20/20) [1 images]
  slight_skew          :  95.00% (19/20) [1 images]
  moderate_skew        :  90.00% (18/20) [1 images]
  heavy_skew           :  75.00% (15/20) [1 images]
  ...

Confusion Matrix (Expected → Detected):
------------------------------------------------------------------
  A: 75/80 correct (errors: B:3, C:1, NONE:1)
  B: 78/80 correct (errors: A:1, C:1)
  C: 79/80 correct (errors: D:1)
  D: 76/80 correct (errors: C:2, NONE:2)
==================================================================
```

**Metrics Collected:**
- Overall accuracy percentage
- Per-condition accuracy breakdown
- Confusion matrix (expected vs detected)
- Confidence scores
- Pipeline success/failure rates
- Question-level details

**When to use:**
- Validating pipeline changes
- Tuning detection thresholds
- Comparing different approaches
- Production readiness assessment

---

## 📊 Test Fixtures

### Templates

Simple test templates for quick validation:
- `test_simple.json` - 5 questions, basic layout

### Answer Keys

Known correct answers for benchmarking:
- `test_simple_answers.json` - Answers for test_simple template
- `answers_form_A.json` - Answers for form_A template

### Images

Place test images in `fixtures/images/`:
- Real scans from actual devices
- Generated forms from `generate_test_form.py`
- Edge case samples

---

## 🔧 Test Utilities

### `test_helpers.py`

Common functions for test scripts:

**Directory Helpers:**
- `get_fixtures_dir()` - Path to fixtures
- `get_templates_dir()` - Path to templates
- `get_images_dir()` - Path to images
- `get_answer_keys_dir()` - Path to answer keys

**Loading Functions:**
- `load_test_template(name)` - Load template fixture
- `load_test_answer_key(name)` - Load answer key fixture
- `load_test_image(name)` - Load image fixture
- `list_test_images()` - List all test images

**Utilities:**
- `ensure_output_dir(test_name)` - Create output directory
- `create_simple_answer_key(n, pattern)` - Generate answer key
- `compare_images(img1, img2, threshold)` - Image similarity
- `validate_detection_result(result)` - Validate result structure
- `format_duration(seconds)` - Human-readable time
- `print_test_header(title)` - Formatted header
- `print_test_result(name, passed, details)` - Test result

---

## 📝 Usage Examples

### Example 1: Debug a Failing Scan

```bash
# 1. Visualize the pipeline to see where it fails
python -m tests.debug.visualize_pipeline \
    --image storage/scans/problematic_scan.jpg \
    --template form_A \
    --output tests/output/debug_scan_001

# 2. Check the output images in tests/output/debug_scan_001/
# 3. Identify the failing stage
# 4. Adjust parameters or fix code
```

### Example 2: Validate Threshold Changes

```bash
# 1. Generate test forms with known answers
python -m tests.debug.generate_test_form \
    --template form_A \
    --output tests/fixtures/images \
    --conditions all \
    --answers '{"1":"A","2":"B","3":"C",...}'

# 2. Run benchmark before changes
python -m tests.debug.benchmark_accuracy \
    --test-dir tests/fixtures/images \
    --template form_A \
    --answer-key tests/fixtures/answer_keys/answers_form_A.json \
    --report tests/output/before_changes.json

# 3. Make threshold changes in fill_scoring.py

# 4. Run benchmark after changes
python -m tests.debug.benchmark_accuracy \
    --test-dir tests/fixtures/images \
    --template form_A \
    --answer-key tests/fixtures/answer_keys/answers_form_A.json \
    --report tests/output/after_changes.json

# 5. Compare reports to see improvement/regression
```

### Example 3: Create Custom Test Dataset

```python
# custom_test_generator.py
from tests.debug.generate_test_form import TestFormGenerator
from tests.utils.test_helpers import create_simple_answer_key

# Define answers
answers = create_simple_answer_key(20, "ABCD")

# Generate forms
generator = TestFormGenerator("form_A", "tests/fixtures/images")
for i in range(10):
    generator.generate_form(f"custom_{i}", answers)
```

### Example 4: Batch Processing with Visualization

```bash
# Process all images and create visualizations
for img in tests/fixtures/images/*.jpg; do
    basename=$(basename "$img" .jpg)
    python -m tests.debug.visualize_pipeline \
        --image "$img" \
        --template form_A \
        --output "tests/output/batch/$basename"
done
```

---

## 🎯 Testing Workflow

### Development Testing

1. **Unit Test** - Test individual pipeline stages
2. **Integration Test** - Test full pipeline with synthetic forms
3. **Regression Test** - Verify no degradation after changes
4. **Edge Case Test** - Test boundary conditions

### Pre-Production Validation

1. **Generate comprehensive test dataset** (all conditions)
2. **Run benchmark** on entire dataset
3. **Verify accuracy** meets requirements (e.g., >95%)
4. **Test with real scans** from actual devices
5. **Measure performance** (processing time)

### Production Monitoring

1. **Sample real scans** periodically
2. **Visualize pipeline** for random samples
3. **Track quality metrics** over time
4. **Re-benchmark** when making changes

---

## 🐛 Troubleshooting Guide

### Low Accuracy on Specific Condition

**Problem:** Blurry images have 70% accuracy.

**Steps:**
1. Generate more blurry test forms with varying kernel sizes
2. Visualize pipeline for blurry forms
3. Check if preprocessing detects blur correctly
4. Adjust blur rejection threshold or add blur reduction
5. Re-benchmark to verify improvement

### Registration Mark Detection Fails

**Problem:** Alignment stage shows "insufficient marks".

**Steps:**
1. Visualize pipeline to see mark detection
2. Check if marks are within search radius
3. Verify template mark coordinates are correct
4. Adjust search radius in `align.py`
5. Test with forms that have clear marks

### Fill Scoring Ambiguous Results

**Problem:** Many questions marked as "ambiguous".

**Steps:**
1. Generate forms with controlled fill ratios
2. Visualize fill scoring stage
3. Check fill_ratio values in output
4. Adjust `filled_threshold` or `ambiguous_threshold`
5. Benchmark with new thresholds

---

## 📈 Performance Targets

### Accuracy Goals

- **Perfect conditions:** >99% accuracy
- **Slight degradation:** >95% accuracy  
- **Moderate degradation:** >90% accuracy
- **Heavy degradation:** >80% accuracy or flagged for review

### Speed Goals

- **Preprocessing:** <200ms
- **Detection:** <500ms
- **Full pipeline:** <1s per form
- **Batch processing:** >30 forms/minute

### Quality Thresholds

- **Blur score:** >100 acceptable, >300 ideal
- **Brightness:** 50-230 range
- **Skew:** <10° acceptable
- **Perspective quality:** >0.9

---

## 🚀 Next Steps

Phase 3 provides comprehensive testing tools. Use them to:

1. **Validate current implementation** - Run benchmarks
2. **Tune parameters** - Optimize thresholds for your use case
3. **Test real devices** - Validate with actual scanner/camera
4. **Document findings** - Update thresholds in code based on results
5. **Create CI pipeline** - Automate testing on code changes

After validation, proceed to **Phase 4: Node.js Integration** to complete the async processing loop.

---

## 📚 Additional Resources

- See `PHASE_2_COMPLETE.md` for pipeline documentation
- See `domain/README.md` for schema documentation
- See individual tool `--help` for detailed options

---

**Phase 3 Complete! ✅**

All test infrastructure is ready for validation and debugging.
