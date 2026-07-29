import { Injectable, signal } from '@angular/core';
import { PipelineState } from './pipeline-state';
import { DebugSettings } from '../../features/debug/debug-settings';
import { DetectorService } from '../text-detection/detector.service';
import { DetectorCropperService } from '../text-detection/cropper.service';
import { DetectorFilterService } from '../text-detection/detector-filter.service';

@Injectable({
  providedIn: 'root',
})
export class PipelineService {
  readonly debugSettings = signal<DebugSettings>({
    croppedRegions: true,
    boundingBoxes: true,
  });

  readonly state = signal<PipelineState>({
    detector: {
      processingTimeMs: 0,
      detections: [],
    },
    cropper: {
      processingTimeMs: 0,
      crops: [],
    },
    recognizer: {
      processingTimeMs: 0,
      recognizedText: 0,
    },
  });

  constructor(
    private readonly detector: DetectorService,
    private readonly detectorFilter: DetectorFilterService,
    private readonly cropper: DetectorCropperService,
  ) {}

  async initialize() {
    await this.detector.initialize();
  }

  async execute(image: ImageData) {
    this.recognizeText(image);
    this.filterDetections();
    this.cropDetections(image);
  }

  private async recognizeText(image: ImageData): Promise<void> {
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

  private filterDetections(): void {
    const detections = this.detectorFilter.filter(this.state().detector.detections);
    this.state.update((state) => ({
      ...state,
      detector: {
        ...state.detector,
        detections,
      },
    }));
  }

  private cropDetections(image: ImageData): void {
    const start = performance.now();

    const crops = this.cropper.crop(image, this.state().detector.detections);
    this.state.update((state) => ({
      ...state,
      cropper: {
        ...state.cropper,
        crops,
        processingTimeMs: performance.now() - start,
      },
    }));
  }
}
