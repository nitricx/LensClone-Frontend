import { Quantity } from './dictionary/dictionary-matcher.service';
export type { Quantity };

export interface Detection {
  boundingBoxScore: number;
  boundingBox: BoundingBox;

  crop?: ImageData;
  rawText?: string;
  rawTextScore?: number;
  canonicalText?: string;
  price?: string;
  quantity?: Quantity;
  line?: LineGrouping;

  trackId?: string;
  isReused?: boolean;
  isExtrapolated?: boolean;
  needsRefresh?: boolean;
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

export interface LineGrouping {
  id: number;
  score: number;
}
