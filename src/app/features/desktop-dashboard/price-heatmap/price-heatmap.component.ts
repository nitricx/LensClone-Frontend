import { Component, signal, computed, ElementRef, ViewChild, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { HeatmapService, GeographicZone, ZoneGrocerySummary, StoreLocation } from '../../../services/heatmap/heatmap.service';
import { ShoppingListService, ShoppingListItem } from '../../../services/shopping-list/shopping-list.service';

export type HeatmapMode = 'groceryList' | 'productFilter' | 'categoryFilter';
export type TileProvider = 'googleRoad' | 'osm' | 'googleSat' | 'cartoDark';

@Component({
  selector: 'app-price-heatmap',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './price-heatmap.component.html',
  styleUrl: './price-heatmap.component.css',
})
export class PriceHeatmapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  readonly activeMode = signal<HeatmapMode>('groceryList');
  readonly selectedProductId = signal<string>('p1');
  readonly selectedCategoryName = signal<string>('Dairy');
  readonly selectedZoneId = signal<string | null>(null);
  readonly activeTileProvider = signal<TileProvider>('googleRoad');

  // Leaflet Map & Layer References
  private map?: L.Map;
  private currentTileLayer?: L.TileLayer;
  private zoneOverlayGroup: L.LayerGroup = L.layerGroup();
  private storeMarkersGroup: L.LayerGroup = L.layerGroup();
  private userRadiusGroup: L.LayerGroup = L.layerGroup();

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
  ) {
    // Angular signal effect to sync map overlays with state changes
    effect(() => {
      const summaries = this.zoneSummaries();
      const selectedId = this.selectedZoneId();
      const tileProvider = this.activeTileProvider();

      if (this.map) {
        this.updateTileLayer(tileProvider);
        this.renderMapLayers(summaries, selectedId);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initLeafletMap();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  private initLeafletMap(): void {
    if (!this.mapContainer || typeof window === 'undefined') return;

    const centerLat = this.heatmapService.CENTER_LAT;
    const centerLng = this.heatmapService.CENTER_LNG;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [centerLat, centerLng],
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    // Add layer groups to map
    this.zoneOverlayGroup.addTo(this.map);
    this.storeMarkersGroup.addTo(this.map);
    this.userRadiusGroup.addTo(this.map);

    // Initial tile layer setup & layer render
    this.updateTileLayer(this.activeTileProvider());
    this.renderUserLocationAndRadius(centerLat, centerLng);
    this.renderMapLayers(this.zoneSummaries(), this.selectedZoneId());

    // Invalidate size after init to ensure full canvas fit
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 200);
  }

  setTileProvider(provider: TileProvider): void {
    this.activeTileProvider.set(provider);
  }

  private updateTileLayer(provider: TileProvider): void {
    if (!this.map) return;

    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }

    let tileUrl = '';
    let maxZoom = 19;

    switch (provider) {
      case 'googleRoad':
        tileUrl = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
        break;
      case 'googleSat':
        tileUrl = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
        break;
      case 'osm':
        tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        break;
      case 'cartoDark':
        tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        break;
    }

    this.currentTileLayer = L.tileLayer(tileUrl, {
      maxZoom,
      subdomains: ['a', 'b', 'c'],
    }).addTo(this.map);
  }

  private renderUserLocationAndRadius(lat: number, lng: number): void {
    this.userRadiusGroup.clearLayers();

    // 10km radius circle
    const radiusCircle = L.circle([lat, lng], {
      radius: 10000,
      color: '#3b82f6',
      weight: 1.5,
      dashArray: '6 6',
      fillColor: '#3b82f6',
      fillOpacity: 0.04,
      interactive: false,
    });
    this.userRadiusGroup.addLayer(radiusCircle);

    // User center marker
    const userMarkerIcon = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div class="user-pulse-container">
          <div class="pulse-ring"></div>
          <div class="user-dot">
            <span class="material-symbols-rounded">person_pin_circle</span>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const userMarker = L.marker([lat, lng], { icon: userMarkerIcon }).bindTooltip('You (10km Radius Center)', {
      permanent: false,
      direction: 'top',
      className: 'custom-tooltip',
    });
    this.userRadiusGroup.addLayer(userMarker);
  }

  private renderMapLayers(summaries: ZoneGrocerySummary[], selectedId: string | null): void {
    if (!this.map) return;

    this.zoneOverlayGroup.clearLayers();
    this.storeMarkersGroup.clearLayers();

    const zones = this.heatmapService.zones();

    for (const zone of zones) {
      const summary = summaries.find((s) => s.zoneId === zone.id);
      const color = this.getZoneColor(zone.id);
      const isSelected = selectedId === zone.id;

      if (zone.centerLat && zone.centerLng && zone.radiusMeters) {
        // Render Zone Heat Circle
        const circle = L.circle([zone.centerLat, zone.centerLng], {
          radius: zone.radiusMeters,
          color: color,
          weight: isSelected ? 4 : 2,
          fillColor: color,
          fillOpacity: isSelected ? 0.35 : 0.18,
          className: `zone-heat-circle ${isSelected ? 'selected' : ''}`,
        });

        circle.on('click', () => {
          this.selectZone(zone.id);
        });

        const tooltipText = summary
          ? `<strong>${zone.name}</strong><br/>Basket Total: $${summary.estimatedBasketTotal.toFixed(2)}`
          : zone.name;

        circle.bindTooltip(tooltipText, {
          permanent: false,
          direction: 'center',
          className: 'custom-tooltip zone-tooltip',
        });

        this.zoneOverlayGroup.addLayer(circle);
      }

      // Render Store Markers in Zone
      for (const store of zone.stores) {
        if (store.lat && store.lng) {
          const icon = L.divIcon({
            className: 'store-pin-wrapper',
            html: `
              <div class="store-pin-badge ${zone.code} ${isSelected ? 'selected' : ''}" style="background-color: ${color}">
                <span class="store-code">${store.id.toUpperCase()}</span>
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const marker = L.marker([store.lat, store.lng], { icon });

          const popupContent = `
            <div class="map-popup-card">
              <div class="popup-header" style="border-left: 4px solid ${color}">
                <h5>${store.name}</h5>
                <span class="chain-tag">${store.chain}</span>
              </div>
              <div class="popup-body">
                <p><strong>Zone:</strong> ${zone.name}</p>
                ${summary ? `<p><strong>Zone Total:</strong> $${summary.estimatedBasketTotal.toFixed(2)}</p>` : ''}
                ${summary ? `<p class="savings-text"><strong>Vs City Avg:</strong> ${summary.savingsPercentage >= 0 ? '-' + summary.savingsPercentage + '% cheaper' : '+' + Math.abs(summary.savingsPercentage) + '% higher'}</p>` : ''}
              </div>
            </div>
          `;

          marker.bindPopup(popupContent, { className: 'custom-leaflet-popup' });
          marker.on('click', () => {
            this.selectZone(zone.id);
          });

          this.storeMarkersGroup.addLayer(marker);
        }
      }
    }
  }

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

      // Pan map to selected zone center if available
      const zone = this.heatmapService.zones().find((z) => z.id === zoneId);
      if (zone && zone.centerLat && zone.centerLng && this.map) {
        this.map.flyTo([zone.centerLat, zone.centerLng], 13, { duration: 0.8 });
      }
    }
  }

  getZoneSummary(zoneId: string): ZoneGrocerySummary | undefined {
    return this.zoneSummaries().find((s) => s.zoneId === zoneId);
  }

  getZoneColor(zoneId: string): string {
    const summary = this.getZoneSummary(zoneId);
    if (!summary) return '#94a3b8';

    if (summary.status === 'best') return '#10b981'; // Emerald
    if (summary.status === 'average') return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  }

  mathAbs(val: number): number {
    return Math.abs(val);
  }
}
