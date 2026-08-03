/// <reference lib="webworker" />

import * as ort from 'onnxruntime-web';
import { DetectorPreprocessorService } from '../text-detection/detector/detector-preprocessor.service';
import { DetectorPostprocessorService } from '../text-detection/detector/detector-postprocessor.service';
import { DetectorService } from '../text-detection/detector/detector.service';
import { DetectorFilterService } from '../text-detection/detector/detector-filter.service';
import { DetectorCropperService } from '../text-detection/cropper.service';
import { RecognitionPreprocessorService } from '../text-detection/recognition/recognition-preprocessor.service';
import { RecognitionPostprocessorService } from '../text-detection/recognition/recognition-postprocessor.service';
import { RecognitionService } from '../text-detection/recognition/recognition.service';
import { WeightedLevenshteinService } from '../text-detection/dictionary/weighted-levenshtein.service';
import { DictionaryMatcherService } from '../text-detection/dictionary/dictionary-matcher.service';
import { LineGroupingService } from '../text-detection/line-grouping.service';
import { PipelineState, PipelineStage } from './pipeline-state';

const detectorPreprocessor = new DetectorPreprocessorService();
const detectorPostprocessor = new DetectorPostprocessorService();
const detector = new DetectorService(detectorPreprocessor, detectorPostprocessor);
const detectorFilter = new DetectorFilterService();
const cropper = new DetectorCropperService();

const recognitionPreprocessor = new RecognitionPreprocessorService();
const recognitionPostprocessor = new RecognitionPostprocessorService();
const recognizer = new RecognitionService(recognitionPreprocessor, recognitionPostprocessor);

const weightedLevenshtein = new WeightedLevenshteinService();
const dictionaryMatcher = new DictionaryMatcherService(weightedLevenshtein);
const lineGroupingService = new LineGroupingService();

const stages: PipelineStage[] = [
  detector,
  detectorFilter,
  cropper,
  recognizer,
  dictionaryMatcher,
  lineGroupingService,
];

let isInitialized = false;

addEventListener('message', async (event: MessageEvent) => {
  const { type, id, payload } = event.data;

  if (type === 'INITIALIZE') {
    try {
      ort.env.wasm.proxy = false;
      ort.env.wasm.numThreads = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
      ort.env.wasm.wasmPaths = '/assets/ort/';

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
      const { imageData, config } = payload;

      const image = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height,
      );

      const state: PipelineState = {
        fullImage: image,
        detections: [],
        processingTimeMs: 0,
        config,
      };

      for (const stage of stages) {
        await stage.execute(state);
      }

      const totalTimeMs = performance.now() - startTime;

      postMessage({
        type: 'RESULT',
        id,
        state: {
          detections: state.detections,
          processingTimeMs: totalTimeMs,
          config: state.config,
        },
      });
    } catch (error: any) {
      postMessage({ type: 'ERROR', id, error: error?.message || String(error) });
    }
  }
});
