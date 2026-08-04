import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RecognitionService } from './recognition.service';
import { RecognitionPreprocessorService } from './recognition-preprocessor.service';
import { RecognitionPostprocessorService } from './recognition-postprocessor.service';

describe('RecognitionService', () => {
  let service: RecognitionService;
  let preprocessorMock: RecognitionPreprocessorService;
  let postprocessorMock: RecognitionPostprocessorService;

  beforeEach(() => {
    vi.clearAllMocks();

    preprocessorMock = {
      initialize: vi.fn(),
      toTensor: vi.fn(),
    } as unknown as RecognitionPreprocessorService;

    postprocessorMock = {
      decode: vi.fn().mockReturnValue(''),
    } as unknown as RecognitionPostprocessorService;

    TestBed.configureTestingModule({
      providers: [
        RecognitionService,
        { provide: RecognitionPreprocessorService, useValue: preprocessorMock },
        { provide: RecognitionPostprocessorService, useValue: postprocessorMock },
      ],
    });

    service = TestBed.inject(RecognitionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
