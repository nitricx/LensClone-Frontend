import { Injectable } from '@angular/core';
import * as ort from 'onnxruntime-web';
import { DetectorPreprocessorService } from './detector-preprocessor.service';
import { DetectorPostprocessorService } from './detector-postprocessor.service';
import { CroppedRegion, Detection } from './types';
import { DetectorCropperService } from './cropper.service';
import { PipelineService } from '../pipeline/pipeline.service';

@Injectable({
  providedIn: 'root',
})
export class DetectorService {
  constructor(
    private readonly cropper: DetectorCropperService,
    private readonly preprocessor: DetectorPreprocessorService,
    private readonly postprocessor: DetectorPostprocessorService,
    private readonly pipeline: PipelineService,
  ) {}
  public lastCrops: CroppedRegion[] = [];
  private session!: ort.InferenceSession;
  private lastFrameTime = performance.now();
  async initialize() {
    ort.env.wasm.proxy = false;
    ort.env.wasm.numThreads = 16;
    ort.env.wasm.wasmPaths = '/assets/ort/';

    const buffer = await this.pullModel('/models/PP-OCRv5_mobile_det.onnx');
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
    return buffer;
  }

  async detect(image: ImageData): Promise<Detection[]> {
    const start = performance.now();

    const tensor = this.preprocessor.toTensor(image);

    const output = await this.session.run({
      x: tensor,
    });

    const maps = output[this.session.outputNames[0]] as ort.Tensor;

    const detections = this.postprocessor.process(maps, image.width, image.height);
    this.lastCrops = this.cropper.crop(image, detections);
    const elapsed = performance.now() - start;
    const now = performance.now();
    const fps = 1000 / (now - this.lastFrameTime);
    this.pipeline.state.update((state) => ({
      ...state,

      detector: {
        ...state.detector,
        processingTimeMs: elapsed,
        fps: fps,
        detections: detections,
        crops: this.lastCrops,
        probabilityMap: maps,
      },
    }));

    this.lastFrameTime = now;
    return detections;
  }
}
