# Vision Processing Pipeline

The `PipelineService` coordinates multi-stage computer vision models and processing blocks to convert raw image pixels into tracked bounding boxes, OCR text, grouped reading lines, and structured product offers.

## Primary Files
- [pipeline.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/pipeline/pipeline.service.ts) - Main pipeline orchestrator service.
- [pipeline.worker.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/pipeline/pipeline.worker.ts) - Web Worker pipeline execution for off-main-thread inference.
- [pipeline-state.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/pipeline/pipeline-state.ts) - Immutably typed pipeline state interfaces and stage metrics.
- [pipeline-config.types.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/pipeline/pipeline-config.types.ts) - Pipeline configuration thresholds and options.

## Components & Flow Sequence
1. **[DetectorService](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/detector/detector.service.ts)** (DBNet): Detects text region bounding boxes in raw image frames.
2. **[DetectorFilterService](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/detector/detector-filter.service.ts)**: Rejects low-confidence candidate bounding boxes.
3. **[TrackerService](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/tracking/tracker.service.ts)**: Tracks bounding boxes across consecutive video frames to smooth bounding boxes and prevent flickering.
4. **[DetectorCropperService](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/cropper/cropper.service.ts)**: Crops bounding box regions out of the main canvas into smaller sub-images for OCR.
5. **[RecognitionService](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/recognition/recognition.service.ts)** (CRNN/OCR): Recognizes text characters inside cropped region images.
6. **[DictionaryMatcherService](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/dictionary/dictionary-matcher.service.ts)**: Corrects spelling errors against a dictionary corpus and parses price/quantity tokens.
7. **[LineGroupingService](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/line-grouping/line-grouping.service.ts)**: Merges adjacent horizontal text chunks on the same visual line.
8. **[OfferExtractorService](file:///d:/Repositories/PoC-LensClone/src/app/services/text-detection/offer-extraction/offer-extractor.service.ts)**: Assembles product names, prices, and quantities into structured `ProductOffer` objects.

## Key Signals & State Exposed
- `state`: `Signal<PipelineState>` - Read-only reactive state containing active detections, offers, processing metrics, and config.
- `detections`: `Signal<Detection[]>` - Extracted detection items.
- `offers`: `Signal<ProductOffer[]>` - Structured product offer groups.
- `groupedLines`: `Signal<GroupedTextLine[]>` - Computed single-line and multi-line offer reading groups.
- `debugSettings`: `Signal<DebugSettings>` - Configurable flags for overlay canvas visualization stages.

## Architecture Guidelines
- **Pipeline States**: Inter-stage outputs must be propagated using [pipeline-state.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/pipeline/pipeline-state.ts).
- **Diagnostics**: Expose step performance and stage toggle flags via the `debugSettings` signal.
