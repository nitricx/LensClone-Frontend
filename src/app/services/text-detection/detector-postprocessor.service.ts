import * as ort from 'onnxruntime-web';
import { Detection, Point } from './types';

export class DetectorPostprocessorService {
  constructor(
    private readonly thresholdValue: number,
    private readonly minArea: number,
  ) {}

  process(output: ort.Tensor, scaleX: number, scaleY: number): Detection[] {
    const binary = this.threshold(output);

    const components = this.connectedComponents(binary);

    const detections: Detection[] = [];

    for (const component of components) {
      if (component.length < this.minArea) continue;

      detections.push(this.buildDetection(component, output, scaleX, scaleY));
    }

    return detections;
  }
  private connectedComponents(binary: boolean[][]): Point[][] {
    const height = binary.length;
    const width = binary[0].length;

    const visited = Array.from({ length: height }, () => Array(width).fill(false));

    const components: Point[][] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!binary[y][x]) continue;

        if (visited[y][x]) continue;

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
    binary: boolean[][],
    visited: boolean[][],
    startX: number,
    startY: number,
  ): Point[] {
    const component: Point[] = [];

    const queue: Point[] = [{ x: startX, y: startY }];

    while (queue.length) {
      const point = queue.pop()!;

      if (point.x < 0 || point.y < 0 || point.y >= binary.length || point.x >= binary[0].length)
        continue;

      if (visited[point.y][point.x]) continue;

      visited[point.y][point.x] = true;

      if (!binary[point.y][point.x]) continue;

      component.push(point);

      queue.push(
        { x: point.x + 1, y: point.y },
        { x: point.x - 1, y: point.y },
        { x: point.x, y: point.y + 1 },
        { x: point.x, y: point.y - 1 },
      );
    }

    return component;
  }
  private threshold(output: ort.Tensor): boolean[][] {
    const [, , height, width] = output.dims;

    const data = output.data as Float32Array;

    const result: boolean[][] = [];
    let count = 0;
    for (let y = 0; y < height; y++) {
      const row: boolean[] = [];

      for (let x = 0; x < width; x++) {
        if (data[y * width + x] >= this.thresholdValue) {
          count++;
        }
        row.push(data[y * width + x] >= this.thresholdValue);
      }

      result.push(row);
    }
    console.log('Pixels above threshold:', count);
    return result;
  }
}
