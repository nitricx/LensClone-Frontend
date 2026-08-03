import { Component, ElementRef, effect, input, viewChild } from '@angular/core';
import { PipelineService } from '../../services/pipeline/pipeline.service';
import { BoundingBoxRendererService } from '../../services/visualization/boundingbox-renderer.service';

@Component({
  selector: 'app-overlay',
  standalone: true,
  templateUrl: './overlay.component.html',
  styleUrl: './overlay.component.css',
})
export class OverlayComponent {
  readonly width = input.required<number>();
  readonly height = input.required<number>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('overlay');

  constructor(
    private readonly pipeline: PipelineService,
    private readonly renderer: BoundingBoxRendererService,
  ) {
    effect(() => {
      const width = this.width();
      const height = this.height();

      const state = this.pipeline.state();
      const settings = this.pipeline.debugSettings();

      const canvas = this.canvas().nativeElement;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      ctx.clearRect(0, 0, width, height);

      if (settings.boundingBoxes) {
        this.renderer.render(ctx, state.detections);
      }
    });
  }
}
