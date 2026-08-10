import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { ShoppingListItem } from '../shopping-list/shopping-list.service';
import { SettingsService } from '../settings/settings.service';

export interface StoreLocation {
  id: string;
  name: string;
  chain: string;
  address: string;
  lat: number;
  lng: number;
  priceMultiplier: number;
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
  savingsPercentage: number;
  priceIndexScore: number;
  status: 'best' | 'average' | 'expensive';
  itemCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class HeatmapService {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(SettingsService);

  readonly CENTER_LAT = -34.498361;
  readonly CENTER_LNG = -58.497528;

  // Local neighborhood grocery stores default signal
  readonly stores = signal<StoreLocation[]>([
    {
      id: 's1',
      name: 'Almacén Don Pedro',
      chain: 'Local Grocery',
      address: 'Av. Santa Fe 1840, San Isidro',
      lat: -34.498361 + 0.035,
      lng: -58.497528 + 0.012,
      priceMultiplier: 0.88,
    },
    {
      id: 's2',
      name: 'Minimercado Los Amigos',
      chain: 'Local Grocery',
      address: 'Calle Centenario 450, San Isidro',
      lat: -34.498361 + 0.042,
      lng: -58.497528 - 0.018,
      priceMultiplier: 0.91,
    },
    {
      id: 's3',
      name: 'Despensa Santa Rosa',
      chain: 'Local Grocery',
      address: 'Av. Avelino Rolón 2100, Boulogne',
      lat: -34.498361 + 0.005,
      lng: -58.497528 - 0.041,
      priceMultiplier: 0.94,
    },
    {
      id: 's4',
      name: 'Verdulería San José',
      chain: 'Local Grocery',
      address: 'Calle Blanco Encalada 1200, San Isidro',
      lat: -34.498361 - 0.015,
      lng: -58.497528 - 0.038,
      priceMultiplier: 0.98,
    },
    {
      id: 's5',
      name: 'Granja El Sol',
      chain: 'Local Grocery',
      address: 'Av. del Libertador 14200, Martínez',
      lat: -34.498361 + 0.002,
      lng: -58.497528 + 0.003,
      priceMultiplier: 1.05,
    },
    {
      id: 's6',
      name: 'Mercadito Don Mateo',
      chain: 'Local Grocery',
      address: 'Calle General Belgrano 320, San Isidro',
      lat: -34.498361 - 0.008,
      lng: -58.497528 - 0.004,
      priceMultiplier: 1.12,
    },
  ]);

  readonly productCatalog = signal<ProductPriceSample[]>([
    { id: 'p1', productName: 'Organic Whole Milk 1L', category: 'Dairy', basePrice: 1250 },
    { id: 'p2', productName: 'Large Brown Eggs 12-pack', category: 'Dairy', basePrice: 2800 },
    { id: 'p3', productName: 'French Bread 1kg', category: 'Bakery', basePrice: 2200 },
    { id: 'p4', productName: 'Ground Coffee 250g', category: 'Beverages', basePrice: 3800 },
    { id: 'p5', productName: 'Tomatoes 1kg', category: 'Produce', basePrice: 1800 },
    { id: 'p6', productName: 'Bananas 1kg', category: 'Produce', basePrice: 1400 },
    { id: 'p7', productName: 'Pasta 500g', category: 'Pantry', basePrice: 1150 },
    { id: 'p8', productName: 'Sunflower Oil 900ml', category: 'Pantry', basePrice: 1950 },
  ]);

  readonly selectedProduct = signal<string>('ALL');
  readonly selectedCategory = signal<string>('ALL');

  readonly categories = computed(() => {
    const set = new Set<string>();
    for (const p of this.productCatalog()) {
      set.add(p.category);
    }
    return Array.from(set);
  });

  fetchSpatialHeatmap(lat = this.CENTER_LAT, lng = this.CENTER_LNG, radiusKm = 10.0): void {
    const url = `${this.settings.backendApiUrl()}/../stores/heatmap?lat=${lat}&lon=${lng}&radiusKm=${radiusKm}`;
    this.http
      .get<StoreGrocerySummary[]>(url)
      .pipe(catchError(() => of([])))
      .subscribe((data) => {
        if (data && data.length > 0) {
          const mapped: StoreLocation[] = data.map((d) => ({
            id: d.storeId,
            name: d.storeName,
            chain: d.chain,
            address: d.address,
            lat: d.lat,
            lng: d.lng,
            priceMultiplier: Math.round((1 - d.savingsPercentage / 100) * 100) / 100,
          }));
          this.stores.set(mapped);
        }
      });
  }

  getProductPriceAtStore(productName: string, storeId: string): number {
    const store = this.stores().find((s) => s.id === storeId);
    const multiplier = store ? store.priceMultiplier : 1.0;

    const catalogItem = this.productCatalog().find(
      (p) => p.productName.toLowerCase() === productName.toLowerCase()
    );

    const base = catalogItem ? catalogItem.basePrice : 1800;
    return Math.round(base * multiplier * 100) / 100;
  }

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
      const savingsPercentage = Math.round((1 - s.priceMultiplier) * 100);
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

    return summaries.sort((a, b) => a.estimatedBasketTotal - b.estimatedBasketTotal);
  }
}
