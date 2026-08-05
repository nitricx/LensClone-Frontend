import { describe, it, expect } from 'vitest';
import {
  isDetectionPrice,
  isDetectionQuantity,
  isDetectionProduct,
  hasAllThreeProperties,
} from './detection-helpers';
import { Detection } from '../types';

describe('detection-helpers', () => {
  it('should correctly identify price detections', () => {
    expect(isDetectionPrice({ price: '$1000' } as Detection)).toBe(true);
    expect(isDetectionPrice({ rawText: '$ 1500' } as Detection)).toBe(true);
    expect(isDetectionPrice({ rawText: '2500' } as Detection)).toBe(true);
    expect(isDetectionPrice({ rawText: 'GALLETITAS' } as Detection)).toBe(false);
  });

  it('should correctly identify quantity detections', () => {
    expect(isDetectionQuantity({ quantity: { quantity: 2, unit: 'kg' } } as Detection)).toBe(true);
    expect(isDetectionQuantity({ rawText: '500G' } as Detection)).toBe(true);
    expect(isDetectionQuantity({ rawText: '2.5 L' } as Detection)).toBe(true);
    expect(isDetectionQuantity({ rawText: 'X PAQUETE' } as Detection)).toBe(true);
    expect(isDetectionQuantity({ rawText: 'GALLETITAS' } as Detection)).toBe(false);
  });

  it('should correctly identify product detections', () => {
    expect(isDetectionProduct({ canonicalText: 'COCA' } as Detection)).toBe(true);
    expect(isDetectionProduct({ rawText: 'GALLETITAS' } as Detection)).toBe(true);
    expect(isDetectionProduct({ rawText: 'OFERTAS', isHeader: true } as Detection)).toBe(false);
    expect(isDetectionProduct({ rawText: '500G' } as Detection)).toBe(false);
    expect(isDetectionProduct({ rawText: '$1000' } as Detection)).toBe(false);
  });

  it('should validate if a set of detections contains product, quantity, and price', () => {
    const validGroup: Detection[] = [
      { rawText: 'ARROZ', canonicalText: 'ARROZ' } as Detection,
      { rawText: '1KG', quantity: { quantity: 1, unit: 'kg' } } as Detection,
      { rawText: '$1500', price: '$1500' } as Detection,
    ];
    expect(hasAllThreeProperties(validGroup)).toBe(true);

    const missingQuantity: Detection[] = [
      { rawText: 'ARROZ', canonicalText: 'ARROZ' } as Detection,
      { rawText: '$1500', price: '$1500' } as Detection,
    ];
    expect(hasAllThreeProperties(missingQuantity)).toBe(false);

    const headerOnly: Detection[] = [
      { rawText: 'OFERTAS ALMACEN', isHeader: true } as Detection,
    ];
    expect(hasAllThreeProperties(headerOnly)).toBe(false);
  });
});
