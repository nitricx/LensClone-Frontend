import { Injectable } from '@angular/core';
import { Detection } from '../text-detection/types';

@Injectable({
  providedIn: 'root',
})
export class BoundingBoxRendererService {
  render(ctx: CanvasRenderingContext2D, detections: Detection[]): void {
    ctx.save();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00ff00';

    ctx.font = '16px Arial';
    ctx.textBaseline = 'top';

    for (const detection of detections) {
      const box = detection.boundingBox;

      // Bounding box
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Hardcoded label
      const text = detection.canonicalText || detection.rawText;
      if (!text) {
        continue;
      }

      const padding = 4;
      const textWidth = ctx.measureText(text).width;
      const labelWidth = textWidth + padding * 2;
      const labelHeight = 22;

      const labelX = box.x;
      const labelY = Math.max(0, box.y - labelHeight);

      ctx.fillStyle = '#000000';
      ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, labelX + padding, labelY + 3);
    }

    ctx.restore();
  }
}
