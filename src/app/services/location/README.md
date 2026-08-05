# Location Service

The `LocationService` provides approximate location tracking using Angular Signals and the browser's `navigator.geolocation` API.

## Security & Privacy Guarantee
For user privacy and security, this service enforces **approximate location gathering**:
- `enableHighAccuracy: false` is forced on all geolocation requests.
- Latitude and longitude are rounded to 2 decimal places (`Math.round(val * 100) / 100`), resulting in a coarse ~1.1 km grid resolution.
- Coordinates objects explicitly specify `isApproximate: true`.

## Signal State Architecture
- `coordinates`: Readonly signal containing current `GpsCoordinates | null`.
- `isTracking`: Readonly signal indicating active watching status.
- `error`: Readonly signal containing error messages if permission is denied or location fails.
- `permissionStatus`: Readonly signal containing browser geolocation `PermissionState`.

## Public API Contract

```ts
export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  isApproximate: boolean;
  timestamp?: number;
}

export class LocationService {
  readonly coordinates: Signal<GpsCoordinates | null>;
  readonly isTracking: Signal<boolean>;
  readonly error: Signal<string | null>;
  readonly permissionStatus: Signal<PermissionState | 'unknown'>;

  startTracking(options?: PositionOptions): void;
  stopTracking(): void;
  getCurrentCoordinates(): GpsCoordinates | null;
  roundToApproximate(lat: number, lon: number): { latitude: number; longitude: number };
}
```
