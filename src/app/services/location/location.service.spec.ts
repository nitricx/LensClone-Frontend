import { TestBed } from '@angular/core/testing';
import { LocationService } from './location.service';

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocationService);
  });

  afterEach(() => {
    service.stopTracking();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should round coordinates to 2 decimal places for approximate location', () => {
    const result = service.roundToApproximate(-34.603722, -58.381592);
    expect(result.latitude).toBe(-34.6)
    expect(result.longitude).toBe(-58.38);
  });

  it('should set coordinates with isApproximate true when geolocation returns position', () => {
    const mockWatchPosition = vi.fn((success) => {
      success({
        coords: { latitude: -34.6037, longitude: -58.3815, accuracy: 10 },
        timestamp: 123456789,
      } as GeolocationPosition);
      return 1;
    });

    vi.stubGlobal('navigator', {
      geolocation: {
        watchPosition: mockWatchPosition,
        clearWatch: vi.fn(),
      },
    });

    service.startTracking();

    expect(service.isTracking()).toBe(true);
    const coords = service.coordinates();
    expect(coords).not.toBeNull();
    expect(coords?.latitude).toBe(-34.6);
    expect(coords?.longitude).toBe(-58.38);
    expect(coords?.isApproximate).toBe(true);
    expect(coords?.timestamp).toBe(123456789);

    vi.unstubAllGlobals();
  });

  it('should handle permission denied error cleanly', () => {
    const mockWatchPosition = vi.fn((_, error) => {
      error({
        code: 1, // PERMISSION_DENIED
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'User denied Geolocation',
      } as GeolocationPositionError);
      return 1;
    });

    vi.stubGlobal('navigator', {
      geolocation: {
        watchPosition: mockWatchPosition,
        clearWatch: vi.fn(),
      },
    });

    service.startTracking();

    expect(service.error()).toBe('Location permission denied.');
    expect(service.permissionStatus()).toBe('denied');

    vi.unstubAllGlobals();
  });
});
