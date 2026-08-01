import { Injectable } from '@angular/core';
import { WeightedLevenshteinService } from './weighted-levenshtein.service';
import productsDictionary from './grocery-dictionary.json';
import quantityDictionary from './quantity-dictionary.json';
import { Detection } from '../types';

export type Unit = 'kg';

export interface Quantity {
  quantity: number;
  unit: Unit;
}

export interface QuantityDictionaryEntry {
  quantity: number;
  unit: Unit;
  aliases: string[];
}

@Injectable({
  providedIn: 'root',
})
export class DictionaryMatcherService {
  constructor(private readonly levenshtein: WeightedLevenshteinService) {}

  match(detections: Detection[]): Detection[] {
    return detections.map((detection) => {
      if (!detection.rawText) {
        return detection;
      }
      const normalized = this.normalize(detection.rawText);

      return {
        ...detection,
        canonicalText: this.matchProduct(normalized),
        price: this.matchPrice(detection.rawText),
        quantity: this.matchQuantity(detection.rawText),
      };
    });
  }

  private matchPrice(rawText: string): string | undefined {
    const normalized = rawText.replace(/\$/g, '').replace(/\s/g, '');

    if (!/^\d+$/.test(normalized)) {
      return undefined;
    }

    const price = Number(normalized);

    if (price < 1000 || price > 9999) {
      return undefined;
    }

    return this.normalizePrice(normalized);
  }

  private normalizePrice(text: string): string {
    return text
      .toUpperCase()
      .replace(/O/g, '0')
      .replace(/I/g, '1')
      .replace(/S/g, '5')
      .replace(/B/g, '8');
  }

  private matchQuantity(normalizedText: string): Quantity | undefined {
    let bestMatch: Quantity | undefined;
    let bestScore = 0;

    for (const entry of quantityDictionary) {
      for (const alias of entry.aliases) {
        const score = this.levenshtein.similarity(normalizedText, alias);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            quantity: entry.quantity,
            unit: 'kg',
          };
        }
      }
    }

    return bestScore >= 0.75 ? bestMatch : undefined;
  }

  private matchProduct(normalizedText: string): string | undefined {
    let bestCanonical: string | undefined;
    let bestScore = 0;

    for (const [canonical, aliases] of Object.entries(productsDictionary)) {
      for (const alias of aliases) {
        const score = this.levenshtein.similarity(normalizedText, alias);

        if (score > bestScore) {
          bestScore = score;
          bestCanonical = canonical;
        }
      }
    }

    return bestScore >= 0.75 ? bestCanonical : undefined;
  }

  private normalize(text: string): string {
    return text
      .toUpperCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^A-Z0-9]/g, '');
  }
}
