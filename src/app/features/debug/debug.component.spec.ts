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
});
