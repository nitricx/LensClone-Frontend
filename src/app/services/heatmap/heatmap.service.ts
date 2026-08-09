import { Injectable, signal, computed } from '@angular/core';
import { ShoppingListItem } from '../shopping-list/shopping-list.service';

export interface StoreLocation {
  id: string;
  name: string;
  chain: string;
  zoneId: string;
  latOffset: number; // Offset relative to center (-0.05 to +0.05)
  lngOffset: number;
  lat?: number;
  lng?: number;
}

export interface GeographicZone {
  id: string;
  name: string;
  code: 'north' | 'central' | 'west' | 'south';
  color: string;
  description: string;
  stores: StoreLocation[];
  priceMultiplier: number; // Regional price index multiplier (e.g. 0.88 = 12% cheaper, 1.15 = 15% pricier)
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
}

export interface ProductPriceSample {
  id: string;
  productName: string;
  category: 'Dairy' | 'Bakery' | 'Produce' | 'Beverages' | 'Pantry';
  basePrice: number;
}

export interface ZoneGrocerySummary {
  zoneId: string;
  zoneName: string;
  zoneCode: 'north' | 'central' | 'west' | 'south';
  estimatedBasketTotal: number;
  averageItemPrice: number;
  savingsPercentage: number; // positive = savings %, negative = markup %
  priceIndexScore: number; // 0 (cheapest/green) to 1 (most expensive/red)
  status: 'best' | 'average' | 'expensive';
  itemCount: number;
  storesCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class HeatmapService {
  // Center Coordinates: San Isidro / Northern Greater Buenos Aires region (34°29'54.1"S 58°29'51.1"W)
  readonly CENTER_LAT = -34.498361;
  readonly CENTER_LNG = -58.497528;

  // Pre-configured Monitored Regional Zones
  readonly zones = signal<GeographicZone[]>([
    {
      id: 'zone_north',
      name: 'North Commercial Hub',
      code: 'north',
      color: '#10b981', // Emerald / Best value default
      description: 'High competition bulk discount retail zone',
      priceMultiplier: 0.88, // 12% cheaper on average
      centerLat: -34.498361 + 0.038,
      centerLng: -58.497528 - 0.003,
      radiusMeters: 3800,
      stores: [
        { id: 's1', name: 'FreshMarket North', chain: 'FreshMarket', zoneId: 'zone_north', latOffset: 0.035, lngOffset: 0.012, lat: -34.498361 + 0.035, lng: -58.497528 + 0.012 },
        { id: 's2', name: 'MegaMart Outlet', chain: 'MegaMart', zoneId: 'zone_north', latOffset: 0.042, lngOffset: -0.018, lat: -34.498361 + 0.042, lng: -58.497528 - 0.018 },
      ],
    },
    {
      id: 'zone_west',
      name: 'Westside Outskirts',
      code: 'west',
      color: '#06b6d4', // Cyan / Good value
      description: 'Suburban supermarket district with moderate prices',
      priceMultiplier: 0.94, // 6% cheaper
      centerLat: -34.498361 - 0.005,
      centerLng: -58.497528 - 0.040,
      radiusMeters: 3600,
      stores: [
        { id: 's3', name: 'DiscountPlaza West', chain: 'DiscountPlaza', zoneId: 'zone_west', latOffset: 0.005, lngOffset: -0.041, lat: -34.498361 + 0.005, lng: -58.497528 - 0.041 },
        { id: 's4', name: 'ValueFoods Park', chain: 'ValueFoods', zoneId: 'zone_west', latOffset: -0.015, lngOffset: -0.038, lat: -34.498361 - 0.015, lng: -58.497528 - 0.038 },
      ],
    },
    {
      id: 'zone_central',
      name: 'Central City District',
      code: 'central',
      color: '#f59e0b', // Amber / Average
      description: 'Convenient downtown grocery hubs',
      priceMultiplier: 1.05, // 5% above average
      centerLat: -34.498361 - 0.003,
      centerLng: -58.497528 - 0.001,
      radiusMeters: 2800,
      stores: [
        { id: 's5', name: 'MetroGrocer Express', chain: 'MetroGrocer', zoneId: 'zone_central', latOffset: 0.002, lngOffset: 0.003, lat: -34.498361 + 0.002, lng: -58.497528 + 0.003 },
        { id: 's6', name: 'OrganicCorner Center', chain: 'OrganicCorner', zoneId: 'zone_central', latOffset: -0.008, lngOffset: -0.004, lat: -34.498361 - 0.008, lng: -58.497528 - 0.004 },
      ],
    },
    {
      id: 'zone_south',
      name: 'South Financial Quarter',
      code: 'south',
      color: '#ef4444', // Red / Premium prices
      description: 'Premium organic gourmet markets and express stores',
      priceMultiplier: 1.16, // 16% above average
      centerLat: -34.498361 - 0.041,
      centerLng: -58.497528 + 0.016,
      radiusMeters: 3700,
      stores: [
        { id: 's7', name: 'SuperSave Premium', chain: 'SuperSave', zoneId: 'zone_south', latOffset: -0.038, lngOffset: 0.025, lat: -34.498361 - 0.038, lng: -58.497528 + 0.025 },
        { id: 's8', name: 'EcoMart South', chain: 'EcoMart', zoneId: 'zone_south', latOffset: -0.045, lngOffset: 0.008, lat: -34.498361 - 0.045, lng: -58.497528 + 0.008 },
      ],
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
   * Calculates estimated item price for a specific product in a specific zone.
   */
  getProductPriceInZone(productName: string, zoneId: string): number {
    const zone = this.zones().find((z) => z.id === zoneId);
    const multiplier = zone ? zone.priceMultiplier : 1.0;

    const catalogItem = this.productCatalog().find(
      (p) => p.productName.toLowerCase() === productName.toLowerCase()
    );

    const base = catalogItem ? catalogItem.basePrice : 3.5;
    return Math.round(base * multiplier * 100) / 100;
  }

  /**
   * Calculates zone summaries and basket totals for a list of grocery items.
   */
  calculateListZoneSummaries(items: ShoppingListItem[]): ZoneGrocerySummary[] {
    const zonesList = this.zones();

    if (items.length === 0) {
      return zonesList.map((z) => ({
        zoneId: z.id,
        zoneName: z.name,
        zoneCode: z.code,
        estimatedBasketTotal: 0,
        averageItemPrice: 0,
        savingsPercentage: (1 - z.priceMultiplier) * 100,
        priceIndexScore: (z.priceMultiplier - 0.85) / (1.20 - 0.85),
        status: z.priceMultiplier < 0.95 ? 'best' : z.priceMultiplier <= 1.08 ? 'average' : 'expensive',
        itemCount: 0,
        storesCount: z.stores.length,
      }));
    }

    // Calculate reference average total
    let totalReferenceSum = 0;
    for (const item of items) {
      const activePrice = item.manualUnitPrice ?? item.estimatedUnitPrice;
      totalReferenceSum += activePrice * item.quantity;
    }

    const summaries: ZoneGrocerySummary[] = zonesList.map((z) => {
      let zoneBasketTotal = 0;
      let totalQty = 0;

      for (const item of items) {
        const itemZonePrice = this.getProductPriceInZone(item.name, z.id);
        zoneBasketTotal += itemZonePrice * item.quantity;
        totalQty += item.quantity;
      }

      zoneBasketTotal = Math.round(zoneBasketTotal * 100) / 100;
      const averageItemPrice = Math.round((zoneBasketTotal / (totalQty || 1)) * 100) / 100;

      const diffVsReference = totalReferenceSum - zoneBasketTotal;
      const savingsPercentage = Math.round((diffVsReference / (totalReferenceSum || 1)) * 100);

      // Score normalized from 0 (best/cheapest) to 1 (highest cost)
      const priceIndexScore = Math.max(0, Math.min(1, (z.priceMultiplier - 0.85) / 0.35));

      let status: 'best' | 'average' | 'expensive' = 'average';
      if (savingsPercentage > 5) {
        status = 'best';
      } else if (savingsPercentage < -5) {
        status = 'expensive';
      }

      return {
        zoneId: z.id,
        zoneName: z.name,
        zoneCode: z.code,
        estimatedBasketTotal: zoneBasketTotal,
        averageItemPrice,
        savingsPercentage,
        priceIndexScore,
        status,
        itemCount: items.length,
        storesCount: z.stores.length,
      };
    });

    // Sort by cheapest basket total first
    return summaries.sort((a, b) => a.estimatedBasketTotal - b.estimatedBasketTotal);
  }
}
