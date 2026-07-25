import * as ort from 'onnxruntime-web';

export interface Detection {
  points: [number, number][];
  score: number;
}

export interface Point {
  x: number;
  y: number;
}
