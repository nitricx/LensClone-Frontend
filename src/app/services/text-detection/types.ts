export interface Detection {
  points: [number, number][];
  score: number;
  boundingBox: BoundingBox;

  crop?: ImageData;
  text?: string;
  textScore?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
