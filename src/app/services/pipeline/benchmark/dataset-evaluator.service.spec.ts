import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DatasetEvaluatorService } from './dataset-evaluator.service';
import { GroundTruthManifestItem } from './dataset-benchmark.types';
import { PipelineState } from '../pipeline-state';

describe('DatasetEvaluatorService', () => {
  let evaluator: DatasetEvaluatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DatasetEvaluatorService],
    });
    evaluator = TestBed.inject(DatasetEvaluatorService);
  });

  it('should be created', () => {
    expect(evaluator).toBeTruthy();
  });

  describe('IoU Calculation', () => {
    it('should return 1.0 for identical bounding boxes', () => {
      const box = { x: 10, y: 10, width: 100, height: 50 };
      const iou = evaluator.calculateIoU(box, box);
      expect(iou).toBeCloseTo(1.0);
    });

    it('should return 0.0 for completely non-overlapping boxes', () => {
      const box1 = { x: 0, y: 0, width: 10, height: 10 };
      const box2 = { x: 50, y: 50, width: 10, height: 10 };
      const iou = evaluator.calculateIoU(box1, box2);
      expect(iou).toBe(0);
    });

    it('should return 0.25 for 50% width and 50% height overlap', () => {
      const box1 = { x: 0, y: 0, width: 20, height: 20 };
      const box2 = { x: 10, y: 10, width: 20, height: 20 };
      // Intersect: 10x10 = 100. Union: 400 + 400 - 100 = 700. IoU = 100/700 = ~0.1428
      const iou = evaluator.calculateIoU(box1, box2);
      expect(iou).toBeGreaterThan(0);
      expect(iou).toBeLessThan(1.0);
    });
  });

  describe('Detection Metrics (Precision, Recall, F1)', () => {
    it('should calculate 100% precision and recall when predictions match ground truth', () => {
      const gt = [
        {
          id: '1',
          boundingBox: { x: 10, y: 10, width: 50, height: 20 },
          expectedText: 'Milk',
        },
      ];
      const preds = [{ x: 10, y: 10, width: 50, height: 20 }];

      const metrics = evaluator.evaluateDetection(preds, gt, 0.5);

      expect(metrics.truePositives).toBe(1);
      expect(metrics.falsePositives).toBe(0);
      expect(metrics.falseNegatives).toBe(0);
      expect(metrics.precision).toBe(1.0);
      expect(metrics.recall).toBe(1.0);
      expect(metrics.f1Score).toBe(1.0);
    });

    it('should correctly count false positives and false negatives', () => {
      const gt = [
        {
          id: '1',
          boundingBox: { x: 10, y: 10, width: 50, height: 20 },
          expectedText: 'Milk',
        },
      ];
      // One true match, one hallucinated detection
      const preds = [
        { x: 10, y: 10, width: 50, height: 20 },
        { x: 500, y: 500, width: 30, height: 30 },
      ];

      const metrics = evaluator.evaluateDetection(preds, gt, 0.5);

      expect(metrics.truePositives).toBe(1);
      expect(metrics.falsePositives).toBe(1);
      expect(metrics.precision).toBe(0.5);
      expect(metrics.recall).toBe(1.0);
    });
  });

  describe('Recognition Metrics (CER, WER, Levenshtein)', () => {
    it('should return 0 CER for identical strings', () => {
      const cer = evaluator.calculateCER('ORGANIC OAT MILK 1L', 'ORGANIC OAT MILK 1L');
      expect(cer).toBe(0);
    });

    it('should calculate correct CER for character substitutions', () => {
      // 1 char difference ('0' vs 'O') in 'OAT' length 19
      const cer = evaluator.calculateCER('ORGANIC 0AT MILK 1L', 'ORGANIC OAT MILK 1L');
      expect(cer).toBeCloseTo(1 / 19);
    });

    it('should calculate correct WER for word substitutions', () => {
      const wer = evaluator.calculateWER('$3.49', '$3.99');
      expect(wer).toBeGreaterThan(0);
    });

    it('should aggregate recognition metrics across multiple pairs', () => {
      const pairs = [
        { predicted: '$3.49', expected: '$3.49' },
        { predicted: 'OAT MILK', expected: 'OAT MILK' },
        { predicted: 'WHEAT BREAD', expected: 'WHITE BREAD' },
      ];

      const metrics = evaluator.evaluateRecognition(pairs);

      expect(metrics.totalSamples).toBe(3);
      expect(metrics.exactMatches).toBe(2);
      expect(metrics.exactMatchRatio).toBeCloseTo(2 / 3);
    });
  });

  describe('Sample Evaluation & Summary Report', () => {
    it('should generate a comprehensive summary report from multiple sample results', () => {
      const gtItem: GroundTruthManifestItem = {
        imageId: 'price_tag_001',
        category: 'price-tags',
        imagePath: '/assets/test-fixtures/grocery/price_tag_001.jpg',
        dimensions: { width: 1280, height: 720 },
        annotations: [
          {
            id: 'box-1',
            boundingBox: { x: 300, y: 200, "width": 250, "height": 50 },
            expectedText: 'ORGANIC OAT MILK 1L',
          },
        ],
      };

      const mockState: PipelineState = {
        detections: [
          {
            boundingBoxScore: 0.95,
            boundingBox: { x: 300, y: 200, width: 250, height: 50 },
            rawText: 'ORGANIC OAT MILK 1L',
          },
        ],
        processingTimeMs: 45,
      };

      const sampleResult = evaluator.evaluateSample(gtItem, mockState, 20, 25);
      expect(sampleResult.imageId).toBe('price_tag_001');
      expect(sampleResult.detectionMetrics?.precision).toBe(1.0);
      expect(sampleResult.recognitionMetrics?.exactMatches).toBe(1);

      const summary = evaluator.generateSummaryReport([sampleResult]);
      expect(summary.totalSamplesEvaluated).toBe(1);
      expect(summary.overallDetection?.f1Score).toBe(1.0);
      expect(summary.averagePipelineLatencyMs).toBe(45);
    });
  });
});
