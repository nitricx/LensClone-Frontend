import { CroppedRegion, Detection } from '../text-detection/types';
import * as ort from 'onnxruntime-web';

export interface PipelineState {
  detector: DetectorState;
  recognizer: RecognizerState;
}

export interface DetectorState {
  fps: number;
  processingTimeMs: number;

  detections: Detection[];
  crops: CroppedRegion[];

  probabilityMap: ort.Tensor | null;
}

export interface RecognizerState {
  fps: number;
  processingTimeMs: number;

  recognizedText: number;
}
