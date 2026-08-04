import { Injectable } from '@angular/core';
import * as ort from 'onnxruntime-web';
import { TensorBufferPoolService } from '../tensor-buffer-pool.service';

@Injectable({
  providedIn: 'root',
})
export class DetectorPreprocessorService {
  private tensor?: ort.Tensor;
  private floatData?: Float32Array;

  private srcCanvas?: HTMLCanvasElement | OffscreenCanvas;
  private srcContext?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  private dstCanvas?: HTMLCanvasElement | OffscreenCanvas;
  private dstContext?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  constructor(private readonly bufferPool: TensorBufferPoolService) {}

  toTensor(image: ImageData, maxSide?: number, scaleFactor?: number): ort.Tensor {
    if (
      scaleFactor !== undefined &&
      scaleFactor !== null &&
      (scaleFactor <= 0 || scaleFactor > 1 || Number.isNaN(scaleFactor))
    ) {
      throw new Error(
        `Invalid scaleFactor '${scaleFactor}'. Expected a value between 0 (exclusive) and 1 (inclusive).`,
      );
    }

    if (maxSide !== undefined && maxSide !== null && (maxSide < 0 || Number.isNaN(maxSide))) {
      throw new Error(`Invalid maxSide '${maxSide}'. Expected a non-negative number.`);
    }

    let targetImage = image;

    let scale = scaleFactor ?? 1.0;

    if (maxSide && maxSide > 0) {
      const maxDim = Math.max(image.width, image.height);
      if (maxDim > maxSide) {
        const maxSideScale = maxSide / maxDim;
        scale = scaleFactor ? Math.min(scale, maxSideScale) : maxSideScale;
      }
    }

    if (scale < 1.0) {
      const rawWidth = Math.max(1, Math.round(image.width * scale));
      const rawHeight = Math.max(1, Math.round(image.height * scale));
      const targetWidth = Math.max(32, Math.round(rawWidth / 32) * 32);
      const targetHeight = Math.max(32, Math.round(rawHeight / 32) * 32);
      targetImage = this.downscaleImage(image, targetWidth, targetHeight);
    }

    return this.imageDataToTensor(targetImage);
  }

  private downscaleImage(image: ImageData, targetWidth: number, targetHeight: number): ImageData {
    if (this.canUseCanvas()) {
      try {
        return this.canvasResize(image, targetWidth, targetHeight);
      } catch {
        // Fallback to CPU bilinear resize if canvas fails
      }
    }
    return this.cpuBilinearResize(image, targetWidth, targetHeight);
  }

  private canUseCanvas(): boolean {
    return typeof OffscreenCanvas !== 'undefined' || typeof document !== 'undefined';
  }

  private canvasResize(image: ImageData, dstW: number, dstH: number): ImageData {
    const srcW = image.width;
    const srcH = image.height;

    if (!this.srcCanvas) {
      this.srcCanvas =
        typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(srcW, srcH)
          : (() => {
              const c = document.createElement('canvas');
              c.width = srcW;
              c.height = srcH;
              return c;
            })();
      this.srcContext = this.srcCanvas.getContext('2d', { willReadFrequently: true }) as any;
    } else if (this.srcCanvas.width !== srcW || this.srcCanvas.height !== srcH) {
      this.srcCanvas.width = srcW;
      this.srcCanvas.height = srcH;
    }

    if (!this.dstCanvas) {
      this.dstCanvas =
        typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(dstW, dstH)
          : (() => {
              const c = document.createElement('canvas');
              c.width = dstW;
              c.height = dstH;
              return c;
            })();
      this.dstContext = this.dstCanvas.getContext('2d', { willReadFrequently: true }) as any;
    } else if (this.dstCanvas.width !== dstW || this.dstCanvas.height !== dstH) {
      this.dstCanvas.width = dstW;
      this.dstCanvas.height = dstH;
    }

    if (!this.srcContext || !this.dstContext) {
      throw new Error('Canvas context not available');
    }

    this.srcContext.putImageData(image, 0, 0);
    this.dstContext.drawImage(this.srcCanvas as any, 0, 0, srcW, srcH, 0, 0, dstW, dstH);
    return this.dstContext.getImageData(0, 0, dstW, dstH);
  }

  private cpuBilinearResize(image: ImageData, dstW: number, dstH: number): ImageData {
    const srcData = image.data;
    const srcW = image.width;
    const srcH = image.height;
    const dstData = new Uint8ClampedArray(dstW * dstH * 4);
    const xRatio = srcW / dstW;
    const yRatio = srcH / dstH;

    for (let y = 0; y < dstH; y++) {
      const srcY = y * yRatio;
      const y1 = Math.floor(srcY);
      const y2 = Math.min(srcH - 1, y1 + 1);
      const yWeight = srcY - y1;

      for (let x = 0; x < dstW; x++) {
        const srcX = x * xRatio;
        const x1 = Math.floor(srcX);
        const x2 = Math.min(srcW - 1, x1 + 1);
        const xWeight = srcX - x1;

        const idx11 = (y1 * srcW + x1) * 4;
        const idx12 = (y1 * srcW + x2) * 4;
        const idx21 = (y2 * srcW + x1) * 4;
        const idx22 = (y2 * srcW + x2) * 4;

        const dstIdx = (y * dstW + x) * 4;

        for (let c = 0; c < 4; c++) {
          const top = srcData[idx11 + c] * (1 - xWeight) + srcData[idx12 + c] * xWeight;
          const bottom = srcData[idx21 + c] * (1 - xWeight) + srcData[idx22 + c] * xWeight;
          dstData[dstIdx + c] = Math.round(top * (1 - yWeight) + bottom * yWeight);
        }
      }
    }

    return new ImageData(dstData, dstW, dstH);
  }

  private imageDataToTensor(image: ImageData): ort.Tensor {
    const pixels = image.data;
    const requiredSize = 3 * image.width * image.height;

    if (!this.floatData || this.floatData.length !== requiredSize) {
      if (this.floatData) {
        this.bufferPool.releaseBuffer(this.floatData);
      }
      this.floatData = this.bufferPool.getBuffer(requiredSize);
      this.tensor = undefined;
    }

    const area = image.width * image.height;

    for (let i = 0; i < area; i++) {
      const pixelIndex = i * 4;

      const r = pixels[pixelIndex] / 255;
      const g = pixels[pixelIndex + 1] / 255;
      const b = pixels[pixelIndex + 2] / 255;

      this.floatData[i] = (r - 0.485) / 0.229;
      this.floatData[area + i] = (g - 0.456) / 0.224;
      this.floatData[2 * area + i] = (b - 0.406) / 0.225;
    }
    if (
      !this.tensor ||
      this.tensor.dims[2] !== image.height ||
      this.tensor.dims[3] !== image.width
    ) {
      this.tensor = new ort.Tensor('float32', this.floatData, [1, 3, image.height, image.width]);
    }
    return this.tensor;
  }
}


