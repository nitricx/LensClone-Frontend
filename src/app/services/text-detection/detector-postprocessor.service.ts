import * as ort from 'onnxruntime-web';
import { Detection, Point } from './types';

export class DetectorPostprocessorService {
  constructor(
    private readonly thresholdValue: number,
    private readonly minArea: number,
  ) {}

  private readonly floodFillQueue: Point[] = [];

  process(output: ort.Tensor, scaleX: number, scaleY: number): Detection[] {
    const binary = this.threshold(output);

    const components = this.connectedComponents(binary, output.dims[3], output.dims[2]);

    const detections: Detection[] = [];

    for (const component of components) {
      if (component.length < this.minArea) continue;

      detections.push(this.buildDetection(component, output, scaleX, scaleY));
    }

    return detections;
  }

  private connectedComponents(binary: Uint8Array, width: number, height: number): Point[][] {
    const visited = new Uint8Array(width * height);
    const components: Point[][] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!binary[y * width + x]) continue;
        const index = y * width + x;
        if (visited[index]) continue;

        components.push(this.floodFill(binary, visited, x, y));
      }
    }

    return components;
  }

  private buildDetection(
    component: Point[],
    output: ort.Tensor,
    scaleX: number,
    scaleY: number,
  ): Detection {
    let minX = Infinity;
    let minY = Infinity;

    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of component) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);

      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    return {
      points: [
        [minX * scaleX, minY * scaleY],
        [maxX * scaleX, minY * scaleY],
        [maxX * scaleX, maxY * scaleY],
        [minX * scaleX, maxY * scaleY],
      ],

      score: this.computeScore(component, output),
    };
  }

  private computeScore(component: Point[], output: ort.Tensor): number {
    const [, , , width] = output.dims;

    const data = output.data as Float32Array;

    let sum = 0;

    for (const p of component) {
      sum += data[p.y * width + p.x];
    }

    return sum / component.length;
  }

  private floodFill(
    binary: Uint8Array,
    visited: Uint8Array,
    startX: number,
    startY: number,
  ): Point[] {
    const component: Point[] = [];
    this.floodFillQueue.length = 0;
    this.floodFillQueue.push({ x: startX, y: startY });

    while (this.floodFillQueue.length) {
      const point = this.floodFillQueue.pop()!;

      if (point.x < 0 || point.y < 0 || point.y >= binary.length || point.x >= binary[0]) continue;

      const index = point.y * binary[0] + point.x;
      if (visited[index]) continue;

      visited[index] = 1;

      if (!binary[index]) continue;

      component.push(point);

      this.floodFillQueue.push(
        { x: point.x + 1, y: point.y },
        { x: point.x - 1, y: point.y },
        { x: point.x, y: point.y + 1 },
        { x: point.x, y: point.y - 1 },
      );
    }

    return component;
  }

  private threshold(output: ort.Tensor): Uint8Array {
    const [, , height, width] = output.dims;

    const data = output.data as Float32Array;

    const binary = new Uint8Array(width * height);

    let count = 0;

    for (let i = 0; i < binary.length; i++) {
      if (data[i] >= this.thresholdValue) {
        binary[i] = 1;
        count++;
      }
    }

    console.log('Pixels above threshold:', count);

    return binary;
  }
}
