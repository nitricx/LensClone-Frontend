import { Injectable } from '@angular/core';
import { BoundingBox, Detection } from '../../text-detection/types';
import { PipelineState } from '../pipeline-state';
import {
  BenchmarkSummaryReport,
  DetectionMetrics,
  GroundTruthAnnotation,
  GroundTruthManifestItem,
  RecognitionMetrics,
  SampleBenchmarkResult,
} from './dataset-benchmark.types';

@Injectable({
  providedIn: 'root',
})
export class DatasetEvaluatorService {
  /**
   * Calculates Intersection over Union (IoU) between two bounding boxes.
   */
  calculateIoU(box1: BoundingBox, box2: BoundingBox): number {
    const xOverlap = Math.max(
      0,
      Math.min(box1.x + box1.width, box2.x + box2.width) - Math.max(box1.x, box2.x),
    );
    const yOverlap = Math.max(
      0,
      Math.min(box1.y + box1.height, box2.y + box2.height) - Math.max(box1.y, box2.y),
    );
    const intersectionArea = xOverlap * yOverlap;

    const box1Area = box1.width * box1.height;
    const box2Area = box2.width * box2.height;
    const unionArea = box1Area + box2Area - intersectionArea;

    if (unionArea <= 0) return 0;
    return intersectionArea / unionArea;
  }

  /**
   * Evaluates predicted bounding boxes against ground truth boxes for a single image.
   * @param predictedBoxes Detections returned by DetectorService
   * @param gtAnnotations Ground truth annotations
   * @param iouThreshold Minimum IoU required to count as a True Positive (default 0.50)
   */
  evaluateDetection(
    predictedBoxes: BoundingBox[],
    gtAnnotations: GroundTruthAnnotation[],
    iouThreshold = 0.5,
  ): DetectionMetrics {
    const matchedGT = new Set<number>();
    let truePositives = 0;
    let falsePositives = 0;
    let totalIoU = 0;
    let matchedCount = 0;

    for (const predBox of predictedBoxes) {
      let bestIoU = 0;
      let bestGTIdx = -1;

      gtAnnotations.forEach((gt, idx) => {
        if (matchedGT.has(idx)) return;
        const iou = this.calculateIoU(predBox, gt.boundingBox);
        if (iou > bestIoU) {
          bestIoU = iou;
          bestGTIdx = idx;
        }
      });

      if (bestIoU >= iouThreshold && bestGTIdx !== -1) {
        truePositives++;
        matchedGT.add(bestGTIdx);
        totalIoU += bestIoU;
        matchedCount++;
      } else {
        falsePositives++;
      }
    }

    const falseNegatives = gtAnnotations.length - truePositives;
    const precision =
      predictedBoxes.length > 0 ? truePositives / predictedBoxes.length : 0;
    const recall = gtAnnotations.length > 0 ? truePositives / gtAnnotations.length : 0;
    const f1Score =
      precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const averageIoU = matchedCount > 0 ? totalIoU / matchedCount : 0;

    return {
      truePositives,
      falsePositives,
      falseNegatives,
      precision,
      recall,
      f1Score,
      averageIoU,
    };
  }

