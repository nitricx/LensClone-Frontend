import { Injectable } from '@angular/core';
import * as ort from 'onnxruntime-web';

@Injectable({
  providedIn: 'root',
})
export class DebugCanvasService {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;

  initialize(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  showProbabilityMap(tensor: ort.Tensor) {
    console.log('Drawing...');
    console.log(this.canvas);
    console.log(this.ctx);
    this.ctx.fillStyle = 'red';
    this.ctx.fillRect(0, 0, 100, 100);
    const [, , height, width] = tensor.dims;

    this.canvas.width = width;
    this.canvas.height = height;

    const image = this.ctx.createImageData(width, height);

    const pixels = image.data;

    const data = tensor.data as Float32Array;

    for (let i = 0; i < data.length; i++) {
      const value = Math.max(0, Math.min(255, data[i] * 255));

      const p = i * 4;

      pixels[p] = value;
      pixels[p + 1] = value;
      pixels[p + 2] = value;
      pixels[p + 3] = 255;
    }

    this.ctx.putImageData(image, 0, 0);
  }

  showMinMax(maps: ort.Tensor) {
    const data = maps.data as Float32Array;

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let sum = 0;

    for (const v of data) {
      min = Math.min(min, v);
      max = Math.max(max, v);
      sum += v;
    }

    console.log({
      min,
      max,
      avg: sum / data.length,
    });
  }
}
