import { Injectable, signal, computed } from '@angular/core';

export type DeviceMode = 'auto' | 'mobile' | 'desktop';

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  private readonly isMobileQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 768px)')
      : null;

  private readonly systemIsMobile = signal<boolean>(
    this.isMobileQuery ? this.isMobileQuery.matches : false
  );

  readonly forcedMode = signal<DeviceMode>('auto');

  readonly isMobile = computed<boolean>(() => {
    const forced = this.forcedMode();
    if (forced === 'mobile') return true;
    if (forced === 'desktop') return false;
    return this.systemIsMobile();
  });

  readonly isDesktop = computed<boolean>(() => !this.isMobile());
  readonly isDesktopSystem = computed<boolean>(() => !this.systemIsMobile());

  constructor() {
    if (this.isMobileQuery) {
      const listener = (event: MediaQueryListEvent) => {
        this.systemIsMobile.set(event.matches);
      };
      this.isMobileQuery.addEventListener('change', listener);
    }
  }

  setForcedMode(mode: DeviceMode): void {
    this.forcedMode.set(mode);
  }
}
