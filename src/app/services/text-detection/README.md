# Text Detection & Recognition Engine

The `text-detection` module provides the specialized computer vision processing blocks used by the main pipeline to detect bounding boxes, extract crops, run OCR character recognition, correct spelling, group text lines, and track targets across frames.

## Sub-Modules & Services

### 1. Object Detection (DBNet Model)
- [detector.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/detector/detector.service.ts) - Runs ONNX WASM model inference for DBNet text detection.
- [detector-preprocessor.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/detector/detector-preprocessor.service.ts) - Resizes input images to DBNet dimensions (e.g. 640x640) and normalizes tensor pixels.
- [detector-postprocessor.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/detector/detector-postprocessor.service.ts) - Converts probability maps into bounding polygon contours and rectangles.
- [detector-filter.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/detector/detector-filter.service.ts) - Filters out low-confidence candidate bounding boxes.

### 2. Cropping & Image Extraction
- [cropper.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/cropper/cropper.service.ts) - Extracts cropped sub-images from full canvas source for OCR inference.

### 3. Text Recognition (CRNN / OCR Model)
- [recognition.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/recognition/recognition.service.ts) - Runs ONNX WASM model inference for CRNN text recognition.
- [recognition-preprocessor.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/recognition/recognition-preprocessor.service.ts) - Normalizes cropped text region images.
- [recognition-postprocessor.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/recognition/recognition-postprocessor.service.ts) - Handles CTC decoding for output token sequences.
- [recognition-decoder.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/recognition/recognition-decoder.service.ts) - Decodes logits to string raw text.

### 4. Dictionary & Post-Processing
- [dictionary-matcher.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/dictionary/dictionary-matcher.service.ts) - Performs dictionary matching, spelling correction, price parsing, and quantity parsing.
- [weighted-levenshtein.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/dictionary/weighted-levenshtein.service.ts) - Weighted edit distance algorithm tailored for OCR error correction.

### 5. Line Grouping & Offer Structuring
- [line-grouping.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/line-grouping/line-grouping.service.ts) - Groups adjacent text bounding boxes into horizontal lines.
- [offer-extractor.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/offer-extraction/offer-extractor.service.ts) - Combines product names, quantities, and prices into structured `ProductOffer` objects.

### 6. Performance & Tracking Utilities
- [tracker.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/tracking/tracker.service.ts) - Multi-object bounding box tracking across video frames.
- [tensor-buffer-pool.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/tensor-buffer-pool/tensor-buffer-pool.service.ts) - Buffer pool for ONNX tensor allocations to eliminate GC overhead.
- [detection-helpers.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/detection-helper/detection-helpers.ts) - Pure utility functions for geometric bounding box operations.
- [types.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/types.ts) - Core interfaces (`Detection`, `BoundingBox`, `GroupedTextLine`, `ProductOffer`).
