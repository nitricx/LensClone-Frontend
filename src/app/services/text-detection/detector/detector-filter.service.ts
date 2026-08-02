import { Injectable } from '@angular/core';
import { Detection } from '../types';
import { PipelineStage, PipelineState } from '../../pipeline/pipeline-state';

@Injectable({
  providedIn: 'root',
})
export class DetectorFilterService implements PipelineStage {
  execute(state: PipelineState): void {
    state.detections = state.detections.filter((d) => this.hasMinimumAspectRatio(d));
  }

  private hasMinimumAspectRatio(detection: Detection): boolean {
    const { width, height } = detection.boundingBox;
    return width / height >= 1.2;
  }
}
