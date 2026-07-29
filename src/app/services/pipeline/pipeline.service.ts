import { Injectable, signal } from '@angular/core';
import { PipelineState } from './pipeline-state';
import { DebugSettings } from '../../features/debug/debug-settings';
import { DetectorService } from '../text-detection/detector.service';
import { BoundingBoxRendererService } from '../visualization/boundingbox-renderer.service';

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

  constructor(private readonly detector: DetectorService) {}

  async initialize() {
    await this.detector.initialize();
  }

  async recognizeText(image: ImageData): Promise<void> {
    const start = performance.now();

    const detections = await this.detector.detect(image);

    this.state.update((state) => ({
      ...state,
      detector: {
        ...state.detector,
        detections,
        processingTimeMs: performance.now() - start,
      },
    }));
  }
}
