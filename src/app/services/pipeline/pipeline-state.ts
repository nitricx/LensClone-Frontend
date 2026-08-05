import { Detection, GpsCoordinates, ProductOffer } from '../text-detection/types';
import { PipelineConfig } from './pipeline-config.types';

export interface PipelineState {
  fullImage?: ImageData;
  detections: Detection[];
  offers?: ProductOffer[];
  coordinates?: GpsCoordinates;
  processingTimeMs: number;
  stageMetrics?: Record<string, number>;
  config?: PipelineConfig;
}

export interface PipelineStage {
  readonly name?: string;
  initialize?(): void | Promise<void>;
  execute(state: PipelineState): void | Promise<void>;
}
