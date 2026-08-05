# Debug Feature Component

The `Debug` feature provides UI controls and diagnostics panels to visualize intermediate computer vision pipeline outputs, inspect stage execution performance metrics, and render cropped OCR text regions.

## Primary Files
- [debug.component.ts](file:///d:/Repositories/PoC-LensClone/src/app/features/debug/debug.component.ts) - Diagnostic panel component, performance metrics display, and option toggles.
- [debug.component.html](file:///d:/Repositories/PoC-LensClone/src/app/features/debug/debug.component.html) - Template setup for controls panel list, FPS counter, stage timing metrics, and sub-canvas grid.
- [debug.component.css](file:///d:/Repositories/PoC-LensClone/src/app/features/debug/debug.component.css) - Styling rules for the diagnostics panel grid and toggle buttons.
- [crop-canvas.component.ts](file:///d:/Repositories/PoC-LensClone/src/app/features/debug/crop-canvas.component.ts) - Standalone child component for rendering individual cropped text regions onto dynamic-sized HTML5 canvases.
- [debug-settings.ts](file:///d:/Repositories/PoC-LensClone/src/app/features/debug/debug-settings.ts) - Interface definition specifying active debug overlay stage flags (`croppedRegions`, `boundingBoxes`, `recognizedText`, `canonicalText`, `lineGrouping`).

## Key Capabilities
- **Intermediate Crop Rendering**: Monitors `PipelineService.state()` via Angular `effect` and draws raw cropped text regions onto individual `<app-crop-canvas>` elements.
- **Stage Metrics & FPS**: Displays real-time inference time breakdowns (DBNet Detection, Bounding Box Filtering, Tracking, Cropping, CRNN Recognition, Line Grouping) and frames per second.
- **Line Grouping Diagnostics**: Displays aggregated line grouping metrics and allows toggling line overlay visualization.
- **Interactive Toggles**: Toggles directly mutate the `PipelineService.debugSettings` signal to immediately affect canvas overlays.
