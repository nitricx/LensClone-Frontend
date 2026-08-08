import { TestBed } from '@angular/core/testing';
import { HeatmapService } from './heatmap.service';
import { ShoppingListItem } from '../shopping-list/shopping-list.service';

describe('HeatmapService', () => {
  let service: HeatmapService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HeatmapService);
  });

  it('should be created with initial zones and product catalog', () => {
    expect(service).toBeTruthy();
    expect(service.zones().length).toBeGreaterThan(0);
    expect(service.productCatalog().length).toBeGreaterThan(0);
  });

  it('should calculate product price in specific zone according to price multiplier', () => {
    const northPrice = service.getProductPriceInZone('Organic Whole Milk 1L', 'zone_north');
    const southPrice = service.getProductPriceInZone('Organic Whole Milk 1L', 'zone_south');
    expect(northPrice).toBeLessThan(southPrice);
  });

  it('should calculate zone basket summaries for shopping list items', () => {
    const sampleItems: ShoppingListItem[] = [
      { id: '1', name: 'Organic Whole Milk 1L', quantity: 2, estimatedUnitPrice: 3.49 },
      { id: '2', name: 'Large Brown Eggs 12-pack', quantity: 1, estimatedUnitPrice: 3.99 },
    ];

    const summaries = service.calculateListZoneSummaries(sampleItems);
    expect(summaries.length).toBe(4);
    // Should be sorted by lowest basket total first
    expect(summaries[0].estimatedBasketTotal).toBeLessThanOrEqual(summaries[1].estimatedBasketTotal);
    expect(summaries[0].status).toBe('best');
  });
});
