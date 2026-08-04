export interface DetectorConfig {
  thresholdValue: number;
  minArea: number;
  minAspectRatio: number;
  maxSide?: number;
  scaleFactor?: number;
}

export interface CropperConfig {
  padding: number;
  paddingMode: 'fixed' | 'relative';
}

export interface RecognizerConfig {
  targetHeight: number;
}

export interface LineGroupingConfig {
  maxScore: number;
  weights: {
    vertical: number;
    height: number;
    horizontal: number;
    confidence: number;
  };
  limits: {
    maxVertical: number;
    maxHeightRatio: number;
  };
}

export interface DictionaryConfig {
  similarityThreshold: number;
  priceMin: number;
  priceMax: number;
}

export interface PipelineConfig {
  detector: DetectorConfig;
  cropper: CropperConfig;
  recognizer: RecognizerConfig;
  lineGrouping: LineGroupingConfig;
  dictionary: DictionaryConfig;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  detector: {
    thresholdValue: 0.3,
    minArea: 10,
    minAspectRatio: 1.2,
    maxSide: 0,
    scaleFactor: 1.0,
  },
  cropper: {
    padding: 4,
    paddingMode: 'fixed',
  },
  recognizer: {
    targetHeight: 48,
  },
  lineGrouping: {
    maxScore: 1.0,
    weights: {
      vertical: 0.6,
      height: 0.25,
      horizontal: 0.1,
      confidence: 0.05,
    },
    limits: {
      maxVertical: 1.0,
      maxHeightRatio: 2.0,
    },
  },
  dictionary: {
    similarityThreshold: 0.75,
    priceMin: 1000,
    priceMax: 9999,
  },
};
