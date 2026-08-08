import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DeviceService } from './device.service';

describe('DeviceService', () => {
  let service: DeviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DeviceService],
    });
    service = TestBed.inject(DeviceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should default to auto mode and compute isMobile correctly', () => {
    expect(service.forcedMode()).toBe('auto');
    expect(typeof service.isMobile()).toBe('boolean');
  });

  it('should respect forced mode overrides', () => {
    service.setForcedMode('mobile');
    expect(service.isMobile()).toBe(true);

    service.setForcedMode('desktop');
    expect(service.isMobile()).toBe(false);
  });
});
