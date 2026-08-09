# Location Service

The `LocationService` provides location tracking using Angular Signals and the browser's `navigator.geolocation` API, supporting user-selected **Precise** (unrounded exact GPS) and **Approximate** (coarse ~1.1 km grid) location accuracy modes.

## Location Accuracy Modes
- **Precise Mode (`accuracyMode: 'precise'`)**:
  - `enableHighAccuracy: true` is passed to geolocation requests.
  - Captures exact unrounded latitude and longitude coordinates.
  - Emits `GpsCoordinates` with `isApproximate = false` and `accuracyMode = 'precise'`.
- **Approximate Mode (`accuracyMode: 'approximate'`)**:
  - `enableHighAccuracy: false` is used for energy efficiency and privacy.
  - Latitude and longitude are rounded to 2 decimal places (`Math.round(val * 100) / 100`), resulting in a coarse ~1.1 km grid resolution.
  - Emits `GpsCoordinates` with `isApproximate = true` and `accuracyMode = 'approximate'`.

## Signal State Architecture
- `coordinates`: Readonly signal containing current `GpsCoordinates | null`.
- `accuracyMode`: Readonly signal containing active mode (`'precise'` | `'approximate'`).
- `isTracking`: Readonly signal indicating active watching status.
- `error`: Readonly signal containing error messages if permission is denied or location fails.
- `permissionStatus`: Readonly signal containing browser geolocation `PermissionState`.

## Public API Contract

```ts
export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  isApproximate: boolean;
  accuracyMode?: 'precise' | 'approximate';
  accuracyMeters?: number;
  timestamp?: number;
}

export class LocationService {
  readonly coordinates: Signal<GpsCoordinates | null>;
  readonly accuracyMode: Signal<'precise' | 'approximate'>;
  readonly isTracking: Signal<boolean>;
  readonly error: Signal<string | null>;
  readonly permissionStatus: Signal<PermissionState | 'unknown'>;

  setAccuracyMode(mode: 'precise' | 'approximate'): void;
  startTracking(options?: PositionOptions): void;
  stopTracking(): void;
  getCurrentCoordinates(): GpsCoordinates | null;
  roundToApproximate(lat: number, lon: number): { latitude: number; longitude: number };
}
```
