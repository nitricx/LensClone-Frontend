import { CroppedRegion, Detection } from '../text-detection/types';

export interface PipelineState {
  detector: DetectorState;
  recognizer: RecognizerState;
}

export interface DetectorState {
  fps: number;
  processingTimeMs: number;

  detections: Detection[];
  crops: CroppedRegion[];
}

export interface RecognizerState {
  fps: number;
  processingTimeMs: number;

  recognizedText: number;
}
