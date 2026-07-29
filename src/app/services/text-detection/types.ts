export interface Detection {
  points: [number, number][];
  score: number;
  boundingBox: BoundingBox;
}

export interface Point {
  x: number;
  y: number;
}

export interface CroppedRegion {
  image: ImageData;
  detection: Detection;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
