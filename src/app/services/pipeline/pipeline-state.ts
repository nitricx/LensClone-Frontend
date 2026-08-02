import { Detection } from '../text-detection/types';

export interface PipelineState {
  fullImage?: ImageData;
  detections: Detection[];
  processingTimeMs: number;
}

export interface PipelineStage {
  initialize?(): void | Promise<void>;
  execute(state: PipelineState): void | Promise<void>;
}
