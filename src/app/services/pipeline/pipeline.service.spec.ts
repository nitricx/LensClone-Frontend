import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PipelineService } from './pipeline.service';
import { DetectorService } from '../text-detection/detector/detector.service';
import { DetectorFilterService } from '../text-detection/detector/detector-filter.service';
import { TrackerService } from '../text-detection/tracking/tracker.service';
import { DetectorCropperService } from '../text-detection/cropper.service';
import { RecognitionService } from '../text-detection/recognition/recognition.service';
import { DictionaryMatcherService } from '../text-detection/dictionary/dictionary-matcher.service';
import { LineGroupingService } from '../text-detection/line-grouping.service';
import { OfferExtractorService } from '../text-detection/offer-extraction/offer-extractor.service';

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
  let trackerMock: TrackerService;
  let cropperMock: DetectorCropperService;
  let recognizerMock: RecognitionService;
  let dictionaryMock: DictionaryMatcherService;
  let lineGroupingMock: LineGroupingService;
  let offerExtractorMock: OfferExtractorService;

  beforeEach(() => {
    detectorMock = { name: 'detector', initialize: vi.fn(), execute: vi.fn() } as unknown as DetectorService;
    detectorFilterMock = { name: 'detectorFilter', execute: vi.fn() } as unknown as DetectorFilterService;
    trackerMock = { name: 'tracker', execute: vi.fn() } as unknown as TrackerService;
    cropperMock = { name: 'cropper', execute: vi.fn() } as unknown as DetectorCropperService;
    recognizerMock = { name: 'recognizer', initialize: vi.fn(), execute: vi.fn() } as unknown as RecognitionService;
    dictionaryMock = { name: 'dictionary', execute: vi.fn() } as unknown as DictionaryMatcherService;
    lineGroupingMock = { name: 'lineGrouping', execute: vi.fn() } as unknown as LineGroupingService;
    offerExtractorMock = { name: 'offerExtractor', execute: vi.fn() } as unknown as OfferExtractorService;

    TestBed.configureTestingModule({
      providers: [
        PipelineService,
        { provide: DetectorService, useValue: detectorMock },
        { provide: DetectorFilterService, useValue: detectorFilterMock },
        { provide: TrackerService, useValue: trackerMock },
        { provide: DetectorCropperService, useValue: cropperMock },
        { provide: RecognitionService, useValue: recognizerMock },
        { provide: DictionaryMatcherService, useValue: dictionaryMock },
        { provide: LineGroupingService, useValue: lineGroupingMock },
        { provide: OfferExtractorService, useValue: offerExtractorMock },
      ],
    });

    service = TestBed.inject(PipelineService);
  });

  it('should be created and set initial default signals and config', () => {
    expect(service).toBeTruthy();
    expect(service.debugSettings().lineGrouping).toBe(true);
    expect(service.state().detections.length).toBe(0);
    expect(service.state().config).toBeDefined();
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

  it('should compute groupedLines correctly and filter out false positive lines lacking product, quantity, or price', async () => {
    (detectorMock.execute as any).mockImplementation((st: any) => {
      st.detections = [
        // Line 0: Complete line with Product, Quantity, and Price
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 10, y: 20, width: 50, height: 20 },
          rawText: 'GALLETITAS',
          canonicalText: 'GALLETITAS',
          line: { id: 0, score: 0.1 },
        },
        {
          boundingBoxScore: 0.85,
          boundingBox: { x: 70, y: 20, width: 30, height: 20 },
          rawText: '500G',
          quantity: { quantity: 500, unit: 'g' },
          line: { id: 0, score: 0.1 },
        },
        {
          boundingBoxScore: 0.95,
          boundingBox: { x: 110, y: 20, width: 40, height: 20 },
          rawText: '$1200',
          price: '$1200',
          line: { id: 0, score: 0.1 },
        },
        // Line 1: Incomplete line (price only, no product or quantity) -> Should be filtered out
        {
          boundingBoxScore: 0.95,
          boundingBox: { x: 10, y: 50, width: 30, height: 20 },
          rawText: '$500',
          price: '$500',
          line: { id: 1, score: 0.05 },
        },
      ];
    });

    const mockImage = new ImageData(new Uint8ClampedArray(400), 10, 10);
    await service.execute(mockImage);

    const grouped = service.groupedLines();
    expect(grouped.length).toBe(1);
    expect(grouped[0].lineId).toBe(0);
    expect(grouped[0].combinedText).toBe('GALLETITAS 500G $1200');
    expect(grouped[0].detections.length).toBe(3);
    expect(grouped[0].boundingBox).toEqual({ x: 10, y: 20, width: 140, height: 20 });
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
    (trackerMock.execute as any).mockImplementation(() => callOrder.push('tracker'));
    (cropperMock.execute as any).mockImplementation(() => callOrder.push('cropper'));
    (recognizerMock.execute as any).mockImplementation(() => callOrder.push('recognizer'));
    (dictionaryMock.execute as any).mockImplementation(() => callOrder.push('dictionary'));
    (lineGroupingMock.execute as any).mockImplementation(() => callOrder.push('lineGrouping'));

    await service.execute(mockImage);

    expect(service.state().fullImage).toBe(mockImage);
    expect(callOrder).toEqual([
      'detector',
      'filter',
      'tracker',
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
        trackerMock,
        cropperMock,
        recognizerMock,
        dictionaryMock,
        lineGroupingMock,
        offerExtractorMock,
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
