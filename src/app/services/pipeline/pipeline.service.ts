import { Injectable, signal } from '@angular/core';
import { PipelineState } from './pipeline-state';
import { DebugSettings } from '../../features/debug/debug-settings';

@Injectable({
  providedIn: 'root',
})
export class PipelineService {
  readonly debugSettings = signal<DebugSettings>({
    probabilityMap: false,
    boundingBoxes: true,
  });

  readonly state = signal<PipelineState>({
    detector: {
      fps: 0,
      processingTimeMs: 0,
      detections: [],
      crops: [],
      probabilityMap: null,
    },
    recognizer: {
      fps: 0,
      processingTimeMs: 0,
      recognizedText: 0,
    },
  });
}
