import { Injectable } from '@angular/core';
import * as ort from 'onnxruntime-web';
import { Detection } from '../../models/detection';
import { DetectorPreprocessorService } from './detector-preprocessor.service';
import { DetectorPostprocessorService } from './detector-postprocessor.service';
import { DebugCanvasService } from '../debug/debug-canvas.service';

@Injectable({
  providedIn: 'root',
})
export class DetectorService {
  constructor(private debug: DebugCanvasService) {}
  private session!: ort.InferenceSession;
  private preprocessor!: DetectorPreprocessorService;
  private postprocessor!: DetectorPostprocessorService;
  async initialize() {
    ort.env.wasm.proxy = false;
    ort.env.wasm.numThreads = 16;
    ort.env.wasm.wasmPaths = '/assets/ort/';
    this.preprocessor = new DetectorPreprocessorService();
    this.postprocessor = new DetectorPostprocessorService(0.3, 10);
    const buffer = await this.pullModel('/models/det.onnx');
    this.session = await ort.InferenceSession.create(buffer, {
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
    const tensor = this.preprocessor.toTensor(image);

    const output = await this.session.run({
      x: tensor,
    });
    const outputName = this.session.outputNames[0];

    const maps = output[outputName] as ort.Tensor;
    this.minMaxTest(maps);
    this.debug.showProbabilityMap(maps);
    const detections = this.postprocessor.process(maps, scaleX, scaleY);
    console.log(`Detector found ${detections.length} detections`);
    return detections;
  }

  private minMaxTest(maps: ort.Tensor) {
    const data = maps.data as Float32Array;

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let sum = 0;

    for (const v of data) {
      min = Math.min(min, v);
      max = Math.max(max, v);
      sum += v;
    }

    console.log({
      min,
      max,
      avg: sum / data.length,
    });
  }
}
