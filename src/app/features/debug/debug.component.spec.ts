import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugComponent } from './debug.component';
import { PipelineService } from '../../services/pipeline/pipeline.service';
import { CameraService } from '../../services/camera.service';
import { signal } from '@angular/core';

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

    expect(statsText).toContain('Total Time: 42.5 ms');
    expect(statsText).toContain('Detector Time: 12.3 ms');
    expect(statsText).toContain('Filter Time: 1.1 ms');
    expect(statsText).toContain('Cropper Time: 4.2 ms');
    expect(statsText).toContain('Recognizer Time: 20.4 ms');
    expect(statsText).toContain('Dictionary Time: 3 ms');
    expect(statsText).toContain('Line Grouping Time: 1.5 ms');
  });
});
