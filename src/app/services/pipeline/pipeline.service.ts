import { Injectable, computed, signal } from '@angular/core';
import { PipelineStage, PipelineState } from './pipeline-state';
import { PipelineConfig } from './pipeline-config.types';
import { DebugSettings } from '../../features/debug/debug-settings';

import { DetectorCropperService } from '../text-detection/cropper.service';
import { DetectorFilterService } from '../text-detection/detector/detector-filter.service';
import { RecognitionService } from '../text-detection/recognition/recognition.service';
import { DetectorService } from '../text-detection/detector/detector.service';
import { DictionaryMatcherService } from '../text-detection/dictionary/dictionary-matcher.service';
import { LineGroupingService } from '../text-detection/line-grouping.service';

@Injectable({
  providedIn: 'root',
})
export class PipelineService {
  readonly debugSettings = signal<DebugSettings>({
    croppedRegions: true,
    boundingBoxes: true,
    recognizedText: true,
    canonicalText: true,
    lineGrouping: true,
  });

  private readonly _state = signal<PipelineState>({
    fullImage: undefined,
    detections: [],
    processingTimeMs: 0,
  });

  readonly state = this._state.asReadonly();

  readonly detections = computed(() => this._state().detections);
  readonly processingTimeMs = computed(() => this._state().processingTimeMs);
  readonly stageMetrics = computed(() => this._state().stageMetrics);
  readonly cropsCount = computed(() => this.detections().filter((d) => !!d.crop).length);
  readonly hasDetections = computed(() => this.detections().length > 0);

  private readonly stages: PipelineStage[];
  private worker?: Worker;
  private isWorkerInitialized = false;
  private pendingRequests = new Map<
    string,
    { resolve: (value: any) => void; reject: (reason: any) => void }
  >();
  private messageCounter = 0;

  constructor(
    private readonly detector: DetectorService,
    private readonly detectorFilter: DetectorFilterService,
    private readonly cropper: DetectorCropperService,
    private readonly recognizer: RecognitionService,
    private readonly dictionary: DictionaryMatcherService,
    private readonly lineGroupingService: LineGroupingService,
  ) {
    this.stages = [detector, detectorFilter, cropper, recognizer, dictionary, lineGroupingService];
  }

  async initialize(): Promise<void> {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./pipeline.worker', import.meta.url), {
          type: 'module',
        });
        this.setupWorkerListeners();

        const requestId = this.generateRequestId();
        const initPromise = new Promise<void>((resolve, reject) => {
          this.pendingRequests.set(requestId, { resolve, reject });
        });

        this.worker.postMessage({ type: 'INITIALIZE', id: requestId });
        await initPromise;
        this.isWorkerInitialized = true;
        return;
      } catch (err) {
        console.warn('Failed to initialize Web Worker pipeline. Falling back to main thread execution.', err);
        this.worker = undefined;
        this.isWorkerInitialized = false;
      }
    }

    // Main thread fallback (e.g. Node/Vitest test environment or unsupported Worker)
    for (const stage of this.stages) {
      await stage.initialize?.();
    }
  }

  async execute(image: ImageData, config?: PipelineConfig): Promise<void> {
    if (this.worker && this.isWorkerInitialized) {
      const requestId = this.generateRequestId();
      const execPromise = new Promise<{
        detections: any[];
        processingTimeMs: number;
        stageMetrics?: Record<string, number>;
        config?: PipelineConfig;
      }>((resolve, reject) => {
        this.pendingRequests.set(requestId, { resolve, reject });
      });

      // Clone image data buffer for transfer to worker while preserving original object reference if needed
      const buffer = image.data.buffer.slice(0);
      const payload = {
        imageData: {
          width: image.width,
          height: image.height,
          data: buffer,
        },
        config: config ?? this.state().config,
      };

      this.worker.postMessage({ type: 'EXECUTE', id: requestId, payload }, [buffer]);

      const result = await execPromise;

      const processedDetections = (result.detections || []).map((det: any) => {
        if (det.crop && !(det.crop instanceof ImageData)) {
          const cropBuf =
            det.crop.data instanceof Uint8ClampedArray
              ? det.crop.data
              : new Uint8ClampedArray(det.crop.data);
          det.crop = new ImageData(cropBuf, det.crop.width, det.crop.height);
        }
        return det;
      });

      this._state.update((state) => ({
        ...state,
        fullImage: image,
        detections: processedDetections,
        processingTimeMs: result.processingTimeMs,
        stageMetrics: result.stageMetrics,
        config: result.config ?? state.config,
      }));
      return;
    }

    // Fallback: synchronous/sequential execution on main thread
    const stageMetrics: Record<string, number> = {};
    const startTime = performance.now();

    this._state.update((state) => ({
      ...state,
      fullImage: image,
      config: config ?? state.config,
    }));
    const state = this.state();
    for (const stage of this.stages) {
      const stageName = stage.name || stage.constructor.name;
      const stageStart = performance.now();
      await stage.execute(state);
      stageMetrics[stageName] = performance.now() - stageStart;
    }
    const totalTimeMs = performance.now() - startTime;

    this._state.update((s) => ({
      ...s,
      processingTimeMs: totalTimeMs,
      stageMetrics,
    }));
  }

  private setupWorkerListeners(): void {
    if (!this.worker) return;

    this.worker.onmessage = (event: MessageEvent) => {
      const { type, id, state, error } = event.data;
      const pending = this.pendingRequests.get(id);

      if (!pending) return;

      this.pendingRequests.delete(id);

      if (type === 'INITIALIZED') {
        pending.resolve(undefined);
      } else if (type === 'RESULT') {
        pending.resolve(state);
      } else if (type === 'ERROR') {
        pending.reject(new Error(error));
      }
    };

    this.worker.onerror = (event: ErrorEvent) => {
      console.error('Pipeline worker error:', event.message);
      for (const [id, pending] of this.pendingRequests.entries()) {
        pending.reject(new Error(event.message));
      }
      this.pendingRequests.clear();
    };
  }

  private generateRequestId(): string {
    return `req_${++this.messageCounter}_${Date.now()}`;
  }
}
