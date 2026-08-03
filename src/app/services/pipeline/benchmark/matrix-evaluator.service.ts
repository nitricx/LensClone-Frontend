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

@Injectable({
  providedIn: 'root',
})
export class MatrixEvaluatorService {
  constructor(private readonly datasetEvaluator: DatasetEvaluatorService) {}

  /**
   * Generates all Cartesian product permutations of a parameter matrix.
   */
  generateConfigPermutations(
    matrix: PipelineConfigMatrix,
    baseConfig: PipelineConfig = DEFAULT_PIPELINE_CONFIG,
  ): PipelineConfig[] {
    const detectorThresholds = matrix.detectorThresholds?.length
      ? matrix.detectorThresholds
      : [baseConfig.detector.thresholdValue];
    const detectorMinAreas = matrix.detectorMinAreas?.length
      ? matrix.detectorMinAreas
      : [baseConfig.detector.minArea];
    const detectorMinAspectRatios = matrix.detectorMinAspectRatios?.length
      ? matrix.detectorMinAspectRatios
      : [baseConfig.detector.minAspectRatio];
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

    const permutations: PipelineConfig[] = [];

    for (const thresholdValue of detectorThresholds) {
      for (const minArea of detectorMinAreas) {
        for (const minAspectRatio of detectorMinAspectRatios) {
          for (const padding of cropperPaddings) {
            for (const similarityThreshold of dictionarySimilarityThresholds) {
              for (const maxScore of lineGroupingMaxScores) {
                for (const verticalWeight of lineGroupingVerticalWeights) {
                  permutations.push({
                    ...baseConfig,
                    detector: {
                      ...baseConfig.detector,
                      thresholdValue,
                      minArea,
                      minAspectRatio,
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
                  });
                }
              }
            }
          }
        }
      }
    }

    return permutations;
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
   * Evaluates a hyperparameter matrix across a set of ground truth items using a provided pipeline runner callback.
   */
  async evaluateMatrix(
    manifestItems: GroundTruthManifestItem[],
    matrix: PipelineConfigMatrix,
    pipelineRunner: (
      item: GroundTruthManifestItem,
      config: PipelineConfig,
    ) => Promise<PipelineState>,
    baseConfig = DEFAULT_PIPELINE_CONFIG,
  ): Promise<MatrixBenchmarkReport> {
    const configs = this.generateConfigPermutations(matrix, baseConfig);
    const results: MatrixEvaluationResult[] = [];

    for (const config of configs) {
      const sampleResults: SampleBenchmarkResult[] = [];

      for (const item of manifestItems) {
        const state = await pipelineRunner(item, config);
        const sampleResult = this.datasetEvaluator.evaluateSample(item, state);
        sampleResults.push(sampleResult);
      }

      const summaryReport = this.datasetEvaluator.generateSummaryReport(sampleResults);
      const overallScore = this.computeOverallScore(summaryReport);

      results.push({
        config,
        summaryReport,
        overallScore,
      });
    }

    results.sort((a, b) => b.overallScore - a.overallScore);

    return {
      timestamp: new Date().toISOString(),
      totalCombinationsTested: results.length,
      bestConfig: results[0]?.config ?? baseConfig,
      bestScore: results[0]?.overallScore ?? 0,
      results,
    };
  }
}
