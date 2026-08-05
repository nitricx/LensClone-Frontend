import { Injectable } from '@angular/core';
import { Detection, GroupedTextLine } from '../text-detection/types';


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

      // Always render bounding box rectangle
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      const text = detection.canonicalText ?? detection.price;
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

  renderLineGroupings(ctx: CanvasRenderingContext2D, groupedLines: GroupedTextLine[]): void {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.font = 'bold 13px Arial';
    ctx.textBaseline = 'top';

    for (const line of groupedLines) {
      const box = line.boundingBox;

      // Draw cyan line bounding box with dashes
      ctx.strokeStyle = '#00d2ff';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.setLineDash([]); // Reset line dash

      const tagText = `Line #${line.lineId} (${line.detections.length})`;
      const padding = 4;
      const textWidth = ctx.measureText(tagText).width;
      const labelWidth = textWidth + padding * 2;
      const labelHeight = 20;

      const labelX = box.x;
      const labelY = Math.max(0, box.y - labelHeight);

      ctx.fillStyle = '#00d2ff';
      ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

      ctx.fillStyle = '#000000';
      ctx.fillText(tagText, labelX + padding, labelY + 3);
    }

    ctx.restore();
  }
}

