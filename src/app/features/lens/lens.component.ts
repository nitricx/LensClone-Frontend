import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CameraService } from '../../services/camera.service';
import { PipelineService } from '../../services/pipeline/pipeline.service';
import { HistoryService, HistoryItem } from '../../services/history.service';
import { OverlayComponent } from '../overlay/overlay.component';

export type ModalType =
  | 'none'
  | 'menu'
  | 'history'
  | 'feedback'
  | 'permissions'
  | 'privacy'
  | 'terms';

@Component({
  selector: 'app-lens',
  standalone: true,
  imports: [CommonModule, FormsModule, OverlayComponent],
  templateUrl: './lens.component.html',
  styleUrl: './lens.component.css',
})
export class LensComponent implements AfterViewInit, OnDestroy {
  @ViewChild('video', { static: true })
  private videoElement!: ElementRef<HTMLVideoElement>;

  @Output() openDebug = new EventEmitter<void>();

  readonly videoWidth = signal(0);
  readonly videoHeight = signal(0);

  readonly isFrozen = signal(false);
  readonly isTorchOn = signal(false);
  readonly isTorchSupported = signal(false);

  readonly activeModal = signal<ModalType>('none');
  readonly selectedHistoryItem = signal<HistoryItem | null>(null);

  readonly feedbackText = signal('');
  readonly feedbackRating = signal(5);
  readonly feedbackSubmitted = signal(false);

  private readonly captureCanvas = document.createElement('canvas');
  private readonly captureContext = this.captureCanvas.getContext('2d', {
    willReadFrequently: true,
  })!;

  private detectionInProgress = false;
  private animationFrameId?: number;
  private isDestroyed = false;

  constructor(
    private readonly cameraService: CameraService,
    private readonly pipelineService: PipelineService,
    readonly historyService: HistoryService,
  ) {}

  async ngAfterViewInit(): Promise<void> {
    this.isDestroyed = false;
    try {
      await this.cameraService.start(this.videoElement.nativeElement);

      if (this.videoElement.nativeElement.readyState < HTMLMediaElement.HAVE_METADATA) {
        await new Promise<void>((resolve) => {
          this.videoElement.nativeElement.onloadedmetadata = () => resolve();
        });
      }

      this.videoWidth.set(this.videoElement.nativeElement.videoWidth || 640);
      this.videoHeight.set(this.videoElement.nativeElement.videoHeight || 480);
      this.resizeCanvases(this.videoElement.nativeElement);

      this.isTorchSupported.set(this.cameraService.hasTorch(this.videoElement.nativeElement));

      await this.pipelineService.initialize();
      this.runDetectionLoop();
    } catch (err) {
      console.warn('Failed to start camera or pipeline in LensComponent:', err);
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    if (this.videoElement?.nativeElement) {
      this.cameraService.stop?.(this.videoElement.nativeElement);
    }
  }

  async toggleTorch(): Promise<void> {
    if (!this.isTorchSupported()) return;
    const targetState = !this.isTorchOn();
    const success = await this.cameraService.toggleTorch(
      this.videoElement.nativeElement,
      targetState,
    );
    if (success) {
      this.isTorchOn.set(targetState);
    }
  }

  async togglePrimaryAction(): Promise<void> {
    const video = this.videoElement.nativeElement;

    if (!this.isFrozen()) {
      // Freeze frame state
      this.cameraService.pause(video);
      this.isFrozen.set(true);

      // Save frame capture to history
      try {
        const dataUrl = this.captureCanvas.toDataURL('image/jpeg', 0.85);
        const detections = this.pipelineService.detections() || [];
        const textSnippet = detections
          .map((d) => d.canonicalText || d.rawText || '')
          .filter(Boolean)
          .join(' ')
          .trim();

        this.historyService.addCapture(dataUrl, detections.length, textSnippet);
      } catch (e) {
        console.warn('Could not capture frame to history:', e);
      }
    } else {
      // Resume live state
      await this.cameraService.resume(video);
      this.isFrozen.set(false);
    }
  }

  openModal(modal: ModalType): void {
    this.activeModal.set(modal);
  }

  closeModal(): void {
    this.activeModal.set('none');
    this.selectedHistoryItem.set(null);
    this.feedbackSubmitted.set(false);
  }

  toggleMenu(): void {
    if (this.activeModal() === 'menu') {
      this.closeModal();
    } else {
      this.openModal('menu');
    }
  }

  submitFeedback(): void {
    if (!this.feedbackText().trim()) return;
    this.feedbackSubmitted.set(true);
    setTimeout(() => {
      this.feedbackText.set('');
      this.closeModal();
    }, 1500);
  }

  viewHistoryItem(item: HistoryItem): void {
    this.selectedHistoryItem.set(item);
  }

  deleteHistoryItem(id: string, event?: Event): void {
    event?.stopPropagation();
    this.historyService.deleteItem(id);
    if (this.selectedHistoryItem()?.id === id) {
      this.selectedHistoryItem.set(null);
    }
  }

  clearHistory(): void {
    this.historyService.clearHistory();
    this.selectedHistoryItem.set(null);
  }

  triggerDebug(): void {
    this.closeModal();
    this.openDebug.emit();
  }

  private runDetectionLoop = async () => {
    if (this.isDestroyed) {
      return;
    }

    // When live and not in progress, execute detection pipeline
    if (!this.isFrozen() && !this.detectionInProgress) {
      this.detectionInProgress = true;
      try {
        if (this.videoElement?.nativeElement?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
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
          await this.pipelineService.execute(image);
        }
      } catch (err) {
        console.warn('Error in detection loop execution:', err);
      } finally {
        this.detectionInProgress = false;
      }
    }

    if (!this.isDestroyed) {
      this.animationFrameId = requestAnimationFrame(this.runDetectionLoop);
    }
  };

  private resizeCanvases(HTMLVideoElement: HTMLVideoElement): void {
    this.captureCanvas.width = HTMLVideoElement.videoWidth || 640;
    this.captureCanvas.height = HTMLVideoElement.videoHeight || 480;
  }
}
