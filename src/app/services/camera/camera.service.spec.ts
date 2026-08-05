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
    const mockStream = {
      getVideoTracks: () => [],
    } as unknown as MediaStream;
    const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: mockGetUserMedia,
      },
    });

    const mockVideo = {
      readyState: 4,
      srcObject: null as any,
      play: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
    } as unknown as HTMLVideoElement;

    await service.start(mockVideo);

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
    expect(mockVideo.srcObject).toBe(mockStream);
    expect(mockVideo.play).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('should check torch capability correctly', () => {
    const mockVideo = {
      srcObject: null,
    } as unknown as HTMLVideoElement;

    expect(service.hasTorch(mockVideo)).toBe(false);

    const mockTrack = {
      getCapabilities: () => ({ torch: true }),
    };

    const mockStream = {
      getVideoTracks: () => [mockTrack],
    } as unknown as MediaStream;

    const mockVideoWithTorch = {
      srcObject: mockStream,
    } as unknown as HTMLVideoElement;

    expect(service.hasTorch(mockVideoWithTorch)).toBe(true);
  });

  it('should pause and resume video element', async () => {
    const mockVideo = {
      paused: false,
      pause: vi.fn().mockImplementation(function (this: any) {
        this.paused = true;
      }),
      play: vi.fn().mockImplementation(function (this: any) {
        this.paused = false;
        return Promise.resolve();
      }),
    } as unknown as HTMLVideoElement;

    service.pause(mockVideo);
    expect(mockVideo.pause).toHaveBeenCalled();

    await service.resume(mockVideo);
    expect(mockVideo.play).toHaveBeenCalled();
  });
});
