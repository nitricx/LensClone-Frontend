# LensClone Dataset Evaluation & Benchmark Procedure (Offline Testing Guide)

This document defines the standard methodology, terminology, and execution procedure for conducting **Offline Dataset Evaluation & Accuracy Benchmarking** for **LensClone**.

---

## 1. Terminology & Core Concepts

In Computer Vision (CV) and Optical Character Recognition (OCR) engineering, testing a vision pipeline using static real-world images is standard practice. Below are the formal names and definitions for these tests:

| Industry Term | Standard Definition | Purpose in LensClone |
| :--- | :--- | :--- |
| **Offline Dataset Evaluation** *(or Golden Dataset Evaluation)* | Testing ML models or pipelines offline against a curated set of fixed, real-world images instead of a live video stream. | Eliminates WebRTC camera jitter, autofocus variability, and frame-rate non-determinism to isolate pipeline logic. |
| **Ground Truth (GT) Benchmarking** | Comparing the pipeline's output (bounding boxes, detected text strings, confidence scores) against pre-labeled, verified annotations. | Quantifies exact detection accuracy, false positive rates, and OCR character errors. |
| **Component Isolation Benchmarking** | Testing individual stages of the vision pipeline independently (`DetectorService` vs `RecognitionService`). | Pinpoints whether OCR failures stem from inaccurate bounding box localization or poor text model transcription. |
| **Regression Benchmarking** | Re-running the static dataset whenever ONNX models, pre-processing thresholds, or post-processing parameters change. | Guarantees model or algorithm updates do not introduce silent accuracy regressions. |

---

## 2. Test Rationale & Objectives

### Why Static Image Testing over Live Camera Feed?

While camera feed testing evaluates real-time performance, it makes quantitative measurement difficult because:
1. **Non-deterministic frames**: Lighting, distance, motion blur, and frame rate fluctuate continuously.
2. **Hard to reproduce**: Replicating an exact failure case on a live stream is nearly impossible.
3. **Inability to calculate exact metrics**: Without fixed ground truth annotations for every frame, metrics like Precision, Recall, and Character Error Rate (CER) cannot be calculated automatically.

### Key Objectives for LensClone

1. **Evaluate `DetectorService` (DBNet Model)**: Measure how accurately text region polygons/bounding boxes are located on real grocery store images (shelves, price tags, packaging).
2. **Evaluate `RecognitionService` (CRNN/OCR Model)**: Measure text transcription accuracy on cropped image regions across various fonts, sizes, and print qualities.
3. **Evaluate End-to-End Pipeline (`PipelineService`)**: Measure combined accuracy, latency (ms), and dictionary matching efficacy on complete shelf images.

---

## 3. Dataset Architecture & Ground Truth Structure

### 3.1 Recommended Dataset Directory Layout

Store real-world evaluation images and their corresponding annotation manifests under a dedicated test fixtures directory:

```text
public/assets/test-fixtures/
├── dataset-manifest.json             # Master index listing all evaluation samples & metadata
└── grocery/
    ├── price-tags/                   # Price labels on shelf edges
    │   ├── price_tag_001.jpg
    │   └── price_tag_001.json        # Ground Truth for tag 001
    ├── packaging/                    # Product package text (front/back labels)
    │   ├── packaging_001.jpg
    │   └── packaging_001.json
    └── shelf-wide/                   # Full shelf views with multiple items
        ├── shelf_001.jpg
        └── shelf_001.json
```

### 3.2 Ground Truth Annotation Format (`JSON`)

For each test image, maintain a paired Ground Truth JSON file containing expected bounding boxes and expected text strings:

```json
{
  "imageId": "price_tag_001",
  "category": "price-tags",
  "dimensions": { "width": 1920, "height": 1080 },
  "annotations": [
    {
      "id": "box-1",
      "boundingBox": { "x": 450, "y": 320, "width": 210, "height": 65 },
      "polygon": [
        { "x": 450, "y": 320 },
        { "x": 660, "y": 320 },
        { "x": 660, "y": 385 },
        { "x": 450, "y": 385 }
      ],
      "expectedText": "$3.49",
      "textCategory": "price"
    },
    {
      "id": "box-2",
      "boundingBox": { "x": 450, "y": 280, "width": 340, "height": 40 },
      "expectedText": "ORGANIC OAT MILK 1L",
      "textCategory": "product_name"
    }
  ]
}
```

---

## 4. Pipeline Step Evaluation Strategy

```
                          ┌───────────────────────────┐
                          │    Static Test Image      │
                          └─────────────┬─────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
        ┌───────────────────────┐               ┌───────────────────────┐
        │     STEP A: DETECTOR  │               │   STEP B: RECOGNIZER  │
        │   (`DetectorService`) │               │ (`RecognitionService`)│
        └───────────┬───────────┘               └───────────┬───────────┘
                    │                                       │
      Evaluates Bounding Box Accuracy          Evaluates Text Crop Transcription
      Metrics: IoU, Precision, Recall          Metrics: CER, WER, Exact Match %
                    │                                       │
                    └───────────────────┬───────────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │      STEP C: END-TO-END       │
                        │     (`PipelineService`)       │
                        └───────────────┬───────────────┘
                                        │
                       Evaluates Combined Output & Latency
                       Metrics: Pipeline Latency (ms), Yield
```

