import { Detection } from '../text-detection/types';
import { PipelineConfig } from './pipeline-config.types';

export interface PipelineState {
  fullImage?: ImageData;
  detections: Detection[];
  processingTimeMs: number;
  config?: PipelineConfig;
}

export interface PipelineStage {
  initialize?(): void | Promise<void>;
  execute(state: PipelineState): void | Promise<void>;
}
