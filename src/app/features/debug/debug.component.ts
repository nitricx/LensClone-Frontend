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
      const crops = this.pipeline.state().cropper.crops;
      const canvases = this.cropCanvases();

      crops.forEach((crop, i) => {
        const canvas = canvases[i]?.nativeElement;
        if (!canvas) return;

        canvas.width = crop.image.width;
        canvas.height = crop.image.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.putImageData(crop.image, 0, 0);
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
