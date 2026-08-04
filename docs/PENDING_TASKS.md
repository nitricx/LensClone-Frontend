# 📌 LensClone Pending Tasks

Delete tasks from this list as they are completed.

---

## 📖 Documentation
- [ ] **Pipeline Architecture & Dataflow Diagram**: Create sequence and architecture diagrams (e.g., in Mermaid markdown format within `docs/ARCHITECTURE.md`) documenting the complete flow: `WebRTC Stream` -> `Canvas Extraction` -> `DBNet Text Detection` -> `Cropper` -> `CRNN Text Recognition` -> `Line Grouping` -> `Dictionary Matching` -> `Overlay Canvas Rendering`.
- [ ] **ONNX WASM & Model Configuration Guide**: Document ONNX model parameters (tensor input shapes, mean/std normalization values, vocabulary character maps, opset versions) and explain how WASM assets are served via `angular.json` (`/assets/ort/`).
- [ ] **Dataset Evaluation Guide**: Expand `docs/DATASET_EVALUATION_PROCEDURE.md` with practical execution examples, sample dataset formats, and metric interpretation (Precision, Recall, F1-Score, Character Error Rate / CER).

---

## ⚡ Refactoring & Performance Optimization
- [x] **Web Worker Offloading for ML Pipeline**: Move canvas image preprocessing, tensor allocations, and CTC greedy decoding off the main UI thread to a dedicated Web Worker to maintain a fluid 60 FPS camera preview.
- [x] **Memory & Canvas Context Optimization**: Implement tensor buffer pooling and context reuse for `getImageData()` calls to eliminate Garbage Collection (GC) latency spikes during continuous live inference.
- [x] **Signal State Management Clean-up**: Refine reactive state handling across components and services in `src/app/services/pipeline/pipeline-state.ts` to leverage explicit Angular 22 Signals (`signal()`, `computed()`) and eliminate redundant subscriptions.
- [x] **Debug Studio View & Aspect Alignment**: Redesign the debug view layout into a 2-column ML Vision Studio (timings bar, memory gauges, controls, inspection drawer tabs) and align camera video fill rendering with canvas overlays.
- [x] **Detector Input Downscaling (DBNet Aspect Bounding)**: Downscale input frame tensors sent to DBNet detector (`PP-OCRv5_mobile_det.onnx`) to a bounded maximum dimension (e.g., max side 480px or 384px) instead of native video resolution, scaling bounding box coordinates back during post-processing to reduce detector latency from ~140ms to ~35–50ms.
- [x] **ONNX Graph Optimization & Thread Tuning**: Configure `graphOptimizationLevel: 'all'` in `InferenceSession.SessionOptions` across `DetectorService` and `RecognitionService`, and tune `numThreads` to match `navigator.hardwareConcurrency` to prevent Web Worker thread oversubscription overhead.
- [ ] **CRNN Recognition Batching**: Batch cropped text image tensors into a single `[N, 3, 48, W]` model pass or cap maximum crops processed per frame to eliminate $N$ sequential `session.run()` passes per frame.
- [x] **WebGPU Execution Provider**: Configure ONNX Runtime Web execution providers (`executionProviders: ['webgpu', 'wasm']`) to enable hardware GPU acceleration when supported by the browser, reducing DBNet execution latency to ~10–15ms.

---

## 🧪 Testing & Quality Assurance
- [ ] **Execute Dataset Baseline Evaluation**: Run the benchmark evaluator on test image datasets to measure execution latency (ms/frame), detection accuracy, and dictionary match precision.
- [ ] **CI Build & Formatting Checks**: Extend GitHub Actions CI workflows to enforce Prettier formatting checks (`npm run format:check`) and production build verification (`npm run build`).
- [ ] **Visual Regression & Overlay Testing**: Add unit and integration tests for `src/app/features/overlay/overlay.component.ts` to ensure correct bounding box scale transformations across varied screen aspect ratios and pixel densities.

---

## ✨ New Features & Enhancements
- [ ] **Frame-to-Frame Text Box Tracking (IoU / Kalman Filtering)**: Implement bounding box tracking between consecutive video frames to reuse dictionary-matched text across adjacent frames, reducing ML workload by 60-70% and smoothing bounding box overlay movements.
- [ ] **Interactive Lens UX Actions**:
  - [ ] **Click-to-Select / Copy**: Allow users to click detected text overlays to copy text to the clipboard or trigger a web search/translation.
  - [ ] **Freeze / Pause Feed**: Add a camera freeze button so users can tap and interact with detected text without camera motion blur.
  - [ ] **Region of Interest (ROI) Selector**: Let users drag a bounding box on screen to restrict text detection/recognition to a specific area.
- [ ] **PWA / Offline Support**: Configure Angular Service Worker (`@angular/pwa`) to cache ONNX models (`.onnx`) and WASM runtime files for seamless offline usage.
- [ ] **Multi-Language OCR Support**: Extend vocabulary character mappings and dictionary matchers to support additional languages (e.g., Spanish, French, German).
