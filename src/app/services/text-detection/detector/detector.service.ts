import { Injectable } from '@angular/core';
import * as ort from 'onnxruntime-web';
import { DetectorPreprocessorService } from './detector-preprocessor.service';
import { DetectorPostprocessorService } from './detector-postprocessor.service';
import { Detection } from '../types';
import { PipelineStage, PipelineState } from '../../pipeline/pipeline-state';

@Injectable({
  providedIn: 'root',
})
export class DetectorService implements PipelineStage {
  readonly name = 'detector';
  private session!: ort.InferenceSession;

  constructor(
    private readonly preprocessor: DetectorPreprocessorService,
    private readonly postprocessor: DetectorPostprocessorService,
  ) {}

  async initialize?(): Promise<void> {
    ort.env.wasm.proxy = false;
    ort.env.wasm.numThreads = 16;
    ort.env.wasm.wasmPaths = '/assets/ort/';

    const buffer = await this.pullModel('/models/PP-OCRv5_mobile_det.onnx');
    this.session = await ort.InferenceSession.create(buffer, {
      executionProviders: ['wasm'],
    });
  }

  async execute(state: PipelineState): Promise<void> {
    // Preprocess the image
    const tensor = this.preprocessor.toTensor(state.fullImage!);
    // Run the model
    const output = await this.session.run({
      x: tensor,
    });
    // Postprocess the output to get detections
    const detections = this.postprocessor.process(
      output[this.session.outputNames[0]] as ort.Tensor,
      state.fullImage!.width,
      state.fullImage!.height,
      state.config?.detector,
    );
    // Update the state with the new detections
    state.detections = detections;
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
