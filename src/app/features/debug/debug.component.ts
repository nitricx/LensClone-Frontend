import { Component, effect, ElementRef, viewChildren } from '@angular/core';
import { PipelineService } from '../../services/pipeline/pipeline.service';
import { DecimalPipe } from '@angular/common';
import { LensComponent } from '../lens/lens.component';

@Component({
  selector: 'app-debug',
  imports: [DecimalPipe, LensComponent],
  templateUrl: './debug.component.html',
  styleUrl: './debug.component.css',
})
export class DebugComponent {
  private readonly cropCanvases = viewChildren<ElementRef<HTMLCanvasElement>>('cropCanvas');

  constructor(readonly pipeline: PipelineService) {
    effect(() => {
      const detections = this.pipeline.state().detector.detections;
      const canvases = this.cropCanvases();

      detections.forEach((detection, i) => {
        if (!detection.crop) {
          return;
        }

        const canvas = canvases[i]?.nativeElement;
        if (!canvas) {
          return;
        }

        canvas.width = detection.crop.width;
        canvas.height = detection.crop.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return;
        }

        ctx.putImageData(detection.crop, 0, 0);
      });
    });
  }

  toggleBoundingBoxes(): void {
    this.pipeline.debugSettings.update((settings) => ({
      ...settings,

      boundingBoxes: !settings.boundingBoxes,
    }));
  }

  toggleCroppedRegions(): void {
    this.pipeline.debugSettings.update((settings) => ({
      ...settings,

      croppedRegions: !settings.croppedRegions,
    }));
  }
}
