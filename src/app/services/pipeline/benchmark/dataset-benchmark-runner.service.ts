import { Injectable } from '@angular/core';
import { DatasetManifest, GroundTruthManifestItem, BenchmarkSummaryReport } from './dataset-benchmark.types';
import { DatasetEvaluatorService } from './dataset-evaluator.service';
import {
  MatrixEvaluatorService,
  MatrixBenchmarkReport,
  PipelineConfigMatrix,
  MatrixEvaluationOptions,
} from './matrix-evaluator.service';
import { PipelineService } from '../pipeline.service';
import { DEFAULT_PIPELINE_CONFIG, PipelineConfig } from '../pipeline-config.types';
import { PipelineState } from '../pipeline-state';

@Injectable({
  providedIn: 'root',
})
export class DatasetBenchmarkRunnerService {
  constructor(
    private readonly datasetEvaluator: DatasetEvaluatorService,
    private readonly matrixEvaluator: MatrixEvaluatorService,
    private readonly pipeline: PipelineService,
  ) {}

  /**
   * Fetches the grocery benchmark manifest file from static assets.
   */
  async loadGroceryManifest(
    manifestPath = '/assets/test-fixtures/grocery/manifest.json',
  ): Promise<DatasetManifest> {
    const res = await fetch(manifestPath);
    if (!res.ok) {
      throw new Error(`Failed to load benchmark manifest from ${manifestPath}: ${res.statusText}`);
    }
    return (await res.json()) as DatasetManifest;
  }

  /**
   * Loads an image URL into an HTMLImageElement and extracts ImageData via canvas.
   */
  async loadImageData(imagePath: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Failed to create 2D canvas context for benchmark image'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      };
      img.onerror = (err) => reject(new Error(`Failed to load image at ${imagePath}: ${err}`));
      img.src = imagePath;
    });
  }

  /**
   * Yields execution to the main browser thread to allow DOM paints and UI updates.
   */
  private yieldToMainThread(ms = 20): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Runs model inference pipeline on a single image sample with a given PipelineConfig.
   */
  async runSampleInference(
    sample: GroundTruthManifestItem,
    config: PipelineConfig = DEFAULT_PIPELINE_CONFIG,
  ): Promise<PipelineState> {
    await this.pipeline.initialize();
    const imageData = await this.loadImageData(sample.imagePath);
    await this.pipeline.execute(imageData, config);
    return this.pipeline.state();
  }

  /**
   * Runs evaluation across all samples in the grocery dataset manifest.
   */
  async runGroceryBenchmark(
    config: PipelineConfig = DEFAULT_PIPELINE_CONFIG,
    manifestPath = '/assets/test-fixtures/grocery/manifest.json',
    onProgress?: (status: string) => void,
  ): Promise<BenchmarkSummaryReport> {
    const manifest = await this.loadGroceryManifest(manifestPath);
    const sampleResults = [];
    const total = manifest.samples.length;

    for (let i = 0; i < total; i++) {
      const sample = manifest.samples[i];
      if (onProgress) {
        onProgress(`Processing image ${i + 1} of ${total}: ${sample.imageId}...`);
      }
      await this.yieldToMainThread(20);

      const state = await this.runSampleInference(sample, config);
      const evalResult = this.datasetEvaluator.evaluateSample(sample, state);
      sampleResults.push(evalResult);
    }

    return this.datasetEvaluator.generateSummaryReport(sampleResults);
  }

  /**
   * Runs parameter matrix evaluation across the dataset manifest in streaming batches.
   */
  async runMatrixBenchmark(
    matrix: PipelineConfigMatrix,
    manifestPath = '/assets/test-fixtures/grocery/manifest.json',
    onProgress?: (status: string) => void,
    options?: MatrixEvaluationOptions,
  ): Promise<MatrixBenchmarkReport> {
    const manifest = await this.loadGroceryManifest(manifestPath);
    const runner = async (item: GroundTruthManifestItem, cfg: PipelineConfig) => {
      await this.yieldToMainThread(5);
      return this.runSampleInference(item, cfg);
    };

    const progressCallback = (combIndex: number, totalComb: number, cfg: PipelineConfig, bestScore: number) => {
      if (onProgress) {
        onProgress(
          `Matrix Batch Evaluation: ${combIndex} / ${totalComb} configs tested (Best Score: ${bestScore.toFixed(3)})...`,
        );
      }
    };

    return this.matrixEvaluator.evaluateMatrix(
      manifest.samples,
      matrix,
      runner,
      DEFAULT_PIPELINE_CONFIG,
      progressCallback,
      options,
    );
  }
}
