import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RecognitionPreprocessorService } from './recognition-preprocessor.service';

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

if (typeof globalThis.OffscreenCanvas === 'undefined') {
  const mockContext = {
    putImageData: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn().mockImplementation((x: number, y: number, w: number, h: number) => {
      return new ImageData(new Uint8ClampedArray(w * h * 4), w, h);
    }),
  };

  (globalThis as any).OffscreenCanvas = class OffscreenCanvas {
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
    getContext() {
      return mockContext;
    }
  };
}

describe('RecognitionPreprocessorService', () => {
  let service: RecognitionPreprocessorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RecognitionPreprocessorService],
    });
    service = TestBed.inject(RecognitionPreprocessorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize target input height', () => {
    expect(() => service.initialize(32)).not.toThrow();
  });

  it('should convert input ImageData to tensor with shape [1, 3, inputHeight, targetWidth]', () => {
    service.initialize(32);

    const data = new Uint8ClampedArray(64 * 32 * 4);
    const mockImage = new ImageData(data, 64, 32);

    const tensor = service.toTensor(mockImage);

    expect(tensor).toBeDefined();
    expect(tensor.dims[0]).toBe(1);
    expect(tensor.dims[1]).toBe(3);
    expect(tensor.dims[2]).toBe(32);
  });
});
