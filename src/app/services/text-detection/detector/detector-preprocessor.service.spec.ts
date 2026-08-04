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
