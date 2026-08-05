import { describe, it, expect, beforeEach } from 'vitest';
import { TrackerService, calculateIoU } from './tracker.service';
import { PipelineState } from '../../pipeline/pipeline-state';
import { DEFAULT_PIPELINE_CONFIG } from '../../pipeline/pipeline-config.types';

describe('calculateIoU', () => {
  it('should return 1.0 for identical boxes', () => {
    const box = { x: 10, y: 10, width: 100, height: 50 };
    expect(calculateIoU(box, box)).toBe(1.0);
  });

  it('should return 0.0 for non-overlapping boxes', () => {
    const boxA = { x: 0, y: 0, width: 10, height: 10 };
    const boxB = { x: 20, y: 20, width: 10, height: 10 };
    expect(calculateIoU(boxA, boxB)).toBe(0.0);
  });

  it('should return correct overlap ratio for partially overlapping boxes', () => {
    const boxA = { x: 0, y: 0, width: 20, height: 20 }; // area 400
    const boxB = { x: 10, y: 0, width: 20, height: 20 }; // area 400, intersection 10x20 = 200, union = 600
    expect(calculateIoU(boxA, boxB)).toBeCloseTo(200 / 600, 4);
  });
});

describe('TrackerService', () => {
  let service: TrackerService;

  beforeEach(() => {
    service = new TrackerService();
    service.reset();
  });

  it('should assign a trackId and set isReused to false for new detections', () => {
    const state: PipelineState = {
      detections: [
        { boundingBoxScore: 0.9, boundingBox: { x: 10, y: 10, width: 100, height: 50 } },
      ],
      processingTimeMs: 0,
      config: DEFAULT_PIPELINE_CONFIG,
    };

    service.execute(state);

    expect(state.detections.length).toBe(1);
    expect(state.detections[0].trackId).toBeDefined();
    expect(state.detections[0].isReused).toBe(false);
  });

  it('should match consecutive frame detections and reuse text results with EMA box smoothing', () => {
    const frame1State: PipelineState = {
      detections: [
        { boundingBoxScore: 0.9, boundingBox: { x: 10, y: 10, width: 100, height: 50 } },
      ],
      processingTimeMs: 0,
      config: DEFAULT_PIPELINE_CONFIG,
    };

    service.execute(frame1State);
    const assignedTrackId = frame1State.detections[0].trackId;

    // Simulate downstream recognition stage writing complete 3-property text with >= 0.95 confidence
    frame1State.detections[0].rawText = 'LECHE';
    frame1State.detections[0].rawTextScore = 0.96;
    frame1State.detections[0].canonicalText = 'Leche Entera';
    frame1State.detections[0].quantity = { quantity: 1, unit: 'kg' };
    frame1State.detections[0].price = '$1200';

    // Frame 2: slightly shifted bounding box (x: 12 instead of 10)
    const frame2State: PipelineState = {
      detections: [
        { boundingBoxScore: 0.95, boundingBox: { x: 12, y: 10, width: 100, height: 50 } },
      ],
      processingTimeMs: 0,
      config: DEFAULT_PIPELINE_CONFIG,
    };

    service.execute(frame2State);

    expect(frame2State.detections.length).toBe(1);
    const matchedDet = frame2State.detections[0];

    expect(matchedDet.trackId).toBe(assignedTrackId);
    expect(matchedDet.isReused).toBe(true);
    expect(matchedDet.canonicalText).toBe('Leche Entera');
    expect(matchedDet.price).toBe('$1200');

    // EMA smoothing check (smoothingFactor = 0.6 => Math.round(0.6 * 12 + 0.4 * 10) = 11)
    expect(matchedDet.boundingBox.x).toBe(11);
  });

  it('should continue running recognition if rawTextScore < 0.95 or if any of product, quantity, or price are missing', () => {
    const frame1State: PipelineState = {
      detections: [
        { boundingBoxScore: 0.9, boundingBox: { x: 10, y: 10, width: 100, height: 50 } },
      ],
      processingTimeMs: 0,
      config: DEFAULT_PIPELINE_CONFIG,
    };

    service.execute(frame1State);
    const assignedTrackId = frame1State.detections[0].trackId;

    // Detection has missing price and rawTextScore < 0.95
    frame1State.detections[0].rawText = 'TOMATE';
    frame1State.detections[0].rawTextScore = 0.85;
    frame1State.detections[0].canonicalText = 'TOMATE';
    frame1State.detections[0].quantity = { quantity: 2, unit: 'kg' };

    const frame2State: PipelineState = {
      detections: [
        { boundingBoxScore: 0.9, boundingBox: { x: 10, y: 10, width: 100, height: 50 } },
      ],
      processingTimeMs: 0,
      config: DEFAULT_PIPELINE_CONFIG,
    };

    service.execute(frame2State);

    expect(frame2State.detections[0].trackId).toBe(assignedTrackId);
    expect(frame2State.detections[0].needsRefresh).toBe(true);
    expect(frame2State.detections[0].isReused).toBe(false);
  });

  it('should extrapolate detection when box is missed for 1 frame (drop tolerance)', () => {
    const frame1State: PipelineState = {
      detections: [
        { boundingBoxScore: 0.9, boundingBox: { x: 10, y: 10, width: 100, height: 50 } },
      ],
      processingTimeMs: 0,
      config: DEFAULT_PIPELINE_CONFIG,
    };

    service.execute(frame1State);
    frame1State.detections[0].canonicalText = 'Queso';

    // Frame 2: detector returns 0 detections (temporary occlusion or motion blur)
    const frame2State: PipelineState = {
      detections: [],
      processingTimeMs: 0,
      config: DEFAULT_PIPELINE_CONFIG,
    };

    service.execute(frame2State);

    expect(frame2State.detections.length).toBe(1);
    expect(frame2State.detections[0].isExtrapolated).toBe(true);
    expect(frame2State.detections[0].isReused).toBe(true);
    expect(frame2State.detections[0].canonicalText).toBe('Queso');
  });

  it('should remove track after exceeding maxMisses', () => {
    const frame1State: PipelineState = {
      detections: [
        { boundingBoxScore: 0.9, boundingBox: { x: 10, y: 10, width: 100, height: 50 } },
      ],
      processingTimeMs: 0,
      config: DEFAULT_PIPELINE_CONFIG,
    };

    service.execute(frame1State);

    const configWithMaxMisses1 = {
      ...DEFAULT_PIPELINE_CONFIG,
      tracking: { ...DEFAULT_PIPELINE_CONFIG.tracking, maxMisses: 1 },
    };

    // Miss 1
    const frame2State: PipelineState = { detections: [], processingTimeMs: 0, config: configWithMaxMisses1 };
    service.execute(frame2State);
    expect(frame2State.detections.length).toBe(1);

    // Miss 2 (exceeds maxMisses = 1)
    const frame3State: PipelineState = { detections: [], processingTimeMs: 0, config: configWithMaxMisses1 };
    service.execute(frame3State);
    expect(frame3State.detections.length).toBe(0);
  });

  it('should request refresh when refreshIntervalFrames is reached', () => {
    const configShortRefresh = {
      ...DEFAULT_PIPELINE_CONFIG,
      tracking: { ...DEFAULT_PIPELINE_CONFIG.tracking, refreshIntervalFrames: 2 },
    };

    const frame1State: PipelineState = {
      detections: [
        { boundingBoxScore: 0.9, boundingBox: { x: 10, y: 10, width: 100, height: 50 } },
      ],
      processingTimeMs: 0,
      config: configShortRefresh,
    };

    frame1State.detections[0].rawText = 'TOMATE';
    frame1State.detections[0].rawTextScore = 0.96;
    frame1State.detections[0].canonicalText = 'TOMATE';
    frame1State.detections[0].quantity = { quantity: 2, unit: 'kg' };
    frame1State.detections[0].price = '$3000';

    // Frame 2 (delta = 1 < refreshIntervalFrames)
    const frame2State: PipelineState = {
      detections: [
        { boundingBoxScore: 0.9, boundingBox: { x: 10, y: 10, width: 100, height: 50 } },
      ],
      processingTimeMs: 0,
      config: configShortRefresh,
    };
    service.execute(frame2State);
    expect(frame2State.detections[0].needsRefresh).toBe(false);

    // Frame 3 (delta = 2 >= refreshIntervalFrames)
    const frame3State: PipelineState = {
      detections: [
        { boundingBoxScore: 0.9, boundingBox: { x: 10, y: 10, width: 100, height: 50 } },
      ],
      processingTimeMs: 0,
      config: configShortRefresh,
    };
    service.execute(frame3State);
    expect(frame3State.detections[0].needsRefresh).toBe(true);
  });
});
