import * as ort from 'onnxruntime-web';
import { PreprocessResult } from './types';

export class DetectorPreprocessorService {
  constructor(private readonly inputScaling: number) {}
  private floatData?: Float32Array;
  process(image: ImageData): PreprocessResult {
    const tensor = this.imageDataToTensor(image);

    return {
      tensor,
      scaleX: this.inputScaling,
      scaleY: this.inputScaling,
    };
  }

  private imageDataToTensor(image: ImageData): ort.Tensor {
    const pixels = image.data;

    const requiredSize = 3 * image.width * image.height;

    if (!this.floatData || this.floatData.length !== requiredSize) {
      this.floatData = new Float32Array(requiredSize);
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

    return new ort.Tensor('float32', this.floatData, [1, 3, image.height, image.width]);
  }
}
