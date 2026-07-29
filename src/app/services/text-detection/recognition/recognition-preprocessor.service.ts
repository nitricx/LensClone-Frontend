import { Injectable } from '@angular/core';
import * as ort from 'onnxruntime-web';

@Injectable({
  providedIn: 'root',
})
export class RecognitionPreprocessorService {
  private inputHeight!: number;

  private currentWidth = 0;

  private targetCanvas?: OffscreenCanvas;
  private targetContext?: OffscreenCanvasRenderingContext2D;

  private sourceCanvas?: OffscreenCanvas;
  private sourceContext?: OffscreenCanvasRenderingContext2D;

  private floatData?: Float32Array;
  private tensor?: ort.Tensor;

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
    if (
      this.sourceCanvas &&
      this.sourceCanvas.width === width &&
      this.sourceCanvas.height === height
    ) {
      return;
    }

    this.sourceCanvas = new OffscreenCanvas(width, height);
    this.sourceContext = this.sourceCanvas.getContext('2d', {
      willReadFrequently: true,
    })!;
  }

  private ensureTargetCanvas(width: number): void {
    if (this.currentWidth === width) {
      return;
    }

    this.currentWidth = width;

    this.targetCanvas = new OffscreenCanvas(width, this.inputHeight);
    this.targetContext = this.targetCanvas.getContext('2d', {
      willReadFrequently: true,
    })!;

    const requiredSize = 3 * width * this.inputHeight;

    if (!this.floatData || this.floatData.length !== requiredSize) {
      this.floatData = new Float32Array(requiredSize);
    }

    this.tensor = new ort.Tensor('float32', this.floatData, [1, 3, this.inputHeight, width]);
  }

  private resize(image: ImageData, targetWidth: number): void {
    const source = this.sourceCanvas!;
    const sourceContext = this.sourceContext!;
    const targetContext = this.targetContext!;

    sourceContext.putImageData(image, 0, 0);

    targetContext.clearRect(0, 0, targetWidth, this.inputHeight);

    targetContext.drawImage(
      source,
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
