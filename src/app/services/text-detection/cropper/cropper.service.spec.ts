import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DetectorCropperService } from './cropper.service';
import { PipelineState } from '../../pipeline/pipeline-state';

describe('DetectorCropperService', () => {
  let service: DetectorCropperService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DetectorCropperService],
    });
    service = TestBed.inject(DetectorCropperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should do nothing if state.detections is empty', () => {
    const state: PipelineState = {
      detections: [],
      processingTimeMs: 0,
    };

    expect(() => service.execute(state)).not.toThrow();
  });
});
