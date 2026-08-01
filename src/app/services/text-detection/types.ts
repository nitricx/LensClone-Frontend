import { Quantity } from './dictionary/dictionary-matcher.service';

export interface Detection {
  boundingBoxScore: number;
  boundingBox: BoundingBox;

  crop?: ImageData;
  rawText?: string;
  rawTextScore?: number;
  canonicalText?: string;
  price?: string;
  quantity?: Quantity;
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
