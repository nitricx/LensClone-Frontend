import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ShoppingListService } from './shopping-list.service';

describe('ShoppingListService', () => {
  let service: ShoppingListService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ShoppingListService],
    });
    service = TestBed.inject(ShoppingListService);
    service.clearList();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add item and compute total expenditure correctly', () => {
    service.addItem('Milk', 2, 3.50);
    service.addItem('Eggs', 1, 4.00);

    expect(service.itemCount()).toBe(2);
    expect(service.totalQuantity()).toBe(3);
    expect(service.totalEstimatedExpenditure()).toBe(11.00); // (2 * 3.50) + (1 * 4.00)
  });

  it('should update quantity and remove item if quantity is zero', () => {
    const item = service.addItem('Bread', 1, 2.50);
    service.updateQuantity(item.id, 3);
    expect(service.totalEstimatedExpenditure()).toBe(7.50);

    service.updateQuantity(item.id, 0);
    expect(service.itemCount()).toBe(0);
  });

  it('should estimate unit price for common items', () => {
    const estimated = service.estimateUnitPrice('Organic Milk 1L');
    expect(estimated).toBe(3.49);
  });
});
