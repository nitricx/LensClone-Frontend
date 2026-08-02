import { Injectable } from '@angular/core';
import { BoundingBox, Detection } from './types';

interface TextLine {
  id: number;

  detections: Detection[];

  boundingBox: BoundingBox;

  centerY: number;
  averageHeight: number;

  score: number;
}

@Injectable({
  providedIn: 'root',
})
export class LineGroupingService {
  private readonly scoring = {
    maxScore: 1.0,

    weights: {
      vertical: 0.6,
      height: 0.25,
      horizontal: 0.1,
      confidence: 0.05,
    },

    limits: {
      maxVertical: 1.0,
      maxHeightRatio: 2.0,
    },
  };

  group(detections: Detection[]): Detection[] {
    // Remove previous grouping information
    detections.forEach((d) => (d.line = undefined));

    const remaining = [...detections];

    remaining.sort((a, b) => {
      const dy = this.centerY(a) - this.centerY(b);

      if (Math.abs(dy) > 1) {
        return dy;
      }

      return a.boundingBox.x - b.boundingBox.x;
    });

    const lines: TextLine[] = [];

    while (remaining.length > 0) {
      const seed = remaining.shift()!;

      const line: TextLine = {
        id: lines.length,
        detections: [seed],
        boundingBox: { ...seed.boundingBox },
        centerY: this.centerY(seed),
        averageHeight: seed.boundingBox.height,
        score: 0,
      };

      let added = true;

      while (added) {
        added = false;

        let bestIndex = -1;
        let bestScore = Number.POSITIVE_INFINITY;

        for (let i = 0; i < remaining.length; i++) {
          const score = this.scoreCandidate(remaining[i], line);

          if (score < bestScore) {
            bestScore = score;
            bestIndex = i;
          }
        }

        if (bestIndex >= 0 && bestScore <= this.scoring.maxScore) {
          line.detections.push(remaining.splice(bestIndex, 1)[0]);

          line.score = Math.max(line.score, bestScore);

          this.updateLine(line);

          added = true;
        }
      }

      line.detections.sort((a, b) => a.boundingBox.x - b.boundingBox.x);

      lines.push(line);
    }

    for (const line of lines) {
      for (const detection of line.detections) {
        detection.line = {
          id: line.id,
          score: line.score,
        };
      }
    }

    return detections;
  }

  private scoreCandidate(detection: Detection, line: TextLine): number {
    const box = detection.boundingBox;

    //
    // Vertical alignment
    //
    const vertical = Math.abs(this.centerY(detection) - line.centerY) / line.averageHeight;

    if (vertical > this.scoring.limits.maxVertical) {
      return Number.POSITIVE_INFINITY;
    }

    //
    // Height similarity
    //
    const heightRatio =
      Math.max(box.height, line.averageHeight) / Math.min(box.height, line.averageHeight);

    if (heightRatio > this.scoring.limits.maxHeightRatio) {
      return Number.POSITIVE_INFINITY;
    }

    const height = heightRatio - 1;

    //
    // Horizontal distance
    //
    const lineLeft = line.boundingBox.x;
    const lineRight = line.boundingBox.x + line.boundingBox.width;

    const candidateLeft = box.x;
    const candidateRight = box.x + box.width;

    const gap = Math.max(0, candidateLeft - lineRight, lineLeft - candidateRight);

    const horizontal = gap / line.averageHeight;

    //
    // Detection confidence
    //
    const confidence = 1 - detection.boundingBoxScore;

    return (
      vertical * this.scoring.weights.vertical +
      height * this.scoring.weights.height +
      horizontal * this.scoring.weights.horizontal +
      confidence * this.scoring.weights.confidence
    );
  }

  private updateLine(line: TextLine): void {
    const boxes = line.detections.map((d) => d.boundingBox);

    const minX = Math.min(...boxes.map((b) => b.x));
    const minY = Math.min(...boxes.map((b) => b.y));
    const maxX = Math.max(...boxes.map((b) => b.x + b.width));
    const maxY = Math.max(...boxes.map((b) => b.y + b.height));

    line.boundingBox = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    line.averageHeight = boxes.reduce((sum, b) => sum + b.height, 0) / boxes.length;

    line.centerY = boxes.reduce((sum, b) => sum + b.y + b.height / 2, 0) / boxes.length;
  }

  private centerY(detection: Detection): number {
    return detection.boundingBox.y + detection.boundingBox.height / 2;
  }
}
