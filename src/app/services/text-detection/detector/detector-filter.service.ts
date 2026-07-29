import { Injectable } from '@angular/core';
import { Detection } from '../types';

@Injectable({
  providedIn: 'root',
})
export class DetectorFilterService {
  filter(detections: Detection[]): Detection[] {
    return detections.filter((d) => this.hasMinimumAspectRatio(d));
  }

  private hasMinimumAspectRatio(detection: Detection): boolean {
    const { width, height } = detection.boundingBox;

    return width / height >= 1.2;
  }
}
