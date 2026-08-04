import { Component, ElementRef, effect, input, viewChild } from '@angular/core';

@Component({
  selector: 'app-crop-canvas',
  standalone: true,
  template: `<canvas #canvas></canvas>`,
  styles: [
    `
      :host {
        display: block;
        max-width: 100%;
        width: 100%;
        box-sizing: border-box;
      }
      canvas {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 0 auto;
        box-sizing: border-box;
      }
    `,
  ],
})
export class CropCanvasComponent {
  readonly crop = input.required<ImageData>();
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    effect(() => {
      const crop = this.crop();
      const canvasRef = this.canvas();
      if (!canvasRef || !crop) return;

      const canvas = canvasRef.nativeElement;
      if (canvas.width !== crop.width) {
        canvas.width = crop.width;
      }
      if (canvas.height !== crop.height) {
        canvas.height = crop.height;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cropAny = crop as any;
      const imgData =
        crop instanceof ImageData
          ? crop
          : new ImageData(new Uint8ClampedArray(cropAny.data), cropAny.width, cropAny.height);

      ctx.putImageData(imgData, 0, 0);
    });
  }
}
