import { Injectable } from '@angular/core';
import { Detection } from './types';
import { PipelineStage, PipelineState } from '../pipeline/pipeline-state';
import { DEFAULT_PIPELINE_CONFIG, CropperConfig } from '../pipeline/pipeline-config.types';

@Injectable({
  providedIn: 'root',
})
export class DetectorCropperService implements PipelineStage {
  execute(state: PipelineState): void {
    if (state.detections.length === 0) {
      return;
    }

    const cropperConfig = state.config?.cropper ?? DEFAULT_PIPELINE_CONFIG.cropper;

    const width = state.fullImage!.width;
    const height = state.fullImage!.height;
    const canvas: HTMLCanvasElement | OffscreenCanvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : (() => {
            const c = document.createElement('canvas');
            c.width = width;
            c.height = height;
            return c;
          })();

    const context = canvas.getContext('2d', {
      willReadFrequently: true,
    }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

    if (!context) {
      throw new Error('Unable to create canvas context');
    }

    context.putImageData(state.fullImage!, 0, 0);

    state.detections = state.detections.map((detection) => ({
      ...detection,
      crop: this.cropRegion(canvas, detection, cropperConfig),
    }));
  }

  private cropRegion(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    detection: Detection,
    config: CropperConfig,
  ): ImageData {
    const context = canvas.getContext('2d') as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;

    if (!context) {
      throw new Error('Unable to create canvas context');
    }

    const box = detection.boundingBox;
    const padding = config.padding;

    const x = Math.max(0, Math.floor(box.x - padding));
    const y = Math.max(0, Math.floor(box.y - padding));

    const right = Math.min(canvas.width, Math.ceil(box.x + box.width + padding));
    const bottom = Math.min(canvas.height, Math.ceil(box.y + box.height + padding));

    const width = right - x;
    const height = bottom - y;

    return context.getImageData(x, y, width, height);
  }
}
