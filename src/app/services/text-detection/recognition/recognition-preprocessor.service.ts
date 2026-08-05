import { Injectable } from '@angular/core';
import * as ort from 'onnxruntime-web';
import { TensorBufferPoolService } from '../tensor-buffer-pool/tensor-buffer-pool.service';

@Injectable({
  providedIn: 'root',
})
export class RecognitionPreprocessorService {
  private inputHeight!: number;
  private currentWidth = 0;

  private targetCanvas?: HTMLCanvasElement | OffscreenCanvas;
  private targetContext?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  private sourceCanvas?: HTMLCanvasElement | OffscreenCanvas;
  private sourceContext?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  private floatData?: Float32Array;
  private tensor?: ort.Tensor;

  constructor(private readonly bufferPool: TensorBufferPoolService) { }

  initialize(inputHeight: number): void {
    this.inputHeight = inputHeight;
  }

  toTensor(image: ImageData): ort.Tensor {
    this.ensureSourceCanvas(image.width, image.height);

    const scale = this.inputHeight / image.height;
    const targetWidth = Math.max(1, Math.round(image.width * scale));

    this.ensureTargetCanvas(targetWidth);
    this.resize(image, targetWidth);
    this.imageDataToTensor(targetWidth);

    return this.tensor!;
  }

  private ensureSourceCanvas(width: number, height: number): void {
    if (!this.sourceCanvas) {
      this.sourceCanvas =
        typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(width, height)
          : (() => {
            const c = document.createElement('canvas');
            c.width = width;
            c.height = height;
            return c;
          })();
      this.sourceContext = this.sourceCanvas.getContext('2d', {
        willReadFrequently: true,
      }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    } else if (this.sourceCanvas.width !== width || this.sourceCanvas.height !== height) {
      this.sourceCanvas.width = width;
      this.sourceCanvas.height = height;
    }
  }

  private ensureTargetCanvas(width: number): void {
    if (!this.targetCanvas) {
      this.targetCanvas =
        typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(width, this.inputHeight)
          : (() => {
            const c = document.createElement('canvas');
            c.width = width;
            c.height = this.inputHeight;
            return c;
          })();
      this.targetContext = this.targetCanvas.getContext('2d', {
        willReadFrequently: true,
      }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    } else if (
      this.targetCanvas.width !== width ||
      this.targetCanvas.height !== this.inputHeight
    ) {
      this.targetCanvas.width = width;
      this.targetCanvas.height = this.inputHeight;
    }

    if (this.currentWidth !== width) {
      this.currentWidth = width;
      const requiredSize = 3 * width * this.inputHeight;

      if (this.floatData) {
        this.bufferPool.releaseBuffer(this.floatData);
      }

      this.floatData = this.bufferPool.getBuffer(requiredSize);
      this.tensor = new ort.Tensor('float32', this.floatData, [1, 3, this.inputHeight, width]);
    }
  }

  private resize(image: ImageData, targetWidth: number): void {
    const source = this.sourceCanvas!;
    const sourceContext = this.sourceContext!;
    const targetContext = this.targetContext!;

    sourceContext.putImageData(image, 0, 0);

    targetContext.clearRect(0, 0, targetWidth, this.inputHeight);

    targetContext.drawImage(
      source as CanvasImageSource,
      0,
      0,
      image.width,
      image.height,
      0,
      0,
      targetWidth,
      this.inputHeight,
    );
  }

  private imageDataToTensor(width: number): void {
    const pixels = this.targetContext!.getImageData(0, 0, width, this.inputHeight).data;

    const floatData = this.floatData!;

    const area = width * this.inputHeight;

    for (let i = 0; i < area; i++) {
      const pixel = i * 4;

      floatData[i] = pixels[pixel] / 255;
      floatData[area + i] = pixels[pixel + 1] / 255;
      floatData[2 * area + i] = pixels[pixel + 2] / 255;
    }
  }
}