  /**
   * Calculates Levenshtein Distance between two strings.
   */
  calculateLevenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const dp: number[][] = Array.from({ length: len1 + 1 }, () =>
      Array(len2 + 1).fill(0),
    );

    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // Deletion
          dp[i][j - 1] + 1,      // Insertion
          dp[i - 1][j - 1] + cost, // Substitution
        );
      }
    }

    return dp[len1][len2];
  }

  /**
   * Calculates Character Error Rate (CER) for string predictions.
   * CER = LevenshteinDistance / GroundTruthLength
   */
  calculateCER(predicted: string, expected: string): number {
    if (expected.length === 0) return predicted.length === 0 ? 0 : 1;
    const editDist = this.calculateLevenshteinDistance(
      predicted.trim().toLowerCase(),
      expected.trim().toLowerCase(),
    );
    return editDist / expected.length;
  }

  /**
   * Calculates Word Error Rate (WER) for string predictions.
   */
  calculateWER(predicted: string, expected: string): number {
    const predWords = predicted.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const expWords = expected.trim().toLowerCase().split(/\s+/).filter(Boolean);

    if (expWords.length === 0) return predWords.length === 0 ? 0 : 1;

    const editDist = this.calculateLevenshteinDistance(
      predWords.join(' '),
      expWords.join(' '),
    );
    return editDist / expWords.length;
  }

  /**
   * Evaluates text recognition predictions against ground truth strings.
   */
  evaluateRecognition(
    pairs: Array<{ predicted: string; expected: string }>,
  ): RecognitionMetrics {
    if (pairs.length === 0) {
      return {
        totalSamples: 0,
        exactMatches: 0,
        exactMatchRatio: 0,
        characterErrorRate: 0,
        wordErrorRate: 0,
        averageEditDistance: 0,
      };
    }

    let exactMatches = 0;
    let totalCER = 0;
    let totalWER = 0;
    let totalEditDistance = 0;

    for (const pair of pairs) {
      const predClean = pair.predicted.trim();
      const expClean = pair.expected.trim();

      if (predClean.toLowerCase() === expClean.toLowerCase()) {
        exactMatches++;
      }

      const cer = this.calculateCER(predClean, expClean);
      const wer = this.calculateWER(predClean, expClean);
      const editDist = this.calculateLevenshteinDistance(
        predClean.toLowerCase(),
        expClean.toLowerCase(),
      );

      totalCER += cer;
      totalWER += wer;
      totalEditDistance += editDist;
    }

    return {
      totalSamples: pairs.length,
      exactMatches,
      exactMatchRatio: exactMatches / pairs.length,
      characterErrorRate: totalCER / pairs.length,
      wordErrorRate: totalWER / pairs.length,
      averageEditDistance: totalEditDistance / pairs.length,
    };
  }

  /**
   * Computes sample evaluation summary given pipeline execution results & Ground Truth annotation.
   */
  evaluateSample(
    gtItem: GroundTruthManifestItem,
    state: PipelineState,
    detectionTimeMs = 0,
    recognitionTimeMs = 0,
  ): SampleBenchmarkResult {
    const predictedBoxes = state.detections.map((d) => d.boundingBox);
    const detectionMetrics = this.evaluateDetection(
      predictedBoxes,
      gtItem.annotations,
    );

    const recPairs: Array<{ predicted: string; expected: string }> = [];
    // Match predicted detections with GT boxes to compare text
    for (const detection of state.detections) {
      if (!detection.rawText) continue;
      let bestIoU = 0;
      let bestGTText = '';

      for (const gt of gtItem.annotations) {
        const iou = this.calculateIoU(detection.boundingBox, gt.boundingBox);
        if (iou > bestIoU) {
          bestIoU = iou;
          bestGTText = gt.expectedText;
        }
      }

      if (bestIoU >= 0.3 && bestGTText) {
        recPairs.push({
          predicted: detection.rawText,
          expected: bestGTText,
        });
      }
    }

    const recognitionMetrics = this.evaluateRecognition(recPairs);

    return {
      imageId: gtItem.imageId,
      detectionMetrics,
      recognitionMetrics,
      detectionLatencyMs: detectionTimeMs,
      recognitionLatencyMs: recognitionTimeMs,
      totalPipelineLatencyMs: state.processingTimeMs || detectionTimeMs + recognitionTimeMs,
    };
  }

  /**
   * Aggregates multiple sample benchmark results into a final summary report.
   */
  generateSummaryReport(sampleResults: SampleBenchmarkResult[]): BenchmarkSummaryReport {
    let totalTP = 0, totalFP = 0, totalFN = 0, sumIoU = 0;
    let totalRecSamples = 0, totalExactMatches = 0, sumCER = 0, sumWER = 0;
    let totalLatency = 0;

    for (const res of sampleResults) {
      if (res.detectionMetrics) {
        totalTP += res.detectionMetrics.truePositives;
        totalFP += res.detectionMetrics.falsePositives;
        totalFN += res.detectionMetrics.falseNegatives;
        sumIoU += res.detectionMetrics.averageIoU;
      }
      if (res.recognitionMetrics) {
        totalRecSamples += res.recognitionMetrics.totalSamples;
        totalExactMatches += res.recognitionMetrics.exactMatches;
        sumCER += res.recognitionMetrics.characterErrorRate * res.recognitionMetrics.totalSamples;
        sumWER += res.recognitionMetrics.wordErrorRate * res.recognitionMetrics.totalSamples;
      }
      totalLatency += res.totalPipelineLatencyMs;
    }

    const sampleCount = sampleResults.length;
    const precision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
    const recall = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      timestamp: new Date().toISOString(),
      totalSamplesEvaluated: sampleCount,
      overallDetection: {
        truePositives: totalTP,
        falsePositives: totalFP,
        falseNegatives: totalFN,
        precision,
        recall,
        f1Score,
        averageIoU: sampleCount > 0 ? sumIoU / sampleCount : 0,
      },
      overallRecognition: {
        totalSamples: totalRecSamples,
        exactMatches: totalExactMatches,
        exactMatchRatio: totalRecSamples > 0 ? totalExactMatches / totalRecSamples : 0,
        characterErrorRate: totalRecSamples > 0 ? sumCER / totalRecSamples : 0,
        wordErrorRate: totalRecSamples > 0 ? sumWER / totalRecSamples : 0,
        averageEditDistance: 0,
      },
      averagePipelineLatencyMs: sampleCount > 0 ? totalLatency / sampleCount : 0,
      sampleResults,
    };
  }
}
