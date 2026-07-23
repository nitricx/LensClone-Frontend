import { Injectable } from '@angular/core';
import { Detection } from '../models/detection';

@Injectable({
  providedIn: 'root',
})
export class RendererService {
  render(canvas: HTMLCanvasElement, detections: Detection[]) {
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;

    detections.forEach((det) => {
      const p = det.points;

      ctx.beginPath();

      ctx.moveTo(p[0][0], p[0][1]);
      ctx.lineTo(p[1][0], p[1][1]);
      ctx.lineTo(p[2][0], p[2][1]);
      ctx.lineTo(p[3][0], p[3][1]);

      ctx.closePath();

      ctx.stroke();
    });
  }
}
