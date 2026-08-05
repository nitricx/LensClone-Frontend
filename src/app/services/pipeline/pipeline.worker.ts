/// <reference lib="webworker" />

import * as ort from 'onnxruntime-web';
import { DetectorPreprocessorService } from '../text-detection/detector/detector-preprocessor.service';
import { DetectorPostprocessorService } from '../text-detection/detector/detector-postprocessor.service';
import { DetectorService } from '../text-detection/detector/detector.service';
import { DetectorFilterService } from '../text-detection/detector/detector-filter.service';
import { TrackerService } from '../text-detection/tracking/tracker.service';
import { DetectorCropperService } from '../text-detection/cropper/cropper.service';
import { RecognitionPreprocessorService } from '../text-detection/recognition/recognition-preprocessor.service';
import { RecognitionPostprocessorService } from '../text-detection/recognition/recognition-postprocessor.service';
import { RecognitionService } from '../text-detection/recognition/recognition.service';
import { WeightedLevenshteinService } from '../text-detection/dictionary/weighted-levenshtein.service';
import { DictionaryMatcherService } from '../text-detection/dictionary/dictionary-matcher.service';
import { LineGroupingService } from '../text-detection/line-grouping/line-grouping.service';
import { OfferExtractorService } from '../text-detection/offer-extraction/offer-extractor.service';
import { TensorBufferPoolService } from '../text-detection/tensor-buffer-pool/tensor-buffer-pool.service';
import { PipelineState, PipelineStage } from './pipeline-state';
import { DEFAULT_PIPELINE_CONFIG } from './pipeline-config.types';

const tensorBufferPool = new TensorBufferPoolService();
const detectorPreprocessor = new DetectorPreprocessorService(tensorBufferPool);
const detectorPostprocessor = new DetectorPostprocessorService();
const detector = new DetectorService(detectorPreprocessor, detectorPostprocessor);
const detectorFilter = new DetectorFilterService();
const tracker = new TrackerService();
const cropper = new DetectorCropperService();

const recognitionPreprocessor = new RecognitionPreprocessorService(tensorBufferPool);
const recognitionPostprocessor = new RecognitionPostprocessorService();
const recognizer = new RecognitionService(recognitionPreprocessor, recognitionPostprocessor);

const weightedLevenshtein = new WeightedLevenshteinService();
const dictionaryMatcher = new DictionaryMatcherService(weightedLevenshtein);
const lineGroupingService = new LineGroupingService();
const offerExtractorService = new OfferExtractorService();

const stages: PipelineStage[] = [
  detector,
  detectorFilter,
  tracker,
  cropper,
  recognizer,
  dictionaryMatcher,
  lineGroupingService,
  offerExtractorService,
];

let isInitialized = false;

addEventListener('message', async (event: MessageEvent) => {
  const { type, id, payload } = event.data;

  if (type === 'INITIALIZE') {
    try {
      ort.env.wasm.proxy = false;
      const concurrency = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
      ort.env.wasm.numThreads = Math.min(4, concurrency);
      if (typeof window !== 'undefined' && ort?.env?.wasm) {
        ort.env.wasm.wasmPaths = '/assets/ort/';
      }

      for (const stage of stages) {
        await stage.initialize?.();
      }
      isInitialized = true;
      postMessage({ type: 'INITIALIZED', id });
    } catch (error: any) {
      postMessage({ type: 'ERROR', id, error: error?.message || String(error) });
    }
    return;
  }

  if (type === 'EXECUTE') {
    if (!isInitialized) {
      postMessage({ type: 'ERROR', id, error: 'Pipeline worker is not initialized yet' });
      return;
    }

    try {
      const startTime = performance.now();
      const { imageData, config, coordinates } = payload;

      const image = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height,
      );

      const state: PipelineState = {
        fullImage: image,
        detections: [],
        offers: [],
        coordinates,
        processingTimeMs: 0,
        config: config ?? DEFAULT_PIPELINE_CONFIG,
      };

      const stageMetrics: Record<string, number> = {};
      for (const stage of stages) {
        const stageStart = performance.now();
        await stage.execute(state);
        const stageName = stage.name || stage.constructor.name;
        stageMetrics[stageName] = performance.now() - stageStart;
      }
      state.stageMetrics = stageMetrics;

      const totalTimeMs = performance.now() - startTime;

      postMessage({
        type: 'RESULT',
        id,
        state: {
          detections: state.detections,
          offers: state.offers,
          coordinates: state.coordinates,
          processingTimeMs: totalTimeMs,
          stageMetrics,
          config: state.config,
        },
      });
    } catch (error: any) {
      postMessage({ type: 'ERROR', id, error: error?.message || String(error) });
    }
  }
});
