import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DetectorCropperService } from './cropper.service';
import { PipelineState } from '../../pipeline/pipeline-state';
import { DEFAULT_PIPELINE_CONFIG } from '../../pipeline/pipeline-config.types';

function createTestImageData(width: number, height: number): ImageData {
  if (typeof ImageData !== 'undefined') {
    return new ImageData(new Uint8ClampedArray(width * height * 4), width, height);
  }
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: 'srgb',
  } as unknown as ImageData;
}

describe('DetectorCropperService', () => {
  let service: DetectorCropperService;

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

  it('should crop region with default fixed padding and populate detection crop', () => {
    const fullImage = createTestImageData(100, 100);
    const state: PipelineState = {
      fullImage,
      detections: [
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 20, y: 20, width: 30, height: 20 },
        },
      ],
      processingTimeMs: 0,
    };

    service.execute(state);

    expect(state.detections[0].crop).toBeDefined();
    // Default padding is 6 => x = 20 - 6 = 14, right = 20 + 30 + 6 = 56, width = 42
    expect(state.detections[0].crop?.width).toBe(42);
    // y = 20 - 6 = 14, bottom = 20 + 20 + 6 = 46, height = 32
    expect(state.detections[0].crop?.height).toBe(32);
  });

  it('should crop region with relative padding mode', () => {
    const fullImage = createTestImageData(100, 100);
    const state: PipelineState = {
      fullImage,
      detections: [
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 20, y: 20, width: 40, height: 20 },
        },
      ],
      processingTimeMs: 0,
      config: {
        ...DEFAULT_PIPELINE_CONFIG,
        cropper: {
          padding: 10, // 10% relative
          paddingMode: 'relative',
        },
      },
    };

    service.execute(state);

    expect(state.detections[0].crop).toBeDefined();
    // 10% of width 40 = 4px padX, 10% of height 20 = 2 => clamped to min 4px padY
    // width = 40 + 4 + 4 = 48, height = 20 + 4 + 4 = 28
    expect(state.detections[0].crop?.width).toBe(48);
    expect(state.detections[0].crop?.height).toBe(28);
  });
});
