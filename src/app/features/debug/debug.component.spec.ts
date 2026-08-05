import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugComponent } from './debug.component';
import { PipelineService } from '../../services/pipeline/pipeline.service';
import { CameraService } from '../../services/camera.service';
import { computed, signal } from '@angular/core';

describe('DebugComponent', () => {
  let component: DebugComponent;
  let fixture: ComponentFixture<DebugComponent>;
  let pipelineServiceMock: any;

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

    const stateSignal = signal({ fullImage: undefined, detections: [], processingTimeMs: 0 } as any);

    pipelineServiceMock = {
      initialize: vi.fn().mockResolvedValue(undefined),
      execute: vi.fn(),
      state: stateSignal,
      detections: computed(() => stateSignal().detections),
      processingTimeMs: computed(() => stateSignal().processingTimeMs),
      fps: computed(() => (stateSignal().processingTimeMs > 0 ? 1000 / stateSignal().processingTimeMs : 0)),
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

    const cameraServiceMock = {
      start: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [DebugComponent],
      providers: [
        { provide: PipelineService, useValue: pipelineServiceMock },
        { provide: CameraService, useValue: cameraServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DebugComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create debug component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle debug settings via pipeline service signal', () => {
    const initialVal = pipelineServiceMock.debugSettings().boundingBoxes;
    component.toggle('boundingBoxes');
    expect(pipelineServiceMock.debugSettings().boundingBoxes).toBe(!initialVal);
  });

  it('should render individual pipeline stage metrics from pipeline state', () => {
    pipelineServiceMock.state.set({
      fullImage: undefined,
      detections: [],
      processingTimeMs: 42.5,
      stageMetrics: {
        detector: 12.3,
        detectorFilter: 1.1,
        cropper: 4.2,
        recognizer: 20.4,
        dictionary: 3.0,
        lineGrouping: 1.5,
      },
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const statsText = compiled.querySelector('.stats')?.textContent;

    expect(statsText).toContain('Total: 42.5 ms (23.5 FPS)');
    expect(statsText).toContain('Detector Time: 12.3 ms');
    expect(statsText).toContain('Filter Time: 1.1 ms');
    expect(statsText).toContain('Cropper Time: 4.2 ms');
    expect(statsText).toContain('Recognizer Time: 20.4 ms');
    expect(statsText).toContain('Dictionary Time: 3 ms');
    expect(statsText).toContain('Line Grouping Time: 1.5 ms');
  });

  it('should update memory stats when performance.memory is available', () => {
    const memoryObj = {
      usedJSHeapSize: 50 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 2048 * 1024 * 1024,
    };
    vi.stubGlobal('performance', { memory: memoryObj });

    component.updateMemoryStats();
    fixture.detectChanges();

    expect(component.currentHeapMb()).toBeCloseTo(50, 1);
    expect(component.totalHeapMb()).toBeCloseTo(100, 1);
    expect(component.limitHeapMb()).toBeCloseTo(2048, 0);

    const memoryPanelText = (fixture.nativeElement as HTMLElement).querySelector('.memory')?.textContent;
    expect(memoryPanelText).toContain('Used Heap: 50.0 MB');
    expect(memoryPanelText).toContain('Peak Heap: 50.0 MB');
    expect(memoryPanelText).toContain('Total Heap: 100.0 MB');

    vi.unstubAllGlobals();
  });
});

