import { CameraComponent } from './camera/camera.component';
import { AfterViewInit, Component, ElementRef, signal, ViewChild } from '@angular/core';

import { CameraService } from './services/camera.service';
import { DetectorService } from './services/text-detection/detector.service';
import { RendererService } from './services/renderer.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CameraComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit {
  @ViewChild(CameraComponent)
  cameraComponent!: CameraComponent;

  @ViewChild('overlay')
  overlay!: ElementRef<HTMLCanvasElement>;

  status = signal('Initializing...');
  detections = signal<any[]>([]);

  private readonly processingCanvas: HTMLCanvasElement = document.createElement('canvas');
  private readonly processingContext: CanvasRenderingContext2D = this.processingCanvas.getContext(
    '2d',
    {
      willReadFrequently: true,
    },
  )!;
  private processing: boolean = false;

  constructor(
    private detector: DetectorService,
    private renderer: RendererService,
  ) {}

  async ngAfterViewInit() {
    this.processingCanvas.width = 640;
    this.processingCanvas.height = 480;

    this.status.set('Initializing detector...');
    await this.detector.initialize();

    this.status.set('Running OCR');

    this.resizeCanvas();
    this.processingLoop();
  }

  get videoElement(): HTMLVideoElement {
    return this.cameraComponent.getVideoElement();
  }

  resizeCanvas() {
    const canvas = this.overlay.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private processingLoop = async () => {
    requestAnimationFrame(this.processingLoop);

    if (this.processing) return;

    this.processing = true;

    try {
      this.processingContext.drawImage(
        this.videoElement,
        0,
        0,
        this.processingCanvas.width,
        this.processingCanvas.height,
      );

      const image = this.processingContext.getImageData(
        0,
        0,
        this.processingCanvas.width,
        this.processingCanvas.height,
      );

      const detections = await this.detector.detect(image);

      this.detections.set(detections);

      this.renderer.render(this.overlay.nativeElement, detections);
    } finally {
      this.processing = false;
    }
  };
}
