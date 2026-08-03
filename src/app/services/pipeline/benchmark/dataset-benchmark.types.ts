import { BoundingBox } from '../../text-detection/types';

export interface GroundTruthAnnotation {
  id: string;
  boundingBox: BoundingBox;
  polygon?: Array<{ x: number; y: number }>;
  expectedText: string;
  textCategory?: 'price' | 'product_name' | 'quantity' | 'brand' | 'other';
}

export interface GroundTruthManifestItem {
  imageId: string;
  category: 'price-tags' | 'packaging' | 'shelf-wide' | 'synthetic';
  imagePath: string;
  dimensions: { width: number; height: number };
  annotations: GroundTruthAnnotation[];
}

export interface DatasetManifest {
  datasetName: string;
  version: string;
  description: string;
  samples: GroundTruthManifestItem[];
}

export interface DetectionMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  averageIoU: number;
}

export interface RecognitionMetrics {
  totalSamples: number;
  exactMatches: number;
  exactMatchRatio: number;
  characterErrorRate: number; // CER
  wordErrorRate: number;      // WER
  averageEditDistance: number;
}

export interface SampleBenchmarkResult {
  imageId: string;
  detectionMetrics?: DetectionMetrics;
  recognitionMetrics?: RecognitionMetrics;
  detectionLatencyMs?: number;
  recognitionLatencyMs?: number;
  totalPipelineLatencyMs: number;
}

export interface BenchmarkSummaryReport {
  timestamp: string;
  totalSamplesEvaluated: number;
  overallDetection?: DetectionMetrics;
  overallRecognition?: RecognitionMetrics;
  averagePipelineLatencyMs: number;
  sampleResults: SampleBenchmarkResult[];
}
