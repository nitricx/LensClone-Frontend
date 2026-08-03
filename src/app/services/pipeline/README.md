# Vision Processing Pipeline

The `PipelineService` coordinates multi-stage computer vision models to convert raw image pixels into grouped, spelling-corrected text lines.

## Components & Flow Sequence
1. **[DetectorService](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/detector/detector.service.ts)** (DBNet): Focuses on detecting bounding boxes where text is located.
2. **[DetectorFilterService](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/detector/detector-filter.service.ts)**: Rejects low-confidence or invalid candidate bounding boxes.
3. **[DetectorCropperService](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/cropper.service.ts)**: Crops the bounding box regions out of the main canvas into smaller sub-images for OCR.
4. **[RecognitionService](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/recognition/recognition.service.ts)** (CRNN/OCR): Recognizes characters inside the cropped boxes.
5. **[DictionaryMatcherService](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/dictionary/dictionary-matcher.service.ts)**: Compares outputs with a corpus dictionary to fix spelling anomalies.
6. **[LineGroupingService](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/line-grouping.service.ts)**: Merges adjacent horizontal text chunks to maintain standard reading order flow.

## Architecture Guidelines
- **Pipeline States**: Inter-stage outputs must be propagated using [pipeline-state.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/pipeline/pipeline-state.ts). Avoid sharing mutable variables outside this context.
- **Diagnostics**: Expose step performance and stages toggle flags via the `debugSettings` signal to keep debug settings customizable.
