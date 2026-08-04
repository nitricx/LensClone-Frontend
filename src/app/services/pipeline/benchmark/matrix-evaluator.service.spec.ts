import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MatrixEvaluatorService, PipelineConfigMatrix } from './matrix-evaluator.service';
import { DatasetEvaluatorService } from './dataset-evaluator.service';
import { DEFAULT_PIPELINE_CONFIG, PipelineConfig } from '../pipeline-config.types';
import { GroundTruthManifestItem } from './dataset-benchmark.types';
import { PipelineState } from '../pipeline-state';

describe('MatrixEvaluatorService', () => {
  let service: MatrixEvaluatorService;
  let datasetEvaluator: DatasetEvaluatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MatrixEvaluatorService, DatasetEvaluatorService],
    });
    service = TestBed.inject(MatrixEvaluatorService);
    datasetEvaluator = TestBed.inject(DatasetEvaluatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateConfigPermutations', () => {
    it('should return a single default configuration when matrix is empty', () => {
      const matrix: PipelineConfigMatrix = {};
      const permutations = service.generateConfigPermutations(matrix);

      expect(permutations.length).toBe(1);
      expect(permutations[0]).toEqual(DEFAULT_PIPELINE_CONFIG);
    });

    it('should generate correct Cartesian product permutations for candidate parameter vectors', () => {
      const matrix: PipelineConfigMatrix = {
        cropperPaddings: [2, 4, 6],
        dictionarySimilarityThresholds: [0.7, 0.8],
      };

      const permutations = service.generateConfigPermutations(matrix);

      expect(permutations.length).toBe(6); // 3 * 2 = 6

      const paddings = permutations.map((p) => p.cropper.padding);
      expect(paddings).toContain(2);
      expect(paddings).toContain(4);
      expect(paddings).toContain(6);

      const threshs = permutations.map((p) => p.dictionary.similarityThreshold);
      expect(threshs).toContain(0.7);
      expect(threshs).toContain(0.8);
    });

    it('should generate permutations for detectorMaxSides', () => {
      const matrix: PipelineConfigMatrix = {
        detectorMaxSides: [0, 384, 480],
      };

      const permutations = service.generateConfigPermutations(matrix);

      expect(permutations.length).toBe(3);
      const maxSides = permutations.map((p) => p.detector.maxSide);
      expect(maxSides).toEqual([0, 384, 480]);
    });
  });

  describe('computeOverallScore', () => {
    it('should compute weighted score accurately', () => {
      const report = datasetEvaluator.generateSummaryReport([
        {
          imageId: 'test-1',
          totalPipelineLatencyMs: 50,
          detectionMetrics: {
            truePositives: 1,
            falsePositives: 0,
            falseNegatives: 0,
            precision: 1.0,
            recall: 1.0,
            f1Score: 1.0,
            averageIoU: 0.9,
          },
          recognitionMetrics: {
            totalSamples: 1,
            exactMatches: 1,
            exactMatchRatio: 1.0,
            characterErrorRate: 0.0,
            wordErrorRate: 0.0,
            averageEditDistance: 0,
          },
        },
      ]);

      const score = service.computeOverallScore(report);
      // 0.4 * 1.0 + 0.4 * 1.0 + 0.2 * 1.0 = 1.0
      expect(score).toBe(1.0);
    });
  });

  describe('evaluateMatrix', () => {
    it('should evaluate a matrix of configurations and return sorted results with the best config first', async () => {
      const sampleItem: GroundTruthManifestItem = {
        imageId: 'sample_01',
        category: 'price-tags',
        imagePath: '/fixtures/sample_01.jpg',
        dimensions: { width: 100, height: 100 },
        annotations: [
          {
            id: 'ann-1',
            boundingBox: { x: 10, y: 10, width: 20, height: 20 },
            expectedText: 'MILK',
          },
        ],
      };

      const matrix: PipelineConfigMatrix = {
        cropperPaddings: [0, 5],
      };

      // Mock runner that returns better detections for padding 5
      const mockRunner = async (
        item: GroundTruthManifestItem,
        config: PipelineConfig,
      ): Promise<PipelineState> => {
        if (config.cropper.padding === 5) {
          return {
            detections: [
              {
                boundingBox: { x: 10, y: 10, width: 20, height: 20 },
                boundingBoxScore: 0.9,
                rawText: 'MILK',
              },
            ],
            processingTimeMs: 10,
            config,
          };
        }

        return {
          detections: [],
          processingTimeMs: 10,
          config,
        };
      };

      const report = await service.evaluateMatrix([sampleItem], matrix, mockRunner);

      expect(report.totalCombinationsTested).toBe(2);
      expect(report.bestConfig.cropper.padding).toBe(5);
      expect(report.results[0].overallScore).toBeGreaterThan(report.results[1].overallScore);
    });
  });
});
