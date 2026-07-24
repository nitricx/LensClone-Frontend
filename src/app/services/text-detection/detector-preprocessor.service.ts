import * as ort from 'onnxruntime-web';
import { PreprocessResult } from './types';

export class DetectorPreprocessorService {
  constructor(
    private readonly inputWidth: number,
    private readonly inputHeight: number,
  ) {}

  process(image: ImageData): PreprocessResult {
    const resized = this.resize(image);

    const tensor = this.imageDataToTensor(resized);

    return {
      tensor,
      scaleX: image.width / this.inputWidth,
      scaleY: image.height / this.inputHeight,
    };
  }

  private resize(image: ImageData): ImageData {
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = image.width;
    sourceCanvas.height = image.height;

    const sourceCtx = sourceCanvas.getContext('2d')!;
    sourceCtx.putImageData(image, 0, 0);

    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = this.inputWidth;
    resizedCanvas.height = this.inputHeight;

    const resizedCtx = resizedCanvas.getContext('2d')!;

    resizedCtx.drawImage(sourceCanvas, 0, 0, this.inputWidth, this.inputHeight);

    return resizedCtx.getImageData(0, 0, this.inputWidth, this.inputHeight);
  }

  private imageDataToTensor(image: ImageData): ort.Tensor {
    const pixels = image.data;

    const floatData = new Float32Array(3 * this.inputWidth * this.inputHeight);

    const area = this.inputWidth * this.inputHeight;

    for (let i = 0; i < area; i++) {
      const pixelIndex = i * 4;

      const r = pixels[pixelIndex] / 255;
      const g = pixels[pixelIndex + 1] / 255;
      const b = pixels[pixelIndex + 2] / 255;

      floatData[i] = (r - 0.485) / 0.229;
      floatData[area + i] = (g - 0.456) / 0.224;
      floatData[2 * area + i] = (b - 0.406) / 0.225;
    }

    return new ort.Tensor('float32', floatData, [1, 3, this.inputHeight, this.inputWidth]);
  }
}
