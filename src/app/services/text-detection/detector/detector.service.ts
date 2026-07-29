import { Injectable } from '@angular/core';
import * as ort from 'onnxruntime-web';
import { DetectorPreprocessorService } from './detector-preprocessor.service';
import { DetectorPostprocessorService } from './detector-postprocessor.service';
import { Detection } from '../types';

@Injectable({
  providedIn: 'root',
})
export class DetectorService {
  private session!: ort.InferenceSession;

  constructor(
    private readonly preprocessor: DetectorPreprocessorService,
    private readonly postprocessor: DetectorPostprocessorService,
  ) {}

  async initialize() {
    ort.env.wasm.proxy = false;
    ort.env.wasm.numThreads = 16;
    ort.env.wasm.wasmPaths = '/assets/ort/';

    const buffer = await this.pullModel('/models/PP-OCRv5_mobile_det.onnx');
    this.session = await ort.InferenceSession.create(buffer, {
      executionProviders: ['wasm'],
    });
  }

  async detect(image: ImageData): Promise<Detection[]> {
    const tensor = this.preprocessor.toTensor(image);
    const output = await this.session.run({
      x: tensor,
    });

    const maps = output[this.session.outputNames[0]] as ort.Tensor;
    return this.postprocessor.process(maps, image.width, image.height);
  }

  private async pullModel(modelUrl: string): Promise<ArrayBuffer> {
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
    return buffer;
  }
}
