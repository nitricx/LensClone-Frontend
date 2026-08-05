import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';
import { CameraService } from './services/camera.service';
import { PipelineService } from './services/pipeline/pipeline.service';
import { computed, signal } from '@angular/core';

describe('App Component', () => {
  let component: App;
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    const mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 50 }),
      drawImage: vi.fn(),
      getImageData: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockContext as unknown as CanvasRenderingContext2D,
    );

    const cameraServiceMock = {
      start: vi.fn().mockResolvedValue(undefined),
    };

    const stateSignal = signal({ fullImage: undefined, detections: [], processingTimeMs: 0 } as any);

    const pipelineServiceMock = {
      initialize: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn(),
      state: stateSignal,
      detections: computed(() => stateSignal().detections),
      processingTimeMs: computed(() => stateSignal().processingTimeMs),
      stageMetrics: computed(() => stateSignal().stageMetrics),
      cropsCount: computed(() => (stateSignal().detections || []).filter((d: any) => !!d.crop).length),
      hasDetections: computed(() => (stateSignal().detections || []).length > 0),
      groupedLines: computed(() => []),
      debugSettings: signal({
        croppedRegions: true,
        boundingBoxes: true,
        recognizedText: true,
        canonicalText: true,
        lineGrouping: true,
      }),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: CameraService, useValue: cameraServiceMock },
        { provide: PipelineService, useValue: pipelineServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create root component', () => {
    expect(component).toBeTruthy();

    vi.restoreAllMocks();
  });
});
