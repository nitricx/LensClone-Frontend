import { Injectable } from '@angular/core';
import { Detection } from '../text-detection/types';
import { BoundingBoxStyle } from './types';

@Injectable({
  providedIn: 'root',
})
export class BoundingBoxOverlayRendererService {
  private readonly style: BoundingBoxStyle = {
    strokeColor: '#00ff66',
    fillColor: 'rgba(0,255,100,0.10)',
    lineWidth: 3,
    cornerRadius: 0,
  };

  render(canvas: HTMLCanvasElement, detections: Detection[]): void {
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = this.style.lineWidth;
    ctx.strokeStyle = this.style.strokeColor;
    ctx.fillStyle = this.style.fillColor;

    for (const detection of detections) {
      this.drawPolygon(ctx, detection.points);
    }
  }

  private drawPolygon(ctx: CanvasRenderingContext2D, points: [number, number][]): void {
    if (points.length < 4) {
      return;
    }

    ctx.beginPath();

    ctx.moveTo(points[0][0], points[0][1]);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }

    ctx.closePath();

    ctx.fill();
    ctx.stroke();
  }
}
