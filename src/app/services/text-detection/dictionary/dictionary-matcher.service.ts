import { Injectable } from '@angular/core';
import { WeightedLevenshteinService } from './weighted-levenshtein.service';
import productsDictionary from './grocery-dictionary.json';
import quantityDictionary from './quantity-dictionary.json';
import headerDictionary from './header-dictionary.json';
import { Detection } from '../types';
import { PipelineStage, PipelineState } from '../../pipeline/pipeline-state';
import { DEFAULT_PIPELINE_CONFIG, DictionaryConfig } from '../../pipeline/pipeline-config.types';

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
  readonly name = 'dictionary';

  constructor(private readonly levenshtein: WeightedLevenshteinService) {}

  execute(state: PipelineState): void {
    const config = state.config?.dictionary ?? DEFAULT_PIPELINE_CONFIG.dictionary;

    for (const detection of state.detections) {
      if (detection.isReused && !detection.needsRefresh) {
        continue;
      }

      if (!detection.rawText) {
        continue;
      }

      detection.price = this.matchPrice(detection.rawText, config);
      detection.quantity = this.matchQuantity(detection.rawText, config);
      detection.canonicalText = this.matchProduct(detection.rawText, config);
      detection.isHeader = this.matchHeader(this.normalize(detection.rawText), config);
    }
  }

  private matchPrice(rawText: string, config: DictionaryConfig): string | undefined {
    const priceMatch = rawText.match(/\$\s*(\d+([.,]\d+)?)/) || rawText.match(/\b(\d{3,5})\b/);
    if (!priceMatch) {
      return undefined;
    }

    const rawNum = priceMatch[1].replace(/[^0-9]/g, '');
    const price = Number(rawNum);

    if (price < config.priceMin || price > config.priceMax) {
      return undefined;
    }

    return `$${price}`;
  }

  private normalizePrice(text: string): string {
    return text
      .toUpperCase()
      .replace(/O/g, '0')
      .replace(/I/g, '1')
      .replace(/S/g, '5')
      .replace(/B/g, '8');
  }

  private matchQuantity(rawText: string, config: DictionaryConfig): Quantity | undefined {
    // 1. Regex parsing for embedded quantity with OCR substitution (e.g. 2KG, 2K6, 1K6, 500G, 5006)
    const normalizedRaw = rawText.toUpperCase().replace(/K6/g, 'KG').replace(/5006/g, '500G');
    const qtyMatch = normalizedRaw.match(/(\d+(\/\d+|\.\d+)?)\s*(KG|G|GR|UN|PACK|PAQUETE|POTE)\b/i);

    if (qtyMatch) {
      const num = Number(qtyMatch[1]);
      if (!isNaN(num) && num > 0) {
        return {
          quantity: num,
          unit: 'kg',
        };
      }
    }

    // 2. Similarity match fallback using normalized string
    const normalizedText = this.normalize(rawText);
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

    return bestScore >= config.similarityThreshold ? bestMatch : undefined;
  }

  private matchProduct(rawText: string, config: DictionaryConfig): string | undefined {
    // Strip price and quantity tokens to isolate product candidate text (e.g. "TOMATE2K6$3000" -> "TOMATE")
    const cleanedText = rawText
      .toUpperCase()
      .replace(/\$\s*\d+([.,]\d+)?/g, '')
      .replace(/(\d+(\/\d+|\.\d+)?)\s*(KG|K6|G|6|UN|PACK|PAQUETE|POTE)/gi, '')
      .replace(/\d+/g, '')
      .trim();

    const normalizedText = this.normalize(cleanedText);
    if (normalizedText.length < 2) {
      return undefined;
    }

    let bestCanonical: string | undefined;
    let bestScore = 0;

    for (const [canonical, aliases] of Object.entries(productsDictionary)) {
      for (const alias of aliases) {
        const normAlias = this.normalize(alias);
        if (normalizedText.includes(normAlias) || normAlias.includes(normalizedText)) {
          const score = Math.min(normalizedText.length, normAlias.length) / Math.max(normalizedText.length, normAlias.length);
          if (score > bestScore) {
            bestScore = score;
            bestCanonical = canonical;
          }
        }

        const score = this.levenshtein.similarity(normalizedText, normAlias);

        if (score > bestScore) {
          bestScore = score;
          bestCanonical = canonical;
        }
      }
    }

    if (bestScore >= config.similarityThreshold && bestCanonical) {
      return bestCanonical;
    }

    // Fallback: If no dictionary match was high enough, but cleanedText is an alphabetic word >= 3 letters, return cleanedText
    if (/^[A-Z]{3,}$/.test(normalizedText)) {
      return normalizedText;
    }

    return undefined;
  }

  private matchHeader(normalizedText: string, config: DictionaryConfig): boolean {
    let bestScore = 0;

    for (const aliases of Object.values(headerDictionary)) {
      for (const alias of aliases) {
        const score = this.levenshtein.similarity(normalizedText, alias);
        if (score > bestScore) {
          bestScore = score;
        }
      }
    }

    return bestScore >= config.similarityThreshold;
  }

  private normalize(text: string): string {
    return text
      .toUpperCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^A-Z0-9]/g, '');
  }
}
