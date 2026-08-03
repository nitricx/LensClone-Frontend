import { Injectable, signal } from '@angular/core';
import { PipelineStage, PipelineState } from './pipeline-state';
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
    fullImage: undefined,
    detections: [],
    processingTimeMs: 0,
  });

  private readonly stages: PipelineStage[];

  constructor(
    private readonly detector: DetectorService,
    private readonly detectorFilter: DetectorFilterService,
    private readonly cropper: DetectorCropperService,
    private readonly recognizer: RecognitionService,
    private readonly dictionary: DictionaryMatcherService,
    private readonly lineGroupingService: LineGroupingService,
  ) {
    this.stages = [detector, detectorFilter, cropper, recognizer, dictionary, lineGroupingService];
  }

  async initialize() {
    for (const stage of this.stages) {
      await stage.initialize?.();
    }
  }

  async execute(image: ImageData) {
    this.state.update((state) => ({
      ...state,
      fullImage: image,
    }));
    const state = this.state();
    for (const stage of this.stages) {
      await stage.execute(state);
    }
  }
}
