import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CameraService } from './camera.service';

describe('CameraService', () => {
  let service: CameraService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CameraService],
    });
    service = TestBed.inject(CameraService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should request media stream and set it on video element', async () => {
    const mockStream = {} as MediaStream;
    const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: mockGetUserMedia,
      },
    });

    const mockVideo = {
      readyState: 4, // HAVE_ENOUGH_DATA >= HAVE_METADATA
      srcObject: null as any,
      play: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
    } as unknown as HTMLVideoElement;

    await service.start(mockVideo);

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'environment' },
      audio: false,
    });
    expect(mockVideo.srcObject).toBe(mockStream);
    expect(mockVideo.play).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
