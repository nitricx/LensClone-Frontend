import { Injectable } from '@angular/core';
import { Detection } from './types';
import { PipelineStage, PipelineState } from '../pipeline/pipeline-state';

@Injectable({
  providedIn: 'root',
})
export class DetectorCropperService implements PipelineStage {
  private readonly padding: number = 4;

  execute(state: PipelineState): void {
    if (state.detections.length === 0) {
      return;
    }

    const canvas = document.createElement('canvas');

    canvas.width = state.fullImage!.width;
    canvas.height = state.fullImage!.height;

    const context = canvas.getContext('2d', {
      willReadFrequently: true,
    });

    if (!context) {
      throw new Error('Unable to create canvas context');
    }

    context.putImageData(state.fullImage!, 0, 0);

    state.detections = state.detections.map((detection) => ({
      ...detection,
      crop: this.cropRegion(canvas, detection),
    }));
  }

  private cropRegion(canvas: HTMLCanvasElement, detection: Detection): ImageData {
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Unable to create canvas context');
    }

    const box = detection.boundingBox;

    const x = Math.max(0, Math.floor(box.x - this.padding));

    const y = Math.max(0, Math.floor(box.y - this.padding));

    const right = Math.min(canvas.width, Math.ceil(box.x + box.width + this.padding));

    const bottom = Math.min(canvas.height, Math.ceil(box.y + box.height + this.padding));

    const width = right - x;
    const height = bottom - y;

    return context.getImageData(x, y, width, height);
  }
}
