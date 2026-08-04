import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DetectorCropperService } from './cropper.service';
import { PipelineState } from '../pipeline/pipeline-state';

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

describe('DetectorCropperService', () => {
  let service: DetectorCropperService;

  function createMockImageData(width: number, height: number): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    return new ImageData(data, width, height);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DetectorCropperService],
    });
    service = TestBed.inject(DetectorCropperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should do nothing if state.detections is empty', () => {
    const state: PipelineState = {
      detections: [],
      processingTimeMs: 0,
    };

    expect(() => service.execute(state)).not.toThrow();
  });

  it('should crop region from canvas context for each detection', () => {
    const mockImage = createMockImageData(100, 100);
    const state: PipelineState = {
      fullImage: mockImage,
      detections: [
        {
          boundingBoxScore: 0.85,
          boundingBox: { x: 10, y: 10, width: 20, height: 20 },
        },
      ],
      processingTimeMs: 0,
    };

    const mockContext = {
      putImageData: vi.fn(),
      getImageData: vi.fn().mockImplementation((x: number, y: number, w: number, h: number) => {
        return createMockImageData(w, h);
      }),
    };

    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue(mockContext),
        } as unknown as HTMLCanvasElement;
      }
      return origCreateElement(tagName);
    });

    service.execute(state);

    expect(state.detections[0].crop).toBeDefined();
    expect(mockContext.putImageData).toHaveBeenCalledWith(mockImage, 0, 0);

    vi.restoreAllMocks();
  });
});
