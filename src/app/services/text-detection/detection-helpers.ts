import { Detection } from './types';

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
    /\b\d+([.,]\d{2})?\s*\$/i.test(text)
  );
}

export function isDetectionQuantity(d: Detection): boolean {
  if (d.quantity) return true;
  if (!d.rawText) return false;
  const text = d.rawText.trim();
  return /\b(\d+(\/\d+|\.\d+)?\s*(kg|g|gr|gramos|ml|l|un|u|pote|paquete|cc|pack|lt|lts)|x\s*paquete|x\s*unidad|x\s*un|kg|x\s*[a-zA-Z]+|[a-zA-Z]+\s*x|x\s*\d+|\d+\s*x)\b/i.test(text);
}

export function isDetectionProduct(d: Detection): boolean {
  if (d.isHeader) return false;
  if (d.canonicalText) return true;
  if (!d.rawText) return false;
  const text = d.rawText.trim().toUpperCase();
  if (NON_PRODUCT_HEADERS.has(text)) return false;
  if (isDetectionQuantity(d)) return false;
  if (isDetectionPrice(d)) return false;
  return /[a-zA-Z]{2,}/.test(text);
}

export function hasAllThreeProperties(detections: Detection[]): boolean {
  if (!detections || detections.length === 0) return false;
  const hasProduct = detections.some((d) => isDetectionProduct(d));
  const hasQuantity = detections.some((d) => isDetectionQuantity(d));
  const hasPrice = detections.some((d) => isDetectionPrice(d));
  return hasProduct && hasQuantity && hasPrice;
}
