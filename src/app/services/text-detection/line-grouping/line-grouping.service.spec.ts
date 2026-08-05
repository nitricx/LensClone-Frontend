import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LineGroupingService } from './line-grouping.service';
import { PipelineState } from '../../pipeline/pipeline-state';

describe('LineGroupingService', () => {
  let service: LineGroupingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LineGroupingService],
    });
    service = TestBed.inject(LineGroupingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should reset existing line assignments and group horizontally aligned detections', () => {
    const state: PipelineState = {
      detections: [
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 10, y: 10, width: 30, height: 15 },
          line: { id: 999, score: 0.5 }, // Existing line assignment to be cleared
        },
        {
          boundingBoxScore: 0.85,
          boundingBox: { x: 45, y: 11, width: 30, height: 15 },
        },
      ],
      processingTimeMs: 0,
    };

    service.execute(state);

    expect(state.detections[0].line).toBeDefined();
    expect(state.detections[1].line).toBeDefined();
    expect(state.detections[0].line?.id).toBe(state.detections[1].line?.id);
  });

  it('should separate detections into different lines when vertically distant', () => {
    const state: PipelineState = {
      detections: [
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 10, y: 10, width: 30, height: 10 },
        },
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 10, y: 100, width: 30, height: 10 }, // Far below
        },
      ],
      processingTimeMs: 0,
    };

    service.execute(state);

    expect(state.detections[0].line?.id).not.toBe(state.detections[1].line?.id);
  });

  it('should handle empty detections array cleanly', () => {
    const state: PipelineState = {
      detections: [],
      processingTimeMs: 0,
    };

    expect(() => service.execute(state)).not.toThrow();
    expect(state.detections.length).toBe(0);
  });
});
