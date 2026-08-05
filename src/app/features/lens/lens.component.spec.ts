import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LensComponent } from './lens.component';
import { CameraService } from '../../services/camera/camera.service';
import { PipelineService } from '../../services/pipeline/pipeline.service';
import { HistoryService } from '../../services/history/history.service';
import { AuthService } from '../../services/auth/auth.service';
import { computed, signal } from '@angular/core';

if (typeof globalThis.ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  };
}

describe('LensComponent', () => {
  let component: LensComponent;
  let fixture: ComponentFixture<LensComponent>;
  let cameraServiceMock: any;
  let pipelineServiceMock: any;
  let historyServiceMock: any;
  let authServiceMock: any;

  beforeEach(async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn());

    cameraServiceMock = {
      start: vi.fn().mockImplementation((video: HTMLVideoElement) => {
        Object.defineProperty(video, 'readyState', { value: 4, writable: true });
        Object.defineProperty(video, 'videoWidth', { value: 640, writable: true });
        Object.defineProperty(video, 'videoHeight', { value: 480, writable: true });
        return Promise.resolve();
      }),
      hasTorch: vi.fn().mockReturnValue(true),
      toggleTorch: vi.fn().mockResolvedValue(true),
      pause: vi.fn(),
      resume: vi.fn().mockResolvedValue(undefined),
    };

    const stateSignal = signal({ fullImage: undefined, detections: [], processingTimeMs: 0 } as any);

    pipelineServiceMock = {
      initialize: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn(),
      state: stateSignal,
      detections: computed(() => stateSignal().detections),
      debugSettings: signal({
        croppedRegions: true,
        boundingBoxes: true,
        recognizedText: true,
        canonicalText: true,
        lineGrouping: true,
      }),
    };

    historyServiceMock = {
      items: signal([]),
      count: signal(0),
      addCapture: vi.fn().mockReturnValue({ id: '1', timestamp: new Date().toISOString() }),
      deleteItem: vi.fn(),
      clearHistory: vi.fn(),
    };

    const userSignal = signal<any>(null);
    authServiceMock = {
      currentUser: userSignal,
      isAuthenticated: computed(() => userSignal() !== null),
      signInWithGoogle: vi.fn().mockImplementation(() => {
        userSignal.set({ id: '123', name: 'Test User', email: 'test@gmail.com' });
      }),
      signOut: vi.fn().mockImplementation(() => {
        userSignal.set(null);
      }),
    };

    const mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockImplementation((x: number, y: number, w: number, h: number) => {
        return new ImageData(new Uint8ClampedArray(Math.max(1, w * h * 4)), w || 1, h || 1);
      }),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockContext as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,mock');

    await TestBed.configureTestingModule({
      imports: [LensComponent],
      providers: [
        { provide: CameraService, useValue: cameraServiceMock },
        { provide: PipelineService, useValue: pipelineServiceMock },
        { provide: HistoryService, useValue: historyServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LensComponent);
    component = fixture.componentInstance;
  });

  it('should create lens component and initialize camera/pipeline on ngAfterViewInit', async () => {
    await component.ngAfterViewInit();

    expect(cameraServiceMock.start).toHaveBeenCalled();
    expect(pipelineServiceMock.initialize).toHaveBeenCalled();
    expect(component.isTorchSupported()).toBe(true);

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should toggle primary action between live and frozen', async () => {
    await component.ngAfterViewInit();

    expect(component.isFrozen()).toBe(false);

    // Click primary button -> freeze
    await component.togglePrimaryAction();
    expect(component.isFrozen()).toBe(true);
    expect(cameraServiceMock.pause).toHaveBeenCalled();
    expect(historyServiceMock.addCapture).toHaveBeenCalled();

    // Click primary button again -> resume
    await component.togglePrimaryAction();
    expect(component.isFrozen()).toBe(false);
    expect(cameraServiceMock.resume).toHaveBeenCalled();

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should toggle modals including account modal', () => {
    expect(component.activeModal()).toBe('none');

    component.openModal('account');
    expect(component.activeModal()).toBe('account');

    component.signInGoogle();
    expect(authServiceMock.signInWithGoogle).toHaveBeenCalled();

    component.signOut();
    expect(authServiceMock.signOut).toHaveBeenCalled();

    component.closeModal();
    expect(component.activeModal()).toBe('none');
  });
});
