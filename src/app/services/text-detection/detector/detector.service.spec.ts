import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DetectorService } from './detector.service';
import { DetectorPreprocessorService } from './detector-preprocessor.service';
import { DetectorPostprocessorService } from './detector-postprocessor.service';
import * as ort from 'onnxruntime-web';
import { PipelineState } from '../../pipeline/pipeline-state';

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

vi.mock('onnxruntime-web', () => ({
  env: {
    wasm: {},
  },
  InferenceSession: {
    create: vi.fn(),
  },
  Tensor: vi.fn().mockImplementation(function (type: any, data: any, dims: any) {
    return { type, data, dims };
  }),
}));

describe('DetectorService', () => {
  let service: DetectorService;
  let preprocessorMock: DetectorPreprocessorService;
  let postprocessorMock: DetectorPostprocessorService;

  beforeEach(() => {
    vi.clearAllMocks();

    preprocessorMock = {
      toTensor: vi.fn().mockReturnValue({} as ort.Tensor),
    } as unknown as DetectorPreprocessorService;

    postprocessorMock = {
      process: vi.fn().mockReturnValue([
        {
          boundingBoxScore: 0.95,
          boundingBox: { x: 10, y: 10, width: 20, height: 20 },
        },
      ]),
    } as unknown as DetectorPostprocessorService;

    TestBed.configureTestingModule({
      providers: [
        DetectorService,
        { provide: DetectorPreprocessorService, useValue: preprocessorMock },
        { provide: DetectorPostprocessorService, useValue: postprocessorMock },
      ],
    });

    service = TestBed.inject(DetectorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize ONNX inference session after fetching model binary', async () => {
    const dummyBuffer = new ArrayBuffer(2000);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
        arrayBuffer: vi.fn().mockResolvedValue(dummyBuffer),
      }),
    );

    const mockSession = { outputNames: ['out'] };
    (ort.InferenceSession.create as any).mockResolvedValue(mockSession);

    await service.initialize?.();

    expect(fetch).toHaveBeenCalledWith('/models/PP-OCRv5_mobile_det.onnx');
    expect(ort.InferenceSession.create).toHaveBeenCalledWith(
      dummyBuffer,
      expect.objectContaining({
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      }),
    );
    expect(ort.env.wasm.numThreads).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });

  it('should execute preprocessing, model inference, and postprocessing', async () => {
    const dummyBuffer = new ArrayBuffer(2000);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
        arrayBuffer: vi.fn().mockResolvedValue(dummyBuffer),
      }),
    );

    const mockOutputTensor = {} as ort.Tensor;
    const mockSession = {
      outputNames: ['out'],
      run: vi.fn().mockResolvedValue({ out: mockOutputTensor }),
    };
    (ort.InferenceSession.create as any).mockResolvedValue(mockSession);

    await service.initialize?.();

    const mockImage = new ImageData(new Uint8ClampedArray(400), 10, 10);
    const state: PipelineState = {
      fullImage: mockImage,
      detections: [],
      processingTimeMs: 0,
    };

    await service.execute(state);

    expect(preprocessorMock.toTensor).toHaveBeenCalledWith(mockImage, undefined, undefined);
    expect(mockSession.run).toHaveBeenCalled();
    expect(postprocessorMock.process).toHaveBeenCalledWith(mockOutputTensor, 10, 10, undefined);
    expect(state.detections.length).toBe(1);

    vi.unstubAllGlobals();
  });

  it('should pass detector maxSide and scaleFactor config to preprocessor', async () => {
    const dummyBuffer = new ArrayBuffer(2000);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
        arrayBuffer: vi.fn().mockResolvedValue(dummyBuffer),
      }),
    );

    const mockOutputTensor = {} as ort.Tensor;
    const mockSession = {
      outputNames: ['out'],
      run: vi.fn().mockResolvedValue({ out: mockOutputTensor }),
    };
    (ort.InferenceSession.create as any).mockResolvedValue(mockSession);

    await service.initialize?.();

    const mockImage = new ImageData(new Uint8ClampedArray(400), 10, 10);
    const state: PipelineState = {
      fullImage: mockImage,
      detections: [],
      processingTimeMs: 0,
      config: {
        detector: {
          thresholdValue: 0.3,
          minArea: 10,
          minAspectRatio: 1.2,
          maxSide: 480,
          scaleFactor: 0.5,
        },
      } as any,
    };

    await service.execute(state);

    expect(preprocessorMock.toTensor).toHaveBeenCalledWith(mockImage, 480, 0.5);

    vi.unstubAllGlobals();
  });
});