---

### Step A: `DetectorService` Evaluation (Text Detection / DBNet)

#### 1. Input & Execution
- Feed raw static image (`HTMLImageElement` / `ImageData`) into `DetectorService.detect(imageData)`.
- Extract predicted bounding boxes (`BoundingBox[]`) and raw score maps.

#### 2. Evaluation Metrics

- **Intersection over Union (IoU)**:
  $$\text{IoU} = \frac{\text{Area of Overlap}(\text{Box}_{\text{pred}}, \text{Box}_{\text{gt}})}{\text{Area of Union}(\text{Box}_{\text{pred}}, \text{Box}_{\text{gt}})}$$
  *(A prediction is considered a **True Positive (TP)** if $\text{IoU} \ge 0.50$)*

- **Detection Precision**:
  $$\text{Precision} = \frac{\text{True Positives (TP)}}{\text{Total Predicted Boxes (TP + FP)}}$$

- **Detection Recall**:
  $$\text{Recall} = \frac{\text{True Positives (TP)}}{\text{Total Ground Truth Boxes (TP + FN)}}$$

- **Detection F1-Score**:
  $$\text{F1} = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$$

- **Detection Latency**: Execution time in milliseconds ($ms$) per frame.

---

### Step B: `RecognitionService` Evaluation (Text Recognition / CRNN)

#### 1. Input & Execution
- Feed Ground Truth crop regions directly to `RecognitionService.recognize(croppedCanvas)` to test recognition in isolation from detection errors.
- Extract predicted string and model confidence score.

#### 2. Evaluation Metrics

- **Character Error Rate (CER)**:
  $$\text{CER} = \frac{S + D + I}{N}$$
  *(Where $S$ = Substitutions, $D$ = Deletions, $I$ = Insertions, $N$ = Total characters in Ground Truth text)*

- **Word Error Rate (WER)**:
  $$\text{WER} = \frac{S_w + D_w + I_w}{N_w}$$

- **Exact Match String Accuracy (%)**: Percentage of crops where `predictedText.trim() === expectedText.trim()`.

- **Normalized Edit Distance Similarity**: Levinshtein similarity score between $0.0$ and $1.0$.

- **Recognition Latency**: Execution time per crop in milliseconds ($ms$).

---

### Step C: End-to-End Pipeline Evaluation (`PipelineService`)

#### 1. Input & Execution
- Run complete pipeline from raw image to final grouped text lines and dictionary/product matching.

#### 2. Evaluation Metrics

- **End-to-End Word Accuracy**: Accuracy of text extracted when detection and recognition operate sequentially.
- **Total Pipeline Latency Breakdown**:
  - Preprocessing Time ($ms$)
  - Detection Model Time ($ms$)
  - Crop Extraction Time ($ms$)
  - Recognition Model Time ($ms$)
  - Postprocessing & Dictionary Match Time ($ms$)
- **System Memory Usage**: WASM heap memory allocation and canvas buffer retention during multi-image batch evaluation.

---

## 5. Implementation Roadmap & Harness Options

To execute these tests, two complementary approaches are recommended:

### Approach 1: Vitest Integration Benchmark (Headless / Automated)
Create an automated test suite (`src/app/services/pipeline/pipeline-benchmark.spec.ts`) that runs under `npm test`.
- Loads test fixture images into `HTMLCanvasElement` / `ImageData` (via node canvas or jsdom canvas).
- Asserts that key test images achieve minimum target metrics (e.g., F1-score $\ge 0.85$, CER $\le 0.10$).

### Approach 2: Interactive Angular Benchmark View (Visual / Debug Feature)
Utilize or expand the existing `DebugComponent` (`src/app/features/debug/`) to add a **Dataset Benchmark UI**:
- Allow dragging and dropping a batch of grocery store images or selecting pre-loaded test fixture categories.
- Display visual overlays showing Ground Truth bounding boxes (e.g., Green) vs Detector Predictions (e.g., Red).
- Display a real-time metric table showing IoU, CER, WER, and execution latency for each image.

---

## 6. Summary Checklist for Conducting a Benchmark Run

- [ ] **Capture & Categorize Images**: Take clear photos of grocery store shelves, price tags, and product boxes across bright/low light and straight/angled perspectives.
- [ ] **Create Ground Truth Metadata**: Annotate expected bounding boxes and expected text strings in JSON format.
- [ ] **Run Step A (Detector)**: Measure detection F1-score, Precision, Recall, and IoU.
- [ ] **Run Step B (Recognizer)**: Measure CRNN text recognition accuracy, CER, and WER on pre-cropped regions.
- [ ] **Run Step C (End-to-End)**: Measure overall pipeline throughput, latency breakdown, and dictionary match quality.
- [ ] **Document Baseline**: Save metrics report to compare future model or pre-processing optimizations.
