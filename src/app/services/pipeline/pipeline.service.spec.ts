import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PipelineService } from './pipeline.service';
import { DetectorService } from '../text-detection/detector/detector.service';
import { DetectorFilterService } from '../text-detection/detector/detector-filter.service';
import { DetectorCropperService } from '../text-detection/cropper.service';
import { RecognitionService } from '../text-detection/recognition/recognition.service';
import { DictionaryMatcherService } from '../text-detection/dictionary/dictionary-matcher.service';
import { LineGroupingService } from '../text-detection/line-grouping.service';

if (typeof globalThis.ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  };
}

describe('PipelineService', () => {
  let service: PipelineService;
  let detectorMock: DetectorService;
  let detectorFilterMock: DetectorFilterService;
  let cropperMock: DetectorCropperService;
  let recognizerMock: RecognitionService;
  let dictionaryMock: DictionaryMatcherService;
  let lineGroupingMock: LineGroupingService;

  beforeEach(() => {
    detectorMock = { name: 'detector', initialize: vi.fn(), execute: vi.fn() } as unknown as DetectorService;
    detectorFilterMock = { name: 'detectorFilter', execute: vi.fn() } as unknown as DetectorFilterService;
    cropperMock = { name: 'cropper', execute: vi.fn() } as unknown as DetectorCropperService;
    recognizerMock = { name: 'recognizer', initialize: vi.fn(), execute: vi.fn() } as unknown as RecognitionService;
    dictionaryMock = { name: 'dictionary', execute: vi.fn() } as unknown as DictionaryMatcherService;
    lineGroupingMock = { name: 'lineGrouping', execute: vi.fn() } as unknown as LineGroupingService;

    TestBed.configureTestingModule({
      providers: [
        PipelineService,
        { provide: DetectorService, useValue: detectorMock },
        { provide: DetectorFilterService, useValue: detectorFilterMock },
        { provide: DetectorCropperService, useValue: cropperMock },
        { provide: RecognitionService, useValue: recognizerMock },
        { provide: DictionaryMatcherService, useValue: dictionaryMock },
        { provide: LineGroupingService, useValue: lineGroupingMock },
      ],
    });

    service = TestBed.inject(PipelineService);
  });

  it('should be created and set initial default signals and config', () => {
    expect(service).toBeTruthy();
    expect(service.debugSettings().lineGrouping).toBe(true);
    expect(service.state().detections.length).toBe(0);
    expect(service.state().config).toBeDefined();
    expect(service.state().config?.detector.scaleFactor).toBe(0.25);
    expect(service.detections().length).toBe(0);
    expect(service.processingTimeMs()).toBe(0);
    expect(service.cropsCount()).toBe(0);
    expect(service.hasDetections()).toBe(false);
  });

  it('should reflect updated computed signals after execution', async () => {
    const mockCrop = new ImageData(new Uint8ClampedArray(16), 2, 2);
    (detectorMock.execute as any).mockImplementation((st: any) => {
      st.detections = [
        { crop: mockCrop, rawText: 'TEST 1' },
        { crop: undefined, rawText: 'TEST 2' },
      ];
    });

    const mockImage = new ImageData(new Uint8ClampedArray(400), 10, 10);
    await service.execute(mockImage);

    expect(service.detections().length).toBe(2);
    expect(service.cropsCount()).toBe(1);
    expect(service.hasDetections()).toBe(true);
    expect(service.processingTimeMs()).toBeGreaterThanOrEqual(0);
    expect(service.stageMetrics()?.['detector']).toBeDefined();
  });

  it('should initialize all pipeline stages sequentially', async () => {
    await service.initialize();

    expect(detectorMock.initialize).toHaveBeenCalled();
    expect(recognizerMock.initialize).toHaveBeenCalled();
  });

  it('should execute pipeline stages in order when an image is processed', async () => {
    const mockImage = new ImageData(new Uint8ClampedArray(400), 10, 10);

    const callOrder: string[] = [];
    (detectorMock.execute as any).mockImplementation(() => callOrder.push('detector'));
    (detectorFilterMock.execute as any).mockImplementation(() => callOrder.push('filter'));
    (cropperMock.execute as any).mockImplementation(() => callOrder.push('cropper'));
    (recognizerMock.execute as any).mockImplementation(() => callOrder.push('recognizer'));
    (dictionaryMock.execute as any).mockImplementation(() => callOrder.push('dictionary'));
    (lineGroupingMock.execute as any).mockImplementation(() => callOrder.push('lineGrouping'));

    await service.execute(mockImage);

    expect(service.state().fullImage).toBe(mockImage);
    expect(callOrder).toEqual([
      'detector',
      'filter',
      'cropper',
      'recognizer',
      'dictionary',
      'lineGrouping',
    ]);
    expect(service.state().stageMetrics).toBeDefined();
    expect(typeof service.state().stageMetrics?.['detector']).toBe('number');
  });

  it('should delegate pipeline initialization and execution to Worker when available', async () => {
    let workerOnMessage: ((event: any) => void) | null = null;
    const postMessageSpy = vi.fn().mockImplementation((msg: any) => {
      if (msg.type === 'INITIALIZE') {
        workerOnMessage?.({ data: { type: 'INITIALIZED', id: msg.id } });
      } else if (msg.type === 'EXECUTE') {
        workerOnMessage?.({
          data: {
            type: 'RESULT',
            id: msg.id,
            state: { detections: [{ text: 'TEST WORKER' }], processingTimeMs: 12 },
          },
        });
      }
    });

    class MockWorker {
      set onmessage(fn: any) {
        workerOnMessage = fn;
      }
      postMessage = postMessageSpy;
    }

    vi.stubGlobal('Worker', MockWorker);

    try {
      const workerService = new PipelineService(
        detectorMock,
        detectorFilterMock,
        cropperMock,
        recognizerMock,
        dictionaryMock,
        lineGroupingMock,
      );

      await workerService.initialize();
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'INITIALIZE' }),
      );

      const mockImage = new ImageData(new Uint8ClampedArray(400), 10, 10);
      await workerService.execute(mockImage);

      expect(workerService.state().detections.length).toBe(1);
      expect((workerService.state().detections[0] as any).text).toBe('TEST WORKER');
      expect(workerService.state().processingTimeMs).toBe(12);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
