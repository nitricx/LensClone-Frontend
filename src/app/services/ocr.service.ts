import { Injectable } from '@angular/core';
import * as ort from 'onnxruntime-web';

@Injectable({
  providedIn: 'root',
})
export class OCRService {
  private detector!: ort.InferenceSession;
  private recognizer!: ort.InferenceSession;

  async initialize() {
    const detBuffer = await this.pullModel('/models/det.onnx');
    this.detector = await ort.InferenceSession.create(detBuffer, {
      executionProviders: ['wasm'],
    });

    // const recBuffer = await this.pullModel('/models/rec.onnx');
    // this.recognizer = await ort.InferenceSession.create(recBuffer, {
    //   executionProviders: ['wasm'],
    // });
  }

  async pullModel(modelUrl: string): Promise<ArrayBuffer> {
    const response = await fetch(modelUrl);
    if (!response.ok) {
      throw new Error(
        `OCR Model file not reachable: ${response.status} ${response.statusText} at ${modelUrl}`,
      );
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();

    if (contentType?.includes('text/html') || buffer.byteLength < 1000) {
      throw new Error(
        `OCR Model file looks invalid (content-type: ${contentType}, size: ${buffer.byteLength} bytes). ` +
          `Likely a dev-server fallback or a Git LFS pointer file instead of the real model.`,
      );
    }

    console.log(`OCR Model OK: ${buffer.byteLength} bytes, type: ${contentType}`);
    return buffer;
  }

  async detect(image: ImageData) {
    const input = this.imageToTensor(image);

    const result = await this.detector.run({
      input,
    });

    return result;
  }

  private imageToTensor(image: ImageData): ort.Tensor {
    const width = image.width;
    const height = image.height;

    const float = new Float32Array(width * height * 3);

    let j = 0;

    for (let i = 0; i < image.data.length; i += 4) {
      float[j++] = image.data[i] / 255;
      float[j++] = image.data[i + 1] / 255;
      float[j++] = image.data[i + 2] / 255;
    }

    return new ort.Tensor('float32', float, [1, height, width, 3]);
  }
}
