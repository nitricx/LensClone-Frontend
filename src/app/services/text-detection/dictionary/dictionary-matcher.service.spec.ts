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
        if (a === b) return 1.0;
        if (a === 'MANZANA' && b === 'MANZANA') return 1.0;
        if (a === '1KG' && b === '1KG') return 1.0;
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
    expect(state.detections[1].price).toBe('1500');
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
