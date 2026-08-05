import { Injectable } from '@angular/core';
import { DEFAULT_PIPELINE_CONFIG, PipelineConfig } from '../pipeline-config.types';
import { DatasetEvaluatorService } from './dataset-evaluator.service';
import {
  BenchmarkSummaryReport,
  GroundTruthManifestItem,
  SampleBenchmarkResult,
} from './dataset-benchmark.types';
import { PipelineState } from '../pipeline-state';

export interface PipelineConfigMatrix {
  detectorThresholds?: number[];
  detectorMinAreas?: number[];
  detectorMinAspectRatios?: number[];
  detectorMaxSides?: number[];
  detectorScaleFactors?: number[];
  cropperPaddings?: number[];
  dictionarySimilarityThresholds?: number[];
  lineGroupingMaxScores?: number[];
  lineGroupingVerticalWeights?: number[];
}

export interface MatrixEvaluationResult {
  config: PipelineConfig;
  summaryReport: BenchmarkSummaryReport;
  overallScore: number;
}

export interface MatrixBenchmarkReport {
  timestamp: string;
  totalCombinationsTested: number;
  bestConfig: PipelineConfig;
  bestScore: number;
  results: MatrixEvaluationResult[];
}

export interface MatrixEvaluationOptions {
  batchSize?: number;
  topK?: number;
  maxConfigurations?: number;
}

@Injectable({
  providedIn: 'root',
})
export class MatrixEvaluatorService {
  constructor(private readonly datasetEvaluator: DatasetEvaluatorService) {}

  /**
   * Computes total combinations for a parameter matrix without pre-allocating.
   */
  calculateTotalCombinations(matrix: PipelineConfigMatrix): number {
    const len = (arr?: any[]) => (arr?.length ? arr.length : 1);
    return (
      len(matrix.detectorThresholds) *
      len(matrix.detectorMinAreas) *
      len(matrix.detectorMinAspectRatios) *
      len(matrix.detectorMaxSides) *
      len(matrix.detectorScaleFactors) *
      len(matrix.cropperPaddings) *
      len(matrix.dictionarySimilarityThresholds) *
      len(matrix.lineGroupingMaxScores) *
      len(matrix.lineGroupingVerticalWeights)
    );
  }

