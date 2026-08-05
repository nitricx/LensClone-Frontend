import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DictionaryMatcherService } from './dictionary-matcher.service';
import { WeightedLevenshteinService } from './weighted-levenshtein.service';
import { PipelineState } from '../../pipeline/pipeline-state';

describe('DictionaryMatcherService', () => {
  let service: DictionaryMatcherService;
  let levenshteinMock: WeightedLevenshteinService;

  beforeEach(() => {
    levenshteinMock = {
      similarity: vi.fn().mockImplementation((a: string, b: string) => {
        if (a === b || a.includes(b) || b.includes(a)) return 1.0;
        return 0.0;
      }),
    } as unknown as WeightedLevenshteinService;

    TestBed.configureTestingModule({
      providers: [
        DictionaryMatcherService,
        { provide: WeightedLevenshteinService, useValue: levenshteinMock },
      ],
    });

    service = TestBed.inject(DictionaryMatcherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should process detections with valid rawText and match products, prices, and quantities', () => {
    const state: PipelineState = {
      detections: [
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 0, y: 0, width: 10, height: 10 },
          rawText: 'MANZANA',
        },
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 0, y: 0, width: 10, height: 10 },
          rawText: '$ 1500',
        },
      ],
      processingTimeMs: 0,
    };

    service.execute(state);

    expect(state.detections[0].canonicalText).toBe('MANZANA');
    expect(state.detections[1].price).toBe('$1500');
  });

  it('should parse concatenated rawText like TOMATE2K6$3000, TOMATE2KG$3000, and 1K6$1500 correctly', () => {
    const state: PipelineState = {
      detections: [
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 0, y: 0, width: 10, height: 10 },
          rawText: 'TOMATE2K6$3000',
        },
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 0, y: 0, width: 10, height: 10 },
          rawText: 'TOMATE2KG$3000',
        },
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 0, y: 0, width: 10, height: 10 },
          rawText: '1K6$1500',
        },
      ],
      processingTimeMs: 0,
    };

    service.execute(state);

    expect(state.detections[0].canonicalText).toBe('TOMATE');
    expect(state.detections[0].quantity).toEqual({ quantity: 2, unit: 'kg' });
    expect(state.detections[0].price).toBe('$3000');

    expect(state.detections[1].canonicalText).toBe('TOMATE');
    expect(state.detections[1].quantity).toEqual({ quantity: 2, unit: 'kg' });
    expect(state.detections[1].price).toBe('$3000');

    expect(state.detections[2].quantity).toEqual({ quantity: 1, unit: 'kg' });
    expect(state.detections[2].price).toBe('$1500');
  });

  it('should skip detections without rawText', () => {
    const state: PipelineState = {
      detections: [
        {
          boundingBoxScore: 0.9,
          boundingBox: { x: 0, y: 0, width: 10, height: 10 },
        },
      ],
      processingTimeMs: 0,
    };

    service.execute(state);

    expect(state.detections[0].canonicalText).toBeUndefined();
    expect(state.detections[0].price).toBeUndefined();
    expect(state.detections[0].quantity).toBeUndefined();
  });
});
