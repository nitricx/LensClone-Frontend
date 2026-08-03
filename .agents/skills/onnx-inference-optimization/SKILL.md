---
name: onnx-inference-optimization
description: Guidelines for optimizing ONNX Runtime Web WASM inference, canvas-based image extraction, and pipeline performance optimization.
---

# ONNX WASM & Canvas Optimization Guidelines

Use this skill when modifying model initialization, pipeline scheduling, or canvas image extraction routines.

## Canvas Context & Memory Allocation
- **`willReadFrequently` Context Attribute**: When calling `.getContext('2d')` on elements used to read image data back (such as crop canvases or detection capture canvases), always pass `{ willReadFrequently: true }`. This enables GPU-to-CPU cache optimizations.
- **Canvas Resizing**: Minimize canvas resizing operations during inference loops. Reuse static elements or keep sizes fixed to model dimensions (e.g., resizing to 640x640 once, rather than on every frame).
- **Garbage Collection (GC) Pressure**: Avoid allocating large typed arrays inside the inference loops. Reuse buffers, Float32Arrays, or pre-allocated objects.

## ONNX Runtime Web Configuration
- **WASM Paths**: Ensure WASM assets are resolved properly from the configured local assets directory:
  ```typescript
  import { env } from 'onnxruntime-web';
  env.wasm.wasmPaths = '/assets/ort/';
  ```
- **Thread Count & Web Workers**: For multithreading support, configure:
  ```typescript
  env.wasm.numThreads = navigator.hardwareConcurrency || 4;
  ```
- **Session Options**: Set up `InferenceSession.SessionOptions` to enable graph optimizations:
  ```typescript
  const options = {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  };
  ```

## Frame Synchronization
- **RequestAnimationFrame Rules**: Ensure that only one inference run is active at a time. Guard frame handling loops with a boolean flag (e.g., `detectionInProgress`). If the previous frame's inference takes longer than $16.7\text{ ms}$, skip frames rather than queuing multiple concurrent WASM runs.
