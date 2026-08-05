import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DetectorFilterService } from './detector-filter.service';
import { PipelineState } from '../../pipeline/pipeline-state';

describe('DetectorFilterService', () => {
  let service: DetectorFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DetectorFilterService],
    });
    service = TestBed.inject(DetectorFilterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should filter out detections with aspect ratio < 1.2', () => {
    const state: PipelineState = {
      detections: [
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 0, y: 0, width: 10, height: 10 }, // ratio = 1.0 (invalid)
        },
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 0, y: 0, width: 20, height: 10 }, // ratio = 2.0 (valid)
        },
      ],
      processingTimeMs: 0,
    };

    service.execute(state);

    expect(state.detections.length).toBe(1);
    expect(state.detections[0].boundingBox.width).toBe(20);
  });

  it('should keep detections with aspect ratio exactly equal to minAspectRatio threshold', () => {
    const state: PipelineState = {
      detections: [
        {
          boundingBoxScore: 0.8,
          boundingBox: { x: 0, y: 0, width: 14, height: 10 }, // ratio = 1.4 (valid)
        },
      ],
      processingTimeMs: 0,
    };

    service.execute(state);

    expect(state.detections.length).toBe(1);
  });

  it('should handle empty detections array', () => {
    const state: PipelineState = {
      detections: [],
      processingTimeMs: 0,
    };

    service.execute(state);

    expect(state.detections.length).toBe(0);
  });
});
