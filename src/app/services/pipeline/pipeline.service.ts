import { Injectable, signal } from '@angular/core';
import { PipelineState } from './pipeline-state';
import { DebugSettings } from '../../features/debug/debug-settings';

import { DetectorCropperService } from '../text-detection/cropper.service';
import { DetectorFilterService } from '../text-detection/detector/detector-filter.service';
import { RecognitionService } from '../text-detection/recognition/recognition.service';
import { DetectorService } from '../text-detection/detector/detector.service';
import { DictionaryMatcherService } from '../text-detection/dictionary/dictionary-matcher.service';
import { LineGroupingService } from '../text-detection/line-grouping.service';

@Injectable({
  providedIn: 'root',
})
export class PipelineService {
  readonly debugSettings = signal<DebugSettings>({
    croppedRegions: true,
    boundingBoxes: true,
    recognizedText: true,
    canonicalText: true,
    lineGrouping: true,
  });

  readonly state = signal<PipelineState>({
    detector: {
      processingTimeMs: 0,
      detections: [],
    },
  });

  constructor(
    private readonly detector: DetectorService,
    private readonly detectorFilter: DetectorFilterService,
    private readonly cropper: DetectorCropperService,
    private readonly recognizer: RecognitionService,
    private readonly dictionary: DictionaryMatcherService,
    private readonly lineGroupingService: LineGroupingService,
  ) {}

  async initialize() {
    await this.detector.initialize();
    await this.recognizer.initialize();
  }

  async execute(image: ImageData) {
    await this.detectText(image);
    this.filterDetections();
    this.cropDetections(image);
    await this.recognizeText();
    this.interpretText();
  }

  private async detectText(image: ImageData): Promise<void> {
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

    const detections = this.cropper.crop(image, this.state().detector.detections);

    this.state.update((state) => ({
      ...state,
      detector: {
        ...state.detector,
        detections,
        processingTimeMs: performance.now() - start,
      },
    }));
  }

  private async recognizeText(): Promise<void> {
    const start = performance.now();

    const detections = await this.recognizer.recognize(this.state().detector.detections);

    this.state.update((state) => ({
      ...state,
      detector: {
        ...state.detector,
        detections,
        processingTimeMs: performance.now() - start,
      },
    }));
  }

  private interpretText(): void {
    const start = performance.now();

    const detections = this.dictionary.match(this.state().detector.detections);

    this.state.update((state) => ({
      ...state,
      detector: {
        ...state.detector,
        detections,
        processingTimeMs: performance.now() - start,
      },
    }));
  }

  private lineGrouping(): void {
    const start = performance.now();

    const detections = this.lineGroupingService.group(this.state().detector.detections);

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
