import { Injectable, OnDestroy, signal } from '@angular/core';
import { GpsCoordinates } from '../text-detection/types';

@Injectable({
  providedIn: 'root',
})
export class LocationService implements OnDestroy {
  private watchId?: number;

  private readonly _coordinates = signal<GpsCoordinates | null>(null);
  private readonly _isTracking = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _permissionStatus = signal<PermissionState | 'unknown'>('unknown');

  readonly coordinates = this._coordinates.asReadonly();
  readonly isTracking = this._isTracking.asReadonly();
  readonly error = this._error.asReadonly();
  readonly permissionStatus = this._permissionStatus.asReadonly();

  constructor() {
    this.checkPermissions();
  }

  ngOnDestroy(): void {
    this.stopTracking();
  }

  startTracking(options?: PositionOptions): void {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      this._error.set('Geolocation is not supported in this environment.');
      return;
    }

    if (this._isTracking()) {
      return;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: false, // Security constraint: approximate location only
      timeout: 10000,
      maximumAge: 30000,
      ...options,
      // Force enableHighAccuracy to false for security requirement
    };
    defaultOptions.enableHighAccuracy = false;

    this._isTracking.set(true);
    this._error.set(null);

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.handleSuccess(pos),
        (err) => this.handleError(err),
        defaultOptions,
      );
    } catch (err: any) {
      this._isTracking.set(false);
      this._error.set(err?.message || 'Failed to start geolocation tracking.');
    }
  }

  stopTracking(): void {
    if (this.watchId !== undefined && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = undefined;
    }
    this._isTracking.set(false);
  }

  getCurrentCoordinates(): GpsCoordinates | null {
    return this._coordinates();
  }

  /**
   * Rounds latitude and longitude to 2 decimal places (~1.1km grid resolution)
   * to guarantee approximate regional location for privacy and security.
   */
  roundToApproximate(lat: number, lon: number): { latitude: number; longitude: number } {
    return {
      latitude: Math.round(lat * 100) / 100,
      longitude: Math.round(lon * 100) / 100,
    };
  }

  private handleSuccess(position: GeolocationPosition): void {
    const { latitude, longitude } = this.roundToApproximate(
      position.coords.latitude,
      position.coords.longitude,
    );

    const approxCoords: GpsCoordinates = {
      latitude,
      longitude,
      isApproximate: true,
      timestamp: position.timestamp,
    };

    this._coordinates.set(approxCoords);
    this._error.set(null);
    this._permissionStatus.set('granted');
  }

  private handleError(error: GeolocationPositionError): void {
    let msg = 'Geolocation error occurred.';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        msg = 'Location permission denied.';
        this._permissionStatus.set('denied');
        break;
      case error.POSITION_UNAVAILABLE:
        msg = 'Location position unavailable.';
        break;
      case error.TIMEOUT:
        msg = 'Location request timed out.';
        break;
    }
    this._error.set(msg);
  }

  private async checkPermissions(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions.query) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        this._permissionStatus.set(status.state);
        status.onchange = () => {
          this._permissionStatus.set(status.state);
        };
      } catch {
        this._permissionStatus.set('unknown');
      }
    }
  }
}
