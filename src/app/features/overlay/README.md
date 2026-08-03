# Overlay Feature Component

The `Overlay` feature renders custom elements or bounding boxes on top of the raw camera video feed.

## Primary Files
- [overlay.component.ts](file:///d:/Repositories/PoC-LensClone/src/app/features/overlay/overlay.component.ts) - Resizes overlay canvas dynamically and delegates box drawing to `BoundingBoxRendererService`.
- [overlay.component.html](file:///d:/Repositories/PoC-LensClone/src/app/features/overlay/overlay.component.html) - Minimal container with an HTML5 `<canvas #overlay>`.
- [overlay.component.css](file:///d:/Repositories/PoC-LensClone/src/app/features/overlay/overlay.component.css) - Position overlays absolutely relative to parent camera coordinates.

## Overlay Rendering
- An Angular `effect` runs automatically when `width`, `height`, or `PipelineService.state` changes.
- If `debugSettings.boundingBoxes` is enabled, the component clears the overlay canvas and calls the renderer service to highlight recognized texts.
