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
    detectorMock = { initialize: vi.fn(), execute: vi.fn() } as unknown as DetectorService;
    detectorFilterMock = { execute: vi.fn() } as unknown as DetectorFilterService;
    cropperMock = { execute: vi.fn() } as unknown as DetectorCropperService;
    recognizerMock = { initialize: vi.fn(), execute: vi.fn() } as unknown as RecognitionService;
    dictionaryMock = { execute: vi.fn() } as unknown as DictionaryMatcherService;
    lineGroupingMock = { execute: vi.fn() } as unknown as LineGroupingService;

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

  it('should be created and set initial default signals', () => {
    expect(service).toBeTruthy();
    expect(service.debugSettings().lineGrouping).toBe(true);
    expect(service.state().detections.length).toBe(0);
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
  });
});
