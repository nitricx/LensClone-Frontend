import { Detection } from '../text-detection/types';

export interface PipelineState {
  detector: DetectorState;
}

interface DetectorState extends Timings {
  detections: Detection[];
}

interface Timings {
  processingTimeMs: number;
}
