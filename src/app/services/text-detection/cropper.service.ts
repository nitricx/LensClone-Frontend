import { Injectable } from '@angular/core';
import { CroppedRegion, Detection } from './types';

@Injectable({
  providedIn: 'root',
})
export class DetectorCropperService {
  private readonly padding: number = 4;
  crop(source: ImageData, detections: Detection[]): CroppedRegion[] {
    if (detections.length === 0) {
      return [];
    }

    const canvas = document.createElement('canvas');

    canvas.width = source.width;
    canvas.height = source.height;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Unable to create canvas context');
    }

    context.putImageData(source, 0, 0);

    return detections.map((detection) => ({
      image: this.cropRegion(canvas, detection),
      detection,
    }));
  }

  private cropRegion(canvas: HTMLCanvasElement, detection: Detection): ImageData {
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Unable to create canvas context');
    }

    const box = detection.boundingBox;

    const x = Math.max(0, Math.floor(box.x - this.padding));

    const y = Math.max(0, Math.floor(box.y - this.padding));

    const right = Math.min(canvas.width, Math.ceil(box.x + box.width + this.padding));

    const bottom = Math.min(canvas.height, Math.ceil(box.y + box.height + this.padding));

    const width = right - x;
    const height = bottom - y;

    return context.getImageData(x, y, width, height);
  }
}
