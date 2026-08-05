import { describe, expect, beforeEach, it } from 'vitest';
import { OfferExtractorService } from './offer-extractor.service';
import { PipelineState } from '../../pipeline/pipeline-state';
import { Detection } from '../types';

describe('OfferExtractorService', () => {
  let service: OfferExtractorService;

  beforeEach(() => {
    service = new OfferExtractorService();
  });

  it('should extract offers from vertical chalkboard list layout (BANANA 2Kg $4500)', () => {
    const detections: Detection[] = [
      {
        boundingBoxScore: 0.95,
        boundingBox: { x: 50, y: 50, width: 200, height: 40 },
        rawText: 'BANANA',
        canonicalText: 'BANANA',
      },
      {
        boundingBoxScore: 0.9,
        boundingBox: { x: 50, y: 100, width: 80, height: 40 },
        rawText: '2 Kg',
        quantity: { quantity: 2, unit: 'kg' },
      },
      {
        boundingBoxScore: 0.92,
        boundingBox: { x: 140, y: 100, width: 110, height: 40 },
        rawText: '$4500',
        price: '$4500',
      },
    ];

    const state: PipelineState = {
      detections,
      processingTimeMs: 0,
    };

    service.execute(state);

    expect(state.offers).toBeDefined();
    expect(state.offers?.length).toBe(1);

    const offer = state.offers![0];
    expect(offer.product).toBe('BANANA');
    expect(offer.price).toBe('$4500');
    expect(offer.quantity).toEqual({ quantity: 2, unit: 'kg' });
    expect(offer.detections.length).toBe(3);
    expect(offer.boundingBox.x).toBe(50);
    expect(offer.boundingBox.y).toBe(50);
    expect(offer.boundingBox.width).toBe(200);
    expect(offer.boundingBox.height).toBe(90);
  });

  it('should handle multi-item vertical chalkboard list (TOMATE, MANZANA, ESPARRAGOS)', () => {
    const detections: Detection[] = [
      // Item 1: TOMATE 2Kg $2500
      {
        boundingBoxScore: 0.95,
        boundingBox: { x: 50, y: 40, width: 220, height: 40 },
        rawText: 'TOMATE',
        canonicalText: 'TOMATE',
      },
      {
        boundingBoxScore: 0.92,
        boundingBox: { x: 50, y: 90, width: 220, height: 40 },
        rawText: '2Kg $2500',
        price: '$2500',
        quantity: { quantity: 2, unit: 'kg' },
      },
      // Item 2: MANZANA 2Kg $3500
      {
        boundingBoxScore: 0.94,
        boundingBox: { x: 50, y: 160, width: 230, height: 40 },
        rawText: 'MANZANA',
        canonicalText: 'MANZANA',
      },
      {
        boundingBoxScore: 0.91,
        boundingBox: { x: 50, y: 210, width: 230, height: 40 },
        rawText: '2Kg $3500',
        price: '$3500',
        quantity: { quantity: 2, unit: 'kg' },
      },
    ];

    const state: PipelineState = {
      detections,
      processingTimeMs: 0,
    };

    service.execute(state);

    expect(state.offers?.length).toBe(2);
    expect(state.offers![0].product).toBe('TOMATE');
    expect(state.offers![0].price).toBe('$2500');
    expect(state.offers![1].product).toBe('MANZANA');
    expect(state.offers![1].price).toBe('$3500');
  });

  it('should isolate grid cards in 2D poster layout (billboard_004)', () => {
    const detections: Detection[] = [
      // Card 1 (Top-Left): REMOLACHA / X PAQUETE / $999.99
      {
        boundingBoxScore: 0.9,
        boundingBox: { x: 20, y: 20, width: 150, height: 30 },
        rawText: 'REMOLACHA',
        canonicalText: 'REMOLACHA',
      },
      {
        boundingBoxScore: 0.9,
        boundingBox: { x: 20, y: 60, width: 140, height: 25 },
        rawText: 'X PAQUETE',
      },
      {
        boundingBoxScore: 0.95,
        boundingBox: { x: 20, y: 95, width: 120, height: 40 },
        rawText: '$999.99',
        price: '$999.99',
      },
      // Card 2 (Top-Right): MORRON VERDE / KG / $1999.99
      {
        boundingBoxScore: 0.9,
        boundingBox: { x: 300, y: 20, width: 160, height: 30 },
        rawText: 'MORRON VERDE',
        canonicalText: 'MORRON',
      },
      {
        boundingBoxScore: 0.9,
        boundingBox: { x: 300, y: 60, width: 80, height: 25 },
        rawText: 'KG',
      },
      {
        boundingBoxScore: 0.95,
        boundingBox: { x: 300, y: 95, width: 130, height: 40 },
        rawText: '$1999.99',
        price: '$1999.99',
      },
    ];

    const state: PipelineState = {
      detections,
      processingTimeMs: 0,
    };

    service.execute(state);

    expect(state.offers?.length).toBe(2);

    const offerCard1 = state.offers?.find((o) => o.price === '$999.99');
    expect(offerCard1).toBeDefined();
    expect(offerCard1?.product).toBe('REMOLACHA');

    const offerCard2 = state.offers?.find((o) => o.price === '$1999.99');
    expect(offerCard2).toBeDefined();
    expect(offerCard2?.product).toBe('MORRON');
  });

  it('should handle single-line offer lists with header and footer (billboard_006)', () => {
    const detections: Detection[] = [
      // Header: OFERTAS (non-offer)
      {
        boundingBoxScore: 0.9,
        boundingBox: { x: 50, y: 10, width: 200, height: 35 },
        rawText: 'OFERTAS',
      },
      // Line 1: PAPA 3KG 2000
      {
        boundingBoxScore: 0.95,
        boundingBox: { x: 50, y: 60, width: 80, height: 30 },
        rawText: 'PAPA',
        canonicalText: 'PAPA',
      },
      {
        boundingBoxScore: 0.9,
        boundingBox: { x: 140, y: 60, width: 50, height: 30 },
        rawText: '3KG',
        quantity: { quantity: 3, unit: 'kg' },
      },
      {
        boundingBoxScore: 0.95,
        boundingBox: { x: 200, y: 60, width: 60, height: 30 },
        rawText: '2000',
        price: '$2000',
      },
      // Line 2: LIMON 1KG 2000
      {
        boundingBoxScore: 0.95,
        boundingBox: { x: 50, y: 110, width: 90, height: 30 },
        rawText: 'LIMON',
        canonicalText: 'LIMON',
      },
      {
        boundingBoxScore: 0.9,
        boundingBox: { x: 150, y: 110, width: 50, height: 30 },
        rawText: '1KG',
        quantity: { quantity: 1, unit: 'kg' },
      },
      {
        boundingBoxScore: 0.95,
        boundingBox: { x: 210, y: 110, width: 60, height: 30 },
        rawText: '2000',
        price: '$2000',
      },
      // Footer: HAY GAS (non-offer)
      {
        boundingBoxScore: 0.88,
        boundingBox: { x: 50, y: 200, width: 180, height: 40 },
        rawText: 'HAY GAS',
      },
    ];

    const state: PipelineState = {
      detections,
      processingTimeMs: 0,
    };

    service.execute(state);

    expect(state.offers?.length).toBe(2);
    expect(state.offers![0].product).toBe('PAPA');
    expect(state.offers![0].quantity).toEqual({ quantity: 3, unit: 'kg' });
    expect(state.offers![0].price).toBe('$2000');

    expect(state.offers![1].product).toBe('LIMON');
    expect(state.offers![1].quantity).toEqual({ quantity: 1, unit: 'kg' });
    expect(state.offers![1].price).toBe('$2000');
  });

  it('should handle empty detections gracefully', () => {
    const state: PipelineState = {
      detections: [],
      processingTimeMs: 0,
    };

    service.execute(state);
    expect(state.offers).toEqual([]);
  });
});
