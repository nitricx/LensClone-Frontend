import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DetectorPreprocessorService } from './detector-preprocessor.service';

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

describe('DetectorPreprocessorService', () => {
  let service: DetectorPreprocessorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DetectorPreprocessorService],
    });
    service = TestBed.inject(DetectorPreprocessorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should convert ImageData into a normalized ONNX float32 Tensor with shape [1, 3, height, width]', () => {
    const width = 4;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4);
    // Fill with white pixels (255, 255, 255, 255)
    data.fill(255);
    const mockImage = new ImageData(data, width, height);

    const tensor = service.toTensor(mockImage);

    expect(tensor).toBeDefined();
    expect(tensor.dims).toEqual([1, 3, height, width]);
    expect(tensor.type).toBe('float32');
  });
});
