import * as ort from 'onnxruntime-web';
import { Detection, Point } from '../types';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DetectorPostprocessorService {
  private readonly floodFillQueue: Point[] = [];
  private readonly thresholdValue: number = 0.3;
  private readonly minArea: number = 10;

  process(output: ort.Tensor, imageWidth: number, imageHeight: number): Detection[] {
    const [, , height, width] = output.dims;

    const scaleX = imageWidth / width;
    const scaleY = imageHeight / height;

    const binary = this.threshold(output);
    const components = this.connectedComponents(binary, width, height);

    const detections: Detection[] = [];

    for (const component of components) {
      if (component.length < this.minArea) {
        continue;
      }

      detections.push(this.buildDetection(component, output, scaleX, scaleY));
    }

    return detections;
  }

  private connectedComponents(binary: Uint8Array, width: number, height: number): Point[][] {
    const visited = new Uint8Array(width * height);
    const components: Point[][] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;

        if (!binary[index] || visited[index]) {
          continue;
        }

        components.push(this.floodFill(binary, visited, width, height, x, y));
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
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    return {
      score: this.computeScore(component, output),
      boundingBox: {
        x: minX * scaleX,
        y: minY * scaleY,
        width: (maxX - minX) * scaleX,
        height: (maxY - minY) * scaleY,
      },
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
    width: number,
    height: number,
    startX: number,
    startY: number,
  ): Point[] {
    const component: Point[] = [];

    this.floodFillQueue.length = 0;
    this.floodFillQueue.push({ x: startX, y: startY });

    while (this.floodFillQueue.length > 0) {
      const point = this.floodFillQueue.pop()!;

      if (point.x < 0 || point.x >= width || point.y < 0 || point.y >= height) {
        continue;
      }

      const index = point.y * width + point.x;

      if (visited[index]) {
        continue;
      }

      visited[index] = 1;

      if (!binary[index]) {
        continue;
      }

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

    for (let i = 0; i < binary.length; i++) {
      binary[i] = data[i] >= this.thresholdValue ? 1 : 0;
    }

    return binary;
  }
}
