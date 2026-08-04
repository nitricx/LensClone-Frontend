import { Injectable } from '@angular/core';
import { RecognitionPreprocessorService } from '../recognition/recognition-preprocessor.service';
import * as ort from 'onnxruntime-web';
import { RecognitionPostprocessorService } from './recognition-postprocessor.service';
import { Detection } from '../types';
import { PipelineStage, PipelineState } from '../../pipeline/pipeline-state';

@Injectable({
  providedIn: 'root',
})
export class RecognitionService implements PipelineStage {
  readonly name = 'recognizer';
  private session!: ort.InferenceSession;
  private dictionary!: string[];

  constructor(
    private readonly preprocessor: RecognitionPreprocessorService,
    private readonly postprocessor: RecognitionPostprocessorService,
  ) {}

  async initialize(): Promise<void> {
    if (typeof window !== 'undefined' && ort?.env?.wasm) {
      ort.env.wasm.proxy = false;
      ort.env.wasm.numThreads =
        typeof navigator !== 'undefined' && navigator.hardwareConcurrency
          ? navigator.hardwareConcurrency
          : 4;
      ort.env.wasm.wasmPaths = '/assets/ort/';
    }

    const buffer = await this.pullModel('/models/latin_PP-OCRv5_mobile_rec.onnx');
    this.session = await ort.InferenceSession.create(buffer, {
      executionProviders: ['webgpu', 'wasm'],
      graphOptimizationLevel: 'all',
    });
    this.preprocessor.initialize(48);
    this.dictionary = (await fetch('/models/dictionary.txt').then((r) => r.text()))
      .split(/\r?\n/)
      .filter(Boolean);
  }

  async execute(state: PipelineState): Promise<void> {
    for (const detection of state.detections) {
      if (!detection.crop) {
        continue;
      }

      const output = await this.session.run({
        x: this.preprocessor.toTensor(detection.crop),
      });

      const maps = output[this.session.outputNames[0]] as ort.Tensor;

      detection.rawText = this.postprocessor.decode(maps, this.dictionary, 836);
    }
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
