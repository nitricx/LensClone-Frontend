import { CameraComponent } from './camera/camera.component';
import { AfterViewInit, Component, ElementRef, signal, ViewChild } from '@angular/core';

import { CameraService } from './services/camera.service';
import { DetectorService } from './services/text-detection/detector.service';
import { RendererService } from './services/renderer.service';
import { OCRService } from './services/ocr.service';

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
  constructor(
    private detector: DetectorService,
    private renderer: RendererService,
    private ocr: OCRService,
  ) {}

  async ngAfterViewInit() {
    this.status.set('Initializing detector...');
    await this.detector.initialize();

    this.status.set('Starting OCR...');
    await this.ocr.initialize();

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

  async processingLoop() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;

    while (true) {
      ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const detections = await this.detector.detect(image);
      this.detections.set(detections);
      this.renderer.render(this.overlay.nativeElement, detections);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}
