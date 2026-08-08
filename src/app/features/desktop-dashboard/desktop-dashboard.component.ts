import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DebugComponent } from '../debug/debug.component';
import { SettingsComponent } from '../settings/settings.component';
import { ShoppingListComponent } from '../shopping-list/shopping-list.component';
import { PriceHeatmapComponent } from './price-heatmap/price-heatmap.component';
import { DeviceService } from '../../services/device/device.service';

export type DesktopTab = 'management' | 'shoppingList' | 'debug' | 'settings';

@Component({
  selector: 'app-desktop-dashboard',
  standalone: true,
  imports: [CommonModule, DebugComponent, SettingsComponent, ShoppingListComponent, PriceHeatmapComponent],
  templateUrl: './desktop-dashboard.component.html',
  styleUrl: './desktop-dashboard.component.css',
})
export class DesktopDashboardComponent {
  readonly activeTab = signal<DesktopTab>('management');

  // Sample analytics data for PC management view
  readonly recentUploads = signal([
    { id: '1', product: 'Organic Milk 1L', price: '$3.49', confidence: 0.96, location: 'Store A', timestamp: '10 mins ago' },
    { id: '2', product: 'Whole Wheat Bread', price: '$2.99', confidence: 0.94, location: 'Store B', timestamp: '25 mins ago' },
    { id: '3', product: 'Avocado 2-pack', price: '$4.20', confidence: 0.89, location: 'Store A', timestamp: '1 hour ago' },
  ]);

  constructor(readonly deviceService: DeviceService) {}

  setTab(tab: DesktopTab): void {
    this.activeTab.set(tab);
  }
}
