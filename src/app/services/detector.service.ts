import { Injectable } from '@angular/core';
import * as ort from 'onnxruntime-web';
import { Detection } from '../models/detection';

@Injectable({
  providedIn: 'root',
})
export class DetectorService {
  async initialize() {
    ort.env.wasm.proxy = false;
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = '/assets/ort/';

    const buffer = await this.pullModel('/models/det.onnx');
    await ort.InferenceSession.create(buffer, {
      executionProviders: ['wasm'],
    });
  }

  async pullModel(modelUrl: string): Promise<ArrayBuffer> {
    const response = await fetch(modelUrl);
    if (!response.ok) {
      throw new Error(
        `Detector Model file not reachable: ${response.status} ${response.statusText} at ${modelUrl}`,
      );
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();

    if (contentType?.includes('text/html') || buffer.byteLength < 1000) {
      throw new Error(
        `Detector Model file looks invalid (content-type: ${contentType}, size: ${buffer.byteLength} bytes). ` +
          `Likely a dev-server fallback or a Git LFS pointer file instead of the real model.`,
      );
    }

    console.log(`Detector Model OK: ${buffer.byteLength} bytes, type: ${contentType}`);
    return buffer;
  }

  async detect(image: ImageData): Promise<Detection[]> {
    // Placeholder implementation.
    // Image preprocessing and postprocessing will be added
    // during Phase 1.3.

    return [];
  }
}
