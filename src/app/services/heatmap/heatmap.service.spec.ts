import { TestBed } from '@angular/core/testing';
import { HeatmapService } from './heatmap.service';
import { ShoppingListItem } from '../shopping-list/shopping-list.service';

describe('HeatmapService', () => {
  let service: HeatmapService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HeatmapService);
  });

  it('should be created with initial stores and product catalog', () => {
    expect(service).toBeTruthy();
    expect(service.stores().length).toBeGreaterThan(0);
    expect(service.productCatalog().length).toBeGreaterThan(0);
  });

  it('should calculate product price at specific store location according to price multiplier', () => {
    const s1Price = service.getProductPriceAtStore('Organic Whole Milk 1L', 's1');
    const s5Price = service.getProductPriceAtStore('Organic Whole Milk 1L', 's5');
    expect(s1Price).toBeLessThan(s5Price);
  });

  it('should calculate store basket summaries for shopping list items', () => {
    const sampleItems: ShoppingListItem[] = [
      { id: '1', name: 'Organic Whole Milk 1L', quantity: 2, estimatedUnitPrice: 3.49 },
      { id: '2', name: 'Large Brown Eggs 12-pack', quantity: 1, estimatedUnitPrice: 3.99 },
    ];

    const summaries = service.calculateStoreSummaries(sampleItems);
    expect(summaries.length).toBe(6);
    // Should be sorted by lowest basket total first
    expect(summaries[0].estimatedBasketTotal).toBeLessThanOrEqual(summaries[1].estimatedBasketTotal);
    expect(summaries[0].status).toBe('best');
  });
});
