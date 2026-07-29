import { AfterViewInit, Component, ElementRef, signal, ViewChild } from '@angular/core';
import { CameraService } from '../../services/camera.service';
import { PipelineService } from '../../services/pipeline/pipeline.service';
import { OverlayComponent } from '../overlay/overlay.component';

@Component({
  selector: 'app-lens',
  standalone: true,
  imports: [OverlayComponent],
  templateUrl: './lens.component.html',
  styleUrl: './lens.component.css',
})
export class LensComponent implements AfterViewInit {
  @ViewChild('video', { static: true })
  private videoElement!: ElementRef<HTMLVideoElement>;

  readonly videoWidth = signal(0);
  readonly videoHeight = signal(0);
  private readonly captureCanvas = document.createElement('canvas');

  private readonly captureContext = this.captureCanvas.getContext('2d', {
    willReadFrequently: true,
  })!;

  private detectionInProgress = false;

  constructor(
    private readonly cameraService: CameraService,
    private readonly pipelineService: PipelineService,
  ) {}

  async ngAfterViewInit(): Promise<void> {
    await this.cameraService.start(this.videoElement.nativeElement);

    if (this.videoElement.nativeElement.readyState < HTMLMediaElement.HAVE_METADATA) {
      await new Promise<void>((resolve) => {
        this.videoElement.nativeElement.onloadedmetadata = () => resolve();
      });
    }
    this.videoWidth.set(this.videoElement.nativeElement.videoWidth);
    this.videoHeight.set(this.videoElement.nativeElement.videoHeight);

    this.resizeCanvases(this.videoElement.nativeElement);

    await this.pipelineService.initialize();
    this.runDetectionLoop();
  }

  private runDetectionLoop = async () => {
    if (this.detectionInProgress) {
      return;
    }

    this.detectionInProgress = true;

    try {
      this.captureContext.drawImage(
        this.videoElement.nativeElement,
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

      await this.pipelineService.recognizeText(image);
    } finally {
      this.detectionInProgress = false;
      requestAnimationFrame(this.runDetectionLoop);
    }
  };

  private resizeCanvases(HTMLVideoElement: HTMLVideoElement): void {
    this.captureCanvas.width = HTMLVideoElement.videoWidth;
    this.captureCanvas.height = HTMLVideoElement.videoHeight;
  }
}
