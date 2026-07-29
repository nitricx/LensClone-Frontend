import { CroppedRegion, Detection } from '../text-detection/types';

export interface PipelineState {
  detector: DetectorState;
  cropper: CropperState;
  recognizer: RecognizerState;
}

interface DetectorState extends Timings {
  detections: Detection[];
}

interface CropperState extends Timings {
  crops: CroppedRegion[];
}
interface RecognizerState extends Timings {
  recognizedText: string[];
}

interface Timings {
  processingTimeMs: number;
}
