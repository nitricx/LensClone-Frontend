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
import { CameraService } from '../../services/camera/camera.service';
import { PipelineService } from '../../services/pipeline/pipeline.service';
import { HistoryService, HistoryItem } from '../../services/history/history.service';
import { AuthService } from '../../services/auth/auth.service';
import { OverlayComponent } from '../overlay/overlay.component';

export type ModalType =
  | 'none'
  | 'menu'
  | 'history'
  | 'feedback'
  | 'permissions'
  | 'privacy'
  | 'terms'
  | 'account';

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
    readonly authService: AuthService,
  ) { }

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

  private frozenImageData: ImageData | null = null;
  private frozenRefinementCount = 0;
  private frozenConverged = false;
  private readonly MAX_FROZEN_REFINEMENT_PASSES = 6;

  async togglePrimaryAction(): Promise<void> {
    const video = this.videoElement.nativeElement;

    if (!this.isFrozen()) {
      // Capture static frame before pausing camera feed
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        this.captureContext.drawImage(
          video,
          0,
          0,
          this.captureCanvas.width,
          this.captureCanvas.height,
        );
        this.frozenImageData = this.captureContext.getImageData(
          0,
          0,
          this.captureCanvas.width,
          this.captureCanvas.height,
        );
      }

      // Freeze frame state
      this.cameraService.pause(video);
      this.isFrozen.set(true);
      this.frozenRefinementCount = 0;
      this.frozenConverged = false;

      // Save initial frame capture to history
      this.saveHistoryCapture();
    } else {
      // Resume live state
      await this.cameraService.resume(video);
      this.isFrozen.set(false);
      this.frozenImageData = null;
      this.frozenRefinementCount = 0;
      this.frozenConverged = false;
    }
  }

  private saveHistoryCapture(): void {
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

  signInGoogle(): void {
    this.authService.signInWithGoogle();
  }

  signOut(): void {
    this.authService.signOut();
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

    if (!this.detectionInProgress) {
      if (!this.isFrozen()) {
        // LIVE FEED MODE: capture & execute live frame
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
      } else if (!this.frozenConverged && this.frozenImageData) {
        // FROZEN FRAME MODE: refine static image until convergence or max passes
        this.detectionInProgress = true;
        try {
          await this.pipelineService.execute(this.frozenImageData);
          this.frozenRefinementCount++;

          const detections = this.pipelineService.detections() || [];
          const allSatisfied =
            detections.length > 0 &&
            detections.every(
              (d) => d.isReused || (d.rawTextScore !== undefined && d.rawTextScore >= 0.85),
            );

          if (allSatisfied || this.frozenRefinementCount >= this.MAX_FROZEN_REFINEMENT_PASSES) {
            this.frozenConverged = true;
          }
        } catch (err) {
          console.warn('Error in frozen frame refinement loop:', err);
          this.frozenConverged = true;
        } finally {
          this.detectionInProgress = false;
        }
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
