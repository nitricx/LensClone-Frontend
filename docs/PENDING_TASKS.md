## 📖 Documentation
- [Production Readiness Audit & Implementation Plan](file:///d:/Repositories/lensClone/PoC-LensClone/docs/PRODUCTION_READINESS_AUDIT.md)

---

## ⚡ Refactoring & Performance Optimization
- [ ] **CRNN Recognition Batching**: Batch cropped text image tensors into a single `[N, 3, 48, W]` model pass or cap maximum crops processed per frame to eliminate $N$ sequential `session.run()` passes per frame.

---

## 🧪 Testing & Quality Assurance
- [ ] **Execute Dataset Baseline Evaluation**: Run the benchmark evaluator on test image datasets to measure execution latency (ms/frame), detection accuracy, and dictionary match precision.
- [ ] **CI Build & Formatting Checks**: Extend GitHub Actions CI workflows to enforce Prettier formatting checks (`npm run format:check`) and production build verification (`npm run build`).
- [ ] **Visual Regression & Overlay Testing**: Add unit and integration tests for `src/app/features/overlay/overlay.component.ts` to ensure correct bounding box scale transformations across varied screen aspect ratios and pixel densities.
