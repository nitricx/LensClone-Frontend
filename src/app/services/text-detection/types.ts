import { Quantity } from './dictionary/dictionary-matcher.service';
export type { Quantity };

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  isApproximate: boolean;
  accuracyMode?: 'precise' | 'approximate';
  accuracyMeters?: number;
  timestamp?: number;
}

export interface ProductOffer {
  id: string;
  product?: string;
  quantity?: Quantity;
  price?: string;
  confidence: number;
  boundingBox: BoundingBox;
  detections: Detection[];
  coordinates?: GpsCoordinates;
  priceRating?: number;
}

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
  offerId?: string;
  isHeader?: boolean;

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

export interface GroupedTextLine {
  lineId: number;
  score: number;
  combinedText: string;
  boundingBox: BoundingBox;
  detections: Detection[];
  coordinates?: GpsCoordinates;
}


