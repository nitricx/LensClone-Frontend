import { Injectable } from '@angular/core';
import { Detection } from './types';
import { PipelineStage, PipelineState } from '../pipeline/pipeline-state';
import { DEFAULT_PIPELINE_CONFIG, CropperConfig } from '../pipeline/pipeline-config.types';

@Injectable({
  providedIn: 'root',
})
export class DetectorCropperService implements PipelineStage {
  readonly name = 'cropper';

  private canvas?: HTMLCanvasElement | OffscreenCanvas;
  private context?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  execute(state: PipelineState): void {
    if (state.detections.length === 0) {
      return;
    }

    const cropperConfig = state.config?.cropper ?? DEFAULT_PIPELINE_CONFIG.cropper;
    const width = state.fullImage!.width;
    const height = state.fullImage!.height;

    this.ensureCanvas(width, height);

    if (!this.context) {
      throw new Error('Unable to create canvas context');
    }

    this.context.putImageData(state.fullImage!, 0, 0);

    state.detections = state.detections.map((detection) => {
      if (detection.isReused && !detection.needsRefresh) {
        return detection;
      }
      return {
        ...detection,
        crop: this.cropRegion(detection, cropperConfig),
      };
    });
  }

  private ensureCanvas(width: number, height: number): void {
    if (!this.canvas) {
      this.canvas =
        typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(width, height)
          : (() => {
              const c = document.createElement('canvas');
              c.width = width;
              c.height = height;
              return c;
            })();
      this.context = this.canvas.getContext('2d', {
        willReadFrequently: true,
      }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    } else if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  private cropRegion(detection: Detection, config: CropperConfig): ImageData {
    const box = detection.boundingBox;
    const padding = config.padding;

    const canvasWidth = this.canvas!.width;
    const canvasHeight = this.canvas!.height;

    const x = Math.max(0, Math.floor(box.x - padding));
    const y = Math.max(0, Math.floor(box.y - padding));

    const right = Math.min(canvasWidth, Math.ceil(box.x + box.width + padding));
    const bottom = Math.min(canvasHeight, Math.ceil(box.y + box.height + padding));

    const width = right - x;
    const height = bottom - y;

    return this.context!.getImageData(x, y, width, height);
  }
}

