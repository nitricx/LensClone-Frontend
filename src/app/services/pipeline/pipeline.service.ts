import { Injectable, signal } from '@angular/core';
import { PipelineState } from './pipeline-state';

@Injectable({
  providedIn: 'root',
})
export class PipelineService {
  readonly state = signal<PipelineState>({
    detector: {
      fps: 0,
      processingTimeMs: 0,
      detections: [],
      crops: [],
    },
    recognizer: {
      fps: 0,
      processingTimeMs: 0,
      recognizedText: 0,
    },
  });
}
