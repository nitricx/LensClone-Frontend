import { Injectable } from '@angular/core';
import { RecognitionPreprocessorService } from '../recognition/recognition-preprocessor.service';
import * as ort from 'onnxruntime-web';
import { RecognitionPostprocessorService } from './recognition-postprocessor.service';
import { Detection } from '../types';

@Injectable({
  providedIn: 'root',
})
export class RecognitionService {
  private session!: ort.InferenceSession;
  private dictionary!: string[];

  constructor(
    private readonly preprocessor: RecognitionPreprocessorService,
    private readonly postprocessor: RecognitionPostprocessorService,
  ) {}

  async initialize() {
    ort.env.wasm.proxy = false;
    ort.env.wasm.numThreads = 16;
    ort.env.wasm.wasmPaths = '/assets/ort/';

    const buffer = await this.pullModel('/models/latin_PP-OCRv5_mobile_rec.onnx');
    this.session = await ort.InferenceSession.create(buffer, {
      executionProviders: ['wasm'],
    });
    this.preprocessor.initialize(48);
    this.dictionary = (await fetch('/models/dictionary.txt').then((r) => r.text()))
      .split(/\r?\n/)
      .filter(Boolean);
  }

  async recognize(detections: Detection[]): Promise<Detection[]> {
    const result: Detection[] = [];

    for (const detection of detections) {
      if (!detection.crop) {
        result.push(detection);
        continue;
      }

      const tensor = this.preprocessor.toTensor(detection.crop);

      const output = await this.session.run({
        x: tensor,
      });

      const maps = output[this.session.outputNames[0]] as ort.Tensor;

      result.push({
        ...detection,
        text: this.postprocessor.decode(maps, this.dictionary, 836),
      });
    }

    return result;
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
