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

  it('should downscale input tensor when maxSide is smaller than image max dimension', () => {
    const width = 128;
    const height = 64;
    const data = new Uint8ClampedArray(width * height * 4);
    data.fill(255);
    const mockImage = new ImageData(data, width, height);

    const tensor = service.toTensor(mockImage, 64);

    expect(tensor).toBeDefined();
    expect(tensor.dims).toEqual([1, 3, 32, 64]);
  });

  it('should downscale input tensor by scaleFactor 0.25 and snap dimensions to multiples of 32', () => {
    const width = 1920;
    const height = 1080;
    const data = new Uint8ClampedArray(width * height * 4);
    data.fill(255);
    const mockImage = new ImageData(data, width, height);

    const tensor = service.toTensor(mockImage, 0, 0.25);

    expect(tensor).toBeDefined();
    // 1920 * 0.25 = 480 (32 * 15)
    // 1080 * 0.25 = 270 -> nearest multiple of 32 is 256 (32 * 8)
    expect(tensor.dims).toEqual([1, 3, 256, 480]);
  });

  it('should throw an explicit error when scaleFactor is out of bounds (<= 0 or > 1)', () => {
    const mockImage = new ImageData(new Uint8ClampedArray(16), 2, 2);

    expect(() => service.toTensor(mockImage, undefined, 0)).toThrowError(
      /Invalid scaleFactor '0'/,
    );
    expect(() => service.toTensor(mockImage, undefined, -0.5)).toThrowError(
      /Invalid scaleFactor '-0.5'/,
    );
    expect(() => service.toTensor(mockImage, undefined, 1.5)).toThrowError(
      /Invalid scaleFactor '1.5'/,
    );
  });

  it('should throw an explicit error when maxSide is negative', () => {
    const mockImage = new ImageData(new Uint8ClampedArray(16), 2, 2);

    expect(() => service.toTensor(mockImage, -10)).toThrowError(/Invalid maxSide '-10'/);
  });
});
