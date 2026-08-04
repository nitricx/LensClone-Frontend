import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RecognitionService } from './recognition.service';
import { RecognitionPreprocessorService } from './recognition-preprocessor.service';
import { RecognitionPostprocessorService } from './recognition-postprocessor.service';
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

describe('RecognitionService', () => {
  let service: RecognitionService;
  let preprocessorMock: RecognitionPreprocessorService;
  let postprocessorMock: RecognitionPostprocessorService;

  beforeEach(() => {
    vi.clearAllMocks();

    preprocessorMock = {
      initialize: vi.fn(),
      toTensor: vi.fn().mockReturnValue({} as ort.Tensor),
    } as unknown as RecognitionPreprocessorService;

    postprocessorMock = {
      decode: vi.fn().mockReturnValue('CEBOLLA'),
    } as unknown as RecognitionPostprocessorService;

    TestBed.configureTestingModule({
      providers: [
        RecognitionService,
        { provide: RecognitionPreprocessorService, useValue: preprocessorMock },
        { provide: RecognitionPostprocessorService, useValue: postprocessorMock },
      ],
    });

    service = TestBed.inject(RecognitionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize ONNX session and load dictionary file', async () => {
    const dummyBuffer = new ArrayBuffer(2000);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('.onnx')) {
          return Promise.resolve({
            ok: true,
            headers: new Headers({ 'content-type': 'application/octet-stream' }),
            arrayBuffer: () => Promise.resolve(dummyBuffer),
          });
        }
        if (url.includes('dictionary.txt')) {
          return Promise.resolve({
            text: () => Promise.resolve('A\nB\nC\n'),
          });
        }
        return Promise.reject(new Error('Unknown url'));
      }),
    );

    const mockSession = { outputNames: ['out'] };
    (ort.InferenceSession.create as any).mockResolvedValue(mockSession);

    await service.initialize();

    expect(preprocessorMock.initialize).toHaveBeenCalledWith(48);
    expect(ort.InferenceSession.create).toHaveBeenCalledWith(
      dummyBuffer,
      expect.objectContaining({
        executionProviders: ['webgpu', 'wasm'],
        graphOptimizationLevel: 'all',
      }),
    );
    expect(ort.env.wasm.numThreads).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });

  it('should process crop detections and populate rawText', async () => {
    const dummyBuffer = new ArrayBuffer(2000);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('.onnx')) {
          return Promise.resolve({
            ok: true,
            headers: new Headers({ 'content-type': 'application/octet-stream' }),
            arrayBuffer: () => Promise.resolve(dummyBuffer),
          });
        }
        return Promise.resolve({
          text: () => Promise.resolve('A\nB\nC\n'),
        });
      }),
    );

    const mockOutputTensor = {} as ort.Tensor;
    const mockSession = {
      outputNames: ['out'],
      run: vi.fn().mockResolvedValue({ out: mockOutputTensor }),
    };
    (ort.InferenceSession.create as any).mockResolvedValue(mockSession);

    await service.initialize();

    const cropImage = new ImageData(new Uint8ClampedArray(400), 10, 10);
    const state: PipelineState = {
      detections: [
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 0, y: 0, width: 10, height: 10 },
          crop: cropImage,
        },
      ],
      processingTimeMs: 0,
    };

    await service.execute(state);

    expect(state.detections[0].rawText).toBe('CEBOLLA');

    vi.unstubAllGlobals();
  });
});
