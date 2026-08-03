import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DatasetEvaluatorService } from './dataset-evaluator.service';
import { GroundTruthManifestItem, DatasetManifest } from './dataset-benchmark.types';
import { PipelineState } from '../pipeline-state';

describe('Dataset Evaluation Suite (Skeleton Benchmark)', () => {
  let evaluator: DatasetEvaluatorService;

  // Mock Ground Truth Manifest mimicking public/assets/test-fixtures/grocery/manifest.json
  const mockManifest: DatasetManifest = {
    datasetName: 'LensClone Grocery Benchmark Suite',
    version: '1.0.0',
    description: 'Static sample evaluation suite for DetectorService and RecognitionService',
    samples: [
      {
        imageId: 'price_tag_001',
        category: 'price-tags',
        imagePath: '/assets/test-fixtures/grocery/price_tag_001.jpg',
        dimensions: { width: 1280, height: 720 },
        annotations: [
          {
            id: 'box-1',
            boundingBox: { x: 300, y: 200, width: 250, height: 50 },
            expectedText: 'ORGANIC OAT MILK 1L',
            textCategory: 'product_name',
          },
          {
            id: 'box-2',
            boundingBox: { x: 300, y: 260, width: 120, height: 60 },
            expectedText: '$3.49',
            textCategory: 'price',
          },
        ],
      },
      {
        imageId: 'shelf_001',
        category: 'shelf-wide',
        imagePath: '/assets/test-fixtures/grocery/shelf_001.jpg',
        dimensions: { width: 1920, height: 1080 },
        annotations: [
          {
            id: 'box-101',
            boundingBox: { x: 150, y: 400, width: 180, height: 45 },
            expectedText: 'WHOLE WHEAT BREAD',
            textCategory: 'product_name',
          },
          {
            id: 'box-102',
            boundingBox: { x: 150, y: 450, width: 90, height: 40 },
            expectedText: '$2.99',
            textCategory: 'price',
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DatasetEvaluatorService],
    });
    evaluator = TestBed.inject(DatasetEvaluatorService);
  });

  it('should run benchmark evaluation across sample manifest items', () => {
    const results = mockManifest.samples.map((sample: GroundTruthManifestItem) => {
      // Skeleton PipelineState mimicking outputs from DetectorService & RecognitionService
      const mockState: PipelineState = {
        detections: sample.annotations.map((gt) => ({
          boundingBoxScore: 0.92,
          boundingBox: { ...gt.boundingBox },
          rawText: gt.expectedText,
          rawTextScore: 0.95,
        })),
        processingTimeMs: 38,
      };

      return evaluator.evaluateSample(sample, mockState, 18, 20);
    });

    const report = evaluator.generateSummaryReport(results);

    expect(report.totalSamplesEvaluated).toBe(2);
    expect(report.overallDetection?.precision).toBe(1.0);
    expect(report.overallDetection?.recall).toBe(1.0);
    expect(report.overallRecognition?.exactMatchRatio).toBe(1.0);
    expect(report.overallRecognition?.characterErrorRate).toBe(0);
    expect(report.averagePipelineLatencyMs).toBe(38);
  });
});
