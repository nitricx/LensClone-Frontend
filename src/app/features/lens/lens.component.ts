import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CameraService } from '../../services/camera.service';
import { DetectorService } from '../../services/text-detection/detector.service';
import { BoundingBoxOverlayRendererService } from '../../services/visualization/boundingbox-overlay-renderer.service';

@Component({
  selector: 'app-lens',
  standalone: true,
  imports: [],
  templateUrl: './lens.component.html',
  styleUrl: './lens.component.css',
})
export class LensComponent implements AfterViewInit {
  @ViewChild('detectionOverlay')
  private detectionOverlay!: ElementRef<HTMLCanvasElement>;

  @ViewChild('video', { static: true })
  private videoElement!: ElementRef<HTMLVideoElement>;

  private readonly captureCanvas = document.createElement('canvas');

  private readonly captureContext = this.captureCanvas.getContext('2d', {
    willReadFrequently: true,
  })!;

  private detectionInProgress = false;

  private cameraVideo!: HTMLVideoElement;

  constructor(
    private readonly cameraService: CameraService,
    private readonly detector: DetectorService,
    private readonly boundingBoxRenderer: BoundingBoxOverlayRendererService,
  ) {}

  async ngAfterViewInit(): Promise<void> {
    await this.cameraService.start(this.videoElement.nativeElement);

    if (this.cameraVideo.readyState < HTMLMediaElement.HAVE_METADATA) {
      await new Promise<void>((resolve) => {
        this.cameraVideo.onloadedmetadata = () => resolve();
      });
      await this.detector.initialize();
    }

    this.resizeCanvases(this.cameraVideo);

    this.runDetectionLoop();
  }

  private runDetectionLoop = async () => {
    if (this.detectionInProgress) {
      return;
    }

    this.detectionInProgress = true;

    try {
      this.captureContext.drawImage(
        this.cameraVideo,
        0,
        0,
        this.captureCanvas.width,
        this.captureCanvas.height,
      );

      const image = this.captureContext.getImageData(
        0,
        0,
        this.captureCanvas.width,
        this.captureCanvas.height,
      );

      const detections = await this.detector.detect(image);

      this.boundingBoxRenderer.render(this.detectionOverlay.nativeElement, detections);
    } finally {
      this.detectionInProgress = false;
      requestAnimationFrame(this.runDetectionLoop);
    }
  };

  private resizeCanvases(HTMLVideoElement: HTMLVideoElement): void {
    this.captureCanvas.width = HTMLVideoElement.videoWidth;
    this.captureCanvas.height = HTMLVideoElement.videoHeight;
    const canvas = this.detectionOverlay.nativeElement;
    canvas.width = HTMLVideoElement.videoWidth;
    canvas.height = HTMLVideoElement.videoHeight;
  }
}