  /**
   * Lazy generator yielding Cartesian product permutations of a parameter matrix.
   */
  *generateConfigPermutationsGenerator(
    matrix: PipelineConfigMatrix,
    baseConfig: PipelineConfig = DEFAULT_PIPELINE_CONFIG,
  ): Generator<PipelineConfig> {
    const detectorThresholds = matrix.detectorThresholds?.length
      ? matrix.detectorThresholds
      : [baseConfig.detector.thresholdValue];
    const detectorMinAreas = matrix.detectorMinAreas?.length
      ? matrix.detectorMinAreas
      : [baseConfig.detector.minArea];
    const detectorMinAspectRatios = matrix.detectorMinAspectRatios?.length
      ? matrix.detectorMinAspectRatios
      : [baseConfig.detector.minAspectRatio];
    const detectorMaxSides = matrix.detectorMaxSides?.length
      ? matrix.detectorMaxSides
      : [baseConfig.detector.maxSide];
    const detectorScaleFactors = matrix.detectorScaleFactors?.length
      ? matrix.detectorScaleFactors
      : [baseConfig.detector.scaleFactor];
    const cropperPaddings = matrix.cropperPaddings?.length
      ? matrix.cropperPaddings
      : [baseConfig.cropper.padding];
    const dictionarySimilarityThresholds = matrix.dictionarySimilarityThresholds?.length
      ? matrix.dictionarySimilarityThresholds
      : [baseConfig.dictionary.similarityThreshold];
    const lineGroupingMaxScores = matrix.lineGroupingMaxScores?.length
      ? matrix.lineGroupingMaxScores
      : [baseConfig.lineGrouping.maxScore];
    const lineGroupingVerticalWeights = matrix.lineGroupingVerticalWeights?.length
      ? matrix.lineGroupingVerticalWeights
      : [baseConfig.lineGrouping.weights.vertical];

    for (const thresholdValue of detectorThresholds) {
      for (const minArea of detectorMinAreas) {
        for (const minAspectRatio of detectorMinAspectRatios) {
          for (const maxSide of detectorMaxSides) {
            for (const scaleFactor of detectorScaleFactors) {
              for (const padding of cropperPaddings) {
                for (const similarityThreshold of dictionarySimilarityThresholds) {
                  for (const maxScore of lineGroupingMaxScores) {
                    for (const verticalWeight of lineGroupingVerticalWeights) {
                      yield {
                        ...baseConfig,
                        detector: {
                          ...baseConfig.detector,
                          thresholdValue,
                          minArea,
                          minAspectRatio,
                          maxSide,
                          scaleFactor,
                        },
                        cropper: {
                          ...baseConfig.cropper,
                          padding,
                        },
                        dictionary: {
                          ...baseConfig.dictionary,
                          similarityThreshold,
                        },
                        lineGrouping: {
                          ...baseConfig.lineGrouping,
                          maxScore,
                          weights: {
                            ...baseConfig.lineGrouping.weights,
                            vertical: verticalWeight,
                          },
                        },
                      };
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Generates all Cartesian product permutations of a parameter matrix as an array.
   */
  generateConfigPermutations(
    matrix: PipelineConfigMatrix,
    baseConfig: PipelineConfig = DEFAULT_PIPELINE_CONFIG,
  ): PipelineConfig[] {
    return Array.from(this.generateConfigPermutationsGenerator(matrix, baseConfig));
  }

  /**
   * Computes a composite metric score (0.0 to 1.0) combining Detection F1, Exact Match %, and CER.
   */
  computeOverallScore(report: BenchmarkSummaryReport): number {
    const f1 = report.overallDetection?.f1Score ?? 0;
    const exactMatchRatio = report.overallRecognition?.exactMatchRatio ?? 0;
    const cer = report.overallRecognition?.characterErrorRate ?? 1;

    const cerScore = Math.max(0, 1 - cer);

    // Weighted combination: 40% Detection F1, 40% Exact Match %, 20% Character Accuracy
    return Number((f1 * 0.4 + exactMatchRatio * 0.4 + cerScore * 0.2).toFixed(4));
  }

  /**
   * Evaluates a hyperparameter matrix in streaming batches, keeping only Top-K results in memory.
   */
  async evaluateMatrix(
    manifestItems: GroundTruthManifestItem[],
    matrix: PipelineConfigMatrix,
    pipelineRunner: (
      item: GroundTruthManifestItem,
      config: PipelineConfig,
    ) => Promise<PipelineState>,
    baseConfig = DEFAULT_PIPELINE_CONFIG,
    onProgress?: (combIndex: number, totalComb: number, config: PipelineConfig, bestScore: number) => void,
    options: MatrixEvaluationOptions = {},
  ): Promise<MatrixBenchmarkReport> {
    const batchSize = options.batchSize ?? 10;
    const topK = options.topK ?? 20;
    const maxConfigs = options.maxConfigurations ?? Infinity;

    const totalPossible = this.calculateTotalCombinations(matrix);
    const totalToTest = Math.min(totalPossible, maxConfigs);

    const generator = this.generateConfigPermutationsGenerator(matrix, baseConfig);
    const topKResults: MatrixEvaluationResult[] = [];
    let testedCount = 0;

    let currentBatch: PipelineConfig[] = [];

    for (const config of generator) {
      if (testedCount >= totalToTest) break;

      currentBatch.push(config);
      testedCount++;

      if (currentBatch.length >= batchSize || testedCount === totalToTest) {
        // Process current batch
        for (const batchConfig of currentBatch) {
          const sampleResults: SampleBenchmarkResult[] = [];

          for (const item of manifestItems) {
            const state = await pipelineRunner(item, batchConfig);
            const sampleResult = this.datasetEvaluator.evaluateSample(item, state);
            sampleResults.push(sampleResult);
          }

          const summaryReport = this.datasetEvaluator.generateSummaryReport(sampleResults);
          const overallScore = this.computeOverallScore(summaryReport);

          // Top-K Insertion Sort
          topKResults.push({
            config: batchConfig,
            summaryReport,
            overallScore,
          });

          topKResults.sort((a, b) => b.overallScore - a.overallScore);
          if (topKResults.length > topK) {
            topKResults.length = topK; // Prune non-Top-K entries to allow Garbage Collection
          }
        }

        const bestScore = topKResults[0]?.overallScore ?? 0;
        if (onProgress) {
          onProgress(testedCount, totalToTest, currentBatch[currentBatch.length - 1], bestScore);
        }

        currentBatch = [];
      }
    }

    return {
      timestamp: new Date().toISOString(),
      totalCombinationsTested: testedCount,
      bestConfig: topKResults[0]?.config ?? baseConfig,
      bestScore: topKResults[0]?.overallScore ?? 0,
      results: topKResults,
    };
  }
}
