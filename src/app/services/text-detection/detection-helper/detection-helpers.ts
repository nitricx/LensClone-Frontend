import { Detection, ProductOffer } from '../types';

const NON_PRODUCT_HEADERS = new Set([
  'OFERTAS',
  'OFERTA',
  'PRECIOS',
  'PRECIO',
  'PROMOCION',
  'PROMO',
  'PROMOCIONES',
  'HAY GAS',
  'ALMACEN',
  'VERDULERIA',
  'FRUTERIA',
]);

export function isDetectionPrice(d: Detection): boolean {
  if (d.price) return true;
  if (!d.rawText) return false;
  const text = d.rawText.trim();
  return (
    /^\$?\s*\d+([.,]\d+)?$/i.test(text) ||
    /\$\s*\d+/i.test(text) ||
    /\b\d+([.,]\d{2})?\s*\$/i.test(text) ||
    /\b\d{3,5}\b/.test(text)
  );
}

export function isDetectionQuantity(d: Detection): boolean {
  if (d.quantity) return true;
  if (!d.rawText) return false;
  const text = d.rawText.trim();
  return /\b(\d+(\/\d+|\.\d+)?\s*(kg|k6|g|6|gr|gramos|ml|l|un|u|pote|paquete|cc|pack|lt|lts)|x\s*paquete|x\s*unidad|x\s*un|kg|k6|x\s*[a-zA-Z]+|[a-zA-Z]+\s*x|x\s*\d+|\d+\s*x)\b/i.test(text);
}

export function isDetectionProduct(d: Detection): boolean {
  if (d.isHeader) return false;
  if (d.canonicalText) return true;
  if (!d.rawText) return false;
  if (isDetectionQuantity(d)) return false;
  const cleaned = d.rawText
    .toUpperCase()
    .replace(/\$\s*\d+([.,]\d+)?/g, '')
    .replace(/\b\d+([.,]\d+)?\s*(KG|K6|G|6|UN|PACK|PAQUETE|POTE)\b/gi, '')
    .replace(/\b\d{3,5}\b/g, '')
    .trim();

  if (NON_PRODUCT_HEADERS.has(cleaned)) return false;
  return /[a-zA-Z]{3,}/.test(cleaned);
}

export function hasAllThreeProperties(detections: Detection[]): boolean {
  if (!detections || detections.length === 0) return false;
  const hasProduct = detections.some((d) => isDetectionProduct(d));
  const hasQuantity = detections.some((d) => isDetectionQuantity(d));
  const hasPrice = detections.some((d) => isDetectionPrice(d));
  return hasProduct && hasQuantity && hasPrice;
}

export function isOfferComplete(offer: ProductOffer): boolean {
  return Boolean(offer.product && offer.quantity && offer.price);
}
