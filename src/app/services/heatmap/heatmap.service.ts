import { Injectable, signal, computed } from '@angular/core';
import { ShoppingListItem } from '../shopping-list/shopping-list.service';

export interface StoreLocation {
  id: string;
  name: string;
  chain: string;
  address: string;
  lat: number;
  lng: number;
  priceMultiplier: number; // Store-specific price index multiplier (e.g. 0.88 = 12% cheaper, 1.15 = 15% pricier)
}

export interface ProductPriceSample {
  id: string;
  productName: string;
  category: 'Dairy' | 'Bakery' | 'Produce' | 'Beverages' | 'Pantry';
  basePrice: number;
}

export interface StoreGrocerySummary {
  storeId: string;
  storeName: string;
  chain: string;
  address: string;
  lat: number;
  lng: number;
  estimatedBasketTotal: number;
  averageItemPrice: number;
  savingsPercentage: number; // positive = savings %, negative = markup %
  priceIndexScore: number; // 0 (cheapest/green) to 1 (most expensive/red)
  status: 'best' | 'average' | 'expensive';
  itemCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class HeatmapService {
  // Center Coordinates: San Isidro / Northern Greater Buenos Aires region (34°29'54.1"S 58°29'51.1"W)
  readonly CENTER_LAT = -34.498361;
  readonly CENTER_LNG = -58.497528;

  // Monitored Supermarket Store Locations with explicit GPS Coordinates
  readonly stores = signal<StoreLocation[]>([
    {
      id: 's1',
      name: 'FreshMarket North',
      chain: 'FreshMarket',
      address: 'Av. Santa Fe 1840, San Isidro',
      lat: -34.498361 + 0.035,
      lng: -58.497528 + 0.012,
      priceMultiplier: 0.88, // 12% cheaper on average
    },
    {
      id: 's2',
      name: 'MegaMart Outlet',
      chain: 'MegaMart',
      address: 'Calle Centenario 450, San Isidro',
      lat: -34.498361 + 0.042,
      lng: -58.497528 - 0.018,
      priceMultiplier: 0.91, // 9% cheaper
    },
    {
      id: 's3',
      name: 'DiscountPlaza West',
      chain: 'DiscountPlaza',
      address: 'Av. Avelino Rolón 2100, Boulogne',
      lat: -34.498361 + 0.005,
      lng: -58.497528 - 0.041,
      priceMultiplier: 0.94, // 6% cheaper
    },
    {
      id: 's4',
      name: 'ValueFoods Park',
      chain: 'ValueFoods',
      address: 'Calle Blanco Encalada 1200, San Isidro',
      lat: -34.498361 - 0.015,
      lng: -58.497528 - 0.038,
      priceMultiplier: 0.98, // 2% cheaper
    },
    {
      id: 's5',
      name: 'MetroGrocer Express',
      chain: 'MetroGrocer',
      address: 'Av. del Libertador 14200, Martínez',
      lat: -34.498361 + 0.002,
      lng: -58.497528 + 0.003,
      priceMultiplier: 1.05, // 5% above average
    },
    {
      id: 's6',
      name: 'OrganicCorner Center',
      chain: 'OrganicCorner',
      address: 'Calle General Belgrano 320, San Isidro',
      lat: -34.498361 - 0.008,
      lng: -58.497528 - 0.004,
      priceMultiplier: 1.12, // 12% above average
    },
  ]);

  // Catalog of tracked sample products & categories
  readonly productCatalog = signal<ProductPriceSample[]>([
    { id: 'p1', productName: 'Organic Whole Milk 1L', category: 'Dairy', basePrice: 3.49 },
    { id: 'p2', productName: 'Large Brown Eggs 12-pack', category: 'Dairy', basePrice: 3.99 },
    { id: 'p3', productName: 'Whole Wheat Bread', category: 'Bakery', basePrice: 2.80 },
    { id: 'p4', productName: 'Ground Coffee 250g', category: 'Beverages', basePrice: 7.50 },
    { id: 'p5', productName: 'Avocado 2-pack', category: 'Produce', basePrice: 4.20 },
    { id: 'p6', productName: 'Bananas 1kg', category: 'Produce', basePrice: 1.89 },
    { id: 'p7', productName: 'Pasta 500g', category: 'Pantry', basePrice: 1.79 },
    { id: 'p8', productName: 'Extra Virgin Olive Oil 500ml', category: 'Pantry', basePrice: 8.49 },
  ]);

  // Active filters
  readonly selectedProduct = signal<string>('ALL'); // 'ALL' or productName
  readonly selectedCategory = signal<string>('ALL'); // 'ALL' or Category name

  readonly categories = computed(() => {
    const set = new Set<string>();
    for (const p of this.productCatalog()) {
      set.add(p.category);
    }
    return Array.from(set);
  });

  /**
   * Calculates estimated item price for a specific product at a specific store location.
   */
  getProductPriceAtStore(productName: string, storeId: string): number {
    const store = this.stores().find((s) => s.id === storeId);
    const multiplier = store ? store.priceMultiplier : 1.0;

    const catalogItem = this.productCatalog().find(
      (p) => p.productName.toLowerCase() === productName.toLowerCase()
    );

    const base = catalogItem ? catalogItem.basePrice : 3.5;
    return Math.round(base * multiplier * 100) / 100;
  }

  /**
   * Calculates store summaries and basket totals for a list of grocery items.
   */
  calculateStoreSummaries(items: ShoppingListItem[]): StoreGrocerySummary[] {
    const storesList = this.stores();

    if (items.length === 0) {
      return storesList.map((s) => ({
        storeId: s.id,
        storeName: s.name,
        chain: s.chain,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        estimatedBasketTotal: 0,
        averageItemPrice: 0,
        savingsPercentage: Math.round((1 - s.priceMultiplier) * 100),
        priceIndexScore: Math.max(0, Math.min(1, (s.priceMultiplier - 0.85) / 0.35)),
        status: s.priceMultiplier < 0.95 ? 'best' : s.priceMultiplier <= 1.08 ? 'average' : 'expensive',
        itemCount: 0,
      }));
    }

    // Calculate reference average total
    let totalReferenceSum = 0;
    for (const item of items) {
      const activePrice = item.manualUnitPrice ?? item.estimatedUnitPrice;
      totalReferenceSum += activePrice * item.quantity;
    }

    const summaries: StoreGrocerySummary[] = storesList.map((s) => {
      let storeBasketTotal = 0;
      let totalQty = 0;

      for (const item of items) {
        const itemStorePrice = this.getProductPriceAtStore(item.name, s.id);
        storeBasketTotal += itemStorePrice * item.quantity;
        totalQty += item.quantity;
      }

      storeBasketTotal = Math.round(storeBasketTotal * 100) / 100;
      const averageItemPrice = Math.round((storeBasketTotal / (totalQty || 1)) * 100) / 100;

      const diffVsReference = totalReferenceSum - storeBasketTotal;
      const savingsPercentage = Math.round((diffVsReference / (totalReferenceSum || 1)) * 100);

      const priceIndexScore = Math.max(0, Math.min(1, (s.priceMultiplier - 0.85) / 0.35));

      let status: 'best' | 'average' | 'expensive' = 'average';
      if (savingsPercentage > 5) {
        status = 'best';
      } else if (savingsPercentage < -5) {
        status = 'expensive';
      }

      return {
        storeId: s.id,
        storeName: s.name,
        chain: s.chain,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        estimatedBasketTotal: storeBasketTotal,
        averageItemPrice,
        savingsPercentage,
        priceIndexScore,
        status,
        itemCount: items.length,
      };
    });

    // Sort by cheapest basket total first
    return summaries.sort((a, b) => a.estimatedBasketTotal - b.estimatedBasketTotal);
  }
}
