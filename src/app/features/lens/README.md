# Lens Feature Component

The `Lens` feature manages the live viewport, feeds video frames from the camera service into the detection canvas, and runs the main request-response loops.

## Primary Files
- [lens.component.ts](file:///d:/Repositories/PoC-LensClone/src/app/features/lens/lens.component.ts) - Camera preview synchronization, raw frame capture, and coordination.
- [lens.component.html](file:///d:/Repositories/PoC-LensClone/src/app/features/lens/lens.component.html) - Video element overlay layout.
- [lens.component.css](file:///d:/Repositories/PoC-LensClone/src/app/features/lens/lens.component.css) - Styling rules for full-screen camera alignment and overlay layers.

## Implementation details
- **Frame Retrieval**: Raw frames are read from `<video>` elements using an offscreen canvas context configured with `willReadFrequently: true`.
- **Loop Scheduling**: The loop is scheduled using `requestAnimationFrame` and guarded by `detectionInProgress` flag to prevent frame stacking.
- **Canvases & Resizing**: The offscreen canvas is resized when the video stream load/metadata events fire (`resizeCanvases` method).

## Guidelines for Changes
- When modifying layouts, preserve standalone Angular components structure and keep components modular.
- Do not introduce RxJS subscription streams for loop scheduling; keep utilizing signals (`videoWidth`, `videoHeight`) for reactive metadata updates.
