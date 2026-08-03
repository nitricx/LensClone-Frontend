import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WeightedLevenshteinService } from './weighted-levenshtein.service';

describe('WeightedLevenshteinService', () => {
  let service: WeightedLevenshteinService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WeightedLevenshteinService],
    });
    service = TestBed.inject(WeightedLevenshteinService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return 1.0 for identical strings', () => {
    expect(service.similarity('LECHUGA', 'LECHUGA')).toBe(1.0);
  });

  it('should return 0.0 for completely different strings of equal length', () => {
    expect(service.similarity('AAAA', 'ZZZZ')).toBe(0.0);
  });

  it('should apply cheap substitutions for common OCR misreadings (e.g. O -> 0, I -> 1)', () => {
    // Distance should be 0.25 instead of 1.0, giving higher similarity than standard substitution
    const scoreCheap = service.similarity('CEB0LLA', 'CEBOLLA');
    const scoreStandard = service.similarity('CEBLLA', 'CEBOLLA');
    expect(scoreCheap).toBeGreaterThan(0.9);
    expect(scoreCheap).toBeGreaterThan(scoreStandard);
  });

  it('should handle empty string inputs gracefully', () => {
    expect(service.similarity('', '')).toBe(1.0);
    expect(service.similarity('A', '')).toBe(0.0);
    expect(service.similarity('', 'B')).toBe(0.0);
  });
});
