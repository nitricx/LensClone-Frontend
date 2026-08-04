import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayComponent } from './overlay.component';
import { PipelineService } from '../../services/pipeline/pipeline.service';
import { BoundingBoxRendererService } from '../../services/visualization/boundingbox-renderer.service';
import { computed, signal } from '@angular/core';

describe('OverlayComponent', () => {
  let component: OverlayComponent;
  let fixture: ComponentFixture<OverlayComponent>;
  let pipelineServiceMock: any;
  let rendererMock: any;

  beforeEach(async () => {
    const mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 50 }),
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      mockContext as unknown as CanvasRenderingContext2D,
    );

    const stateSignal = signal({ fullImage: undefined, detections: [], processingTimeMs: 0 } as any);

    pipelineServiceMock = {
      state: stateSignal,
      detections: computed(() => stateSignal().detections),
      processingTimeMs: computed(() => stateSignal().processingTimeMs),
      stageMetrics: computed(() => stateSignal().stageMetrics),
      cropsCount: computed(() => (stateSignal().detections || []).filter((d: any) => !!d.crop).length),
      hasDetections: computed(() => (stateSignal().detections || []).length > 0),
      debugSettings: signal({
        croppedRegions: true,
        boundingBoxes: true,
        recognizedText: true,
        canonicalText: true,
        lineGrouping: true,
      }),
    };

    rendererMock = {
      render: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [OverlayComponent],
      providers: [
        { provide: PipelineService, useValue: pipelineServiceMock },
        { provide: BoundingBoxRendererService, useValue: rendererMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OverlayComponent);
    fixture.componentRef.setInput('width', 640);
    fixture.componentRef.setInput('height', 480);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create overlay component', () => {
    expect(component).toBeTruthy();
  });
});
