import { Component } from '@angular/core';
import { LensComponent } from './features/lens/lens.component';
import { DesktopDashboardComponent } from './features/desktop-dashboard/desktop-dashboard.component';
import { DeviceService } from './services/device/device.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LensComponent, DesktopDashboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor(readonly deviceService: DeviceService) {}
}

