import { AfterViewInit, Component, ElementRef, ViewChild, signal } from '@angular/core';

import { CameraComponent } from './camera/camera.component';
import { CameraService } from './services/camera.service';
import { DetectorService } from './services/text-detection/detector.service';
import { BoundingBoxRendererService } from './services/visualization/bounding-box-renderer.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CameraComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit {
  @ViewChild('overlay')
  overlay!: ElementRef<HTMLCanvasElement>;

  status = signal('Initializing...');
  detections = signal<any[]>([]);

  private readonly processingCanvas = document.createElement('canvas');
  private readonly processingContext = this.processingCanvas.getContext('2d', {
    willReadFrequently: true,
  })!;

  private processing = false;
  private video!: HTMLVideoElement;

  constructor(
    private readonly cameraService: CameraService,
    private readonly detector: DetectorService,
    private readonly boundingBoxRenderer: BoundingBoxRendererService,
  ) {}

  async ngAfterViewInit(): Promise<void> {
    this.processingCanvas.width = 640;
    this.processingCanvas.height = 480;

    this.status.set('Initializing detector...');
    await this.detector.initialize();

    this.video = this.cameraService.getVideo();

    if (this.video.readyState < HTMLMediaElement.HAVE_METADATA) {
      await new Promise<void>((resolve) => {
        this.video.onloadedmetadata = () => resolve();
      });
    }

    this.status.set('Running OCR');

    this.resizeCanvas();
    this.processingLoop();
  }

  private resizeCanvas(): void {
    const canvas = this.overlay.nativeElement;

    console.log('Overlay canvas 0:', canvas.width, canvas.height);

    canvas.width = this.processingCanvas.width;
    canvas.height = this.processingCanvas.height;

    console.log('Overlay canvas 1:', canvas.width, canvas.height);
  }

  private processingLoop = async () => {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      this.processingContext.drawImage(
        this.video,
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
      this.boundingBoxRenderer.render(this.overlay.nativeElement, detections);
    } finally {
      this.processing = false;
      requestAnimationFrame(this.processingLoop);
    }
  };
}
