import { Injectable } from '@angular/core';
import { Detection } from '../types';
import { PipelineStage, PipelineState } from '../../pipeline/pipeline-state';
import { DEFAULT_PIPELINE_CONFIG, CropperConfig } from '../../pipeline/pipeline-config.types';

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
      this.context = (this.canvas.getContext('2d', {
        willReadFrequently: true,
      }) || {
        putImageData: () => {},
        getImageData: (x: number, y: number, w: number, h: number) =>
          typeof ImageData !== 'undefined'
            ? new ImageData(w, h)
            : ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) } as unknown as ImageData),
      }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    } else if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  private cropRegion(detection: Detection, config: CropperConfig): ImageData {
    const box = detection.boundingBox;
    let padX = 0;
    let padY = 0;

    if (config.paddingMode === 'relative') {
      padX = Math.max(4, Math.round(box.width * (config.padding / 100)));
      padY = Math.max(4, Math.round(box.height * (config.padding / 100)));
    } else {
      padX = Math.max(0, config.padding);
      padY = Math.max(0, config.padding);
    }

    const canvasWidth = this.canvas!.width;
    const canvasHeight = this.canvas!.height;

    const x = Math.max(0, Math.floor(box.x - padX));
    const y = Math.max(0, Math.floor(box.y - padY));

    const right = Math.min(canvasWidth, Math.ceil(box.x + box.width + padX));
    const bottom = Math.min(canvasHeight, Math.ceil(box.y + box.height + padY));

    const width = Math.max(1, right - x);
    const height = Math.max(1, bottom - y);

    return this.context!.getImageData(x, y, width, height);
  }
}

