import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BoundingBoxRendererService } from './boundingbox-renderer.service';
import { Detection } from '../text-detection/types';

describe('BoundingBoxRendererService', () => {
  let service: BoundingBoxRendererService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BoundingBoxRendererService],
    });
    service = TestBed.inject(BoundingBoxRendererService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should render bounding box and label for detections with canonicalText', () => {
    const mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 50 }),
      lineWidth: 0,
      strokeStyle: '',
      font: '',
      textBaseline: '',
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;

    const detections: Detection[] = [
      {
        boundingBoxScore: 0.9,
        boundingBox: { x: 10, y: 20, width: 60, height: 30 },
        canonicalText: 'CEBOLLA',
      },
      {
        boundingBoxScore: 0.8,
        boundingBox: { x: 100, y: 100, width: 50, height: 20 },
        // No canonicalText, should be skipped
      },
    ];

    service.render(mockContext, detections);

    expect(mockContext.save).toHaveBeenCalled();
    expect(mockContext.strokeRect).toHaveBeenCalledWith(10, 20, 60, 30);
    expect(mockContext.fillText).toHaveBeenCalledWith('CEBOLLA', expect.any(Number), expect.any(Number));
    expect(mockContext.restore).toHaveBeenCalled();
  });
});
