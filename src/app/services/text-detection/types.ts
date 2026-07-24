import * as ort from 'onnxruntime-web';

export interface Detection {
  points: [number, number][];
  score: number;
}

export interface PreprocessResult {
  tensor: ort.Tensor;
  scaleX: number;
  scaleY: number;
}

export interface Point {
  x: number;
  y: number;
}
