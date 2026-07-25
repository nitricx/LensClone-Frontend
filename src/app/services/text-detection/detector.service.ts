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

    const maps = output[this.session.outputNames[0]] as ort.Tensor;
    this.debug.showMinMax(maps);
    this.debug.showProbabilityMap(maps);
    const detections = this.postprocessor.process(maps, scaleX, scaleY);
    console.log(`Detector found ${detections.length} detections`);
    return detections;
  }
}
