import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LensComponent } from './lens.component';
import { CameraService } from '../../services/camera.service';
import { PipelineService } from '../../services/pipeline/pipeline.service';
import { signal } from '@angular/core';

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

  beforeEach(async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn());

    cameraServiceMock = {
      start: vi.fn().mockImplementation((video: HTMLVideoElement) => {
        Object.defineProperty(video, 'readyState', { value: 4, writable: true });
        Object.defineProperty(video, 'videoWidth', { value: 640, writable: true });
        Object.defineProperty(video, 'videoHeight', { value: 480, writable: true });
        return Promise.resolve();
      }),
    };

    pipelineServiceMock = {
      initialize: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn(),
      state: signal({ fullImage: undefined, detections: [], processingTimeMs: 0 }),
      debugSettings: signal({
        croppedRegions: true,
        boundingBoxes: true,
        recognizedText: true,
        canonicalText: true,
        lineGrouping: true,
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

    await TestBed.configureTestingModule({
      imports: [LensComponent],
      providers: [
        { provide: CameraService, useValue: cameraServiceMock },
        { provide: PipelineService, useValue: pipelineServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LensComponent);
    component = fixture.componentInstance;
  });

  it('should create lens component and initialize camera/pipeline on ngAfterViewInit', async () => {
    await component.ngAfterViewInit();

    expect(cameraServiceMock.start).toHaveBeenCalled();
    expect(pipelineServiceMock.initialize).toHaveBeenCalled();

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
