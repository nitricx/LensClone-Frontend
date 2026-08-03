# Debug Feature Component

The `Debug` feature provides UI controls and diagnostics panels to visualize intermediate computer vision pipeline outputs.

## Primary Files
- [debug.component.ts](file:///d:/Repositories/PoC-LensClone/src/app/features/debug/debug.component.ts) - Diagnostic panel, canvas render updates for OCR crops, and option toggles.
- [debug.component.html](file:///d:/Repositories/PoC-LensClone/src/app/features/debug/debug.component.html) - Setup for controls panel list and rendering sub-canvases side-by-side.
- [debug-settings.ts](file:///d:/Repositories/PoC-LensClone/src/app/features/debug/debug-settings.ts) - Interface definition specifying active debug overlay stages.

## Visualizing Intermediate Crops
- Whenever detection crops are updated in `PipelineService.state()`, an Angular `effect` monitors the state and draws raw cropped regions onto small canvases matching each text area's width and height.
- Toggle buttons trigger changes directly against the `PipelineService.debugSettings` signal.
