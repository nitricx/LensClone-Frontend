import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeatmapService, GeographicZone, ZoneGrocerySummary } from '../../../services/heatmap/heatmap.service';
import { ShoppingListService, ShoppingListItem } from '../../../services/shopping-list/shopping-list.service';

export type HeatmapMode = 'groceryList' | 'productFilter' | 'categoryFilter';

@Component({
  selector: 'app-price-heatmap',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './price-heatmap.component.html',
  styleUrl: './price-heatmap.component.css',
})
export class PriceHeatmapComponent {
  readonly activeMode = signal<HeatmapMode>('groceryList');
  readonly selectedProductId = signal<string>('p1');
  readonly selectedCategoryName = signal<string>('Dairy');
  readonly selectedZoneId = signal<string | null>(null);

  // Computations
  readonly shoppingItems = computed(() => this.shoppingListService.items());
  readonly categories = computed(() => this.heatmapService.categories());
  readonly productCatalog = computed(() => this.heatmapService.productCatalog());

  readonly activeProduct = computed(() => {
    return this.productCatalog().find((p) => p.id === this.selectedProductId()) || this.productCatalog()[0];
  });

  readonly filteredCatalogByCategory = computed(() => {
    const cat = this.selectedCategoryName();
    return this.productCatalog().filter((p) => p.category === cat);
  });

  // Calculate zone scores based on active mode
  readonly zoneSummaries = computed<ZoneGrocerySummary[]>(() => {
    const mode = this.activeMode();

    if (mode === 'groceryList') {
      return this.heatmapService.calculateListZoneSummaries(this.shoppingItems());
    }

    if (mode === 'productFilter') {
      const prod = this.activeProduct();
      const syntheticItems: ShoppingListItem[] = [
        {
          id: 'filter_item',
          name: prod.productName,
          quantity: 1,
          estimatedUnitPrice: prod.basePrice,
        },
      ];
      return this.heatmapService.calculateListZoneSummaries(syntheticItems);
    }

    // Category Filter Mode
    const catProds = this.filteredCatalogByCategory();
    const categorySyntheticItems: ShoppingListItem[] = catProds.map((p) => ({
      id: `cat_${p.id}`,
      name: p.productName,
      quantity: 1,
      estimatedUnitPrice: p.basePrice,
    }));

    return this.heatmapService.calculateListZoneSummaries(categorySyntheticItems);
  });

  readonly bestZone = computed(() => {
    const sorted = this.zoneSummaries();
    return sorted.length > 0 ? sorted[0] : null;
  });

  constructor(
    readonly heatmapService: HeatmapService,
    readonly shoppingListService: ShoppingListService
  ) {}

  setMode(mode: HeatmapMode): void {
    this.activeMode.set(mode);
    this.selectedZoneId.set(null);
  }

  selectProduct(productId: string): void {
    this.selectedProductId.set(productId);
  }

  selectCategory(category: string): void {
    this.selectedCategoryName.set(category);
  }

  selectZone(zoneId: string): void {
    if (this.selectedZoneId() === zoneId) {
      this.selectedZoneId.set(null);
    } else {
      this.selectedZoneId.set(zoneId);
    }
  }

  getZoneSummary(zoneId: string): ZoneGrocerySummary | undefined {
    return this.zoneSummaries().find((s) => s.zoneId === zoneId);
  }

  getZoneColor(zoneId: string): string {
    const summary = this.getZoneSummary(zoneId);
    if (!summary) return '#94a3b8';

    if (summary.status === 'best') return '#10b981'; // Green
    if (summary.status === 'average') return '#f59e0b'; // Orange/Amber
    return '#ef4444'; // Red
  }

  mathAbs(val: number): number {
    return Math.abs(val);
  }
}
