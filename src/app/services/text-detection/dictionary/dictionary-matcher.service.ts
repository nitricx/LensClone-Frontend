import { Injectable } from '@angular/core';
import { WeightedLevenshteinService } from './weighted-levenshtein.service';
import productsDictionary from './grocery-dictionary.json';
import quantityDictionary from './quantity-dictionary.json';
import { Detection } from '../types';
import { PipelineStage, PipelineState } from '../../pipeline/pipeline-state';

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
export class DictionaryMatcherService implements PipelineStage {
  constructor(private readonly levenshtein: WeightedLevenshteinService) {}

  execute(state: PipelineState): void {
    for (const detection of state.detections) {
      if (!detection.rawText) {
        continue;
      }

      const normalized = this.normalize(detection.rawText);

      detection.canonicalText = this.matchProduct(normalized);
      detection.price = this.matchPrice(detection.rawText);
      detection.quantity = this.matchQuantity(detection.rawText);
    }
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
