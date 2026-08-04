import { Injectable } from '@angular/core';
import { Detection } from '../types';
import { PipelineStage, PipelineState } from '../../pipeline/pipeline-state';
import { DEFAULT_PIPELINE_CONFIG } from '../../pipeline/pipeline-config.types';

@Injectable({
  providedIn: 'root',
})
export class DetectorFilterService implements PipelineStage {
  readonly name = 'detectorFilter';

  execute(state: PipelineState): void {
    const minAspectRatio =
      state.config?.detector?.minAspectRatio ?? DEFAULT_PIPELINE_CONFIG.detector.minAspectRatio;
    state.detections = state.detections.filter((d) => this.hasMinimumAspectRatio(d, minAspectRatio));
  }

  private hasMinimumAspectRatio(detection: Detection, minAspectRatio: number): boolean {
    const { width, height } = detection.boundingBox;
    return height > 0 && width / height >= minAspectRatio;
  }
}
