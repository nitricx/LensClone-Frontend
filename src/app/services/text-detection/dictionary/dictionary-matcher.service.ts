import { Injectable } from '@angular/core';
import { WeightedLevenshteinService } from './weighted-levenshtein.service';
import dictionary from './grocery-dictionary.json';
import { Detection } from '../types';

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

      let bestCanonical: string | null = null;
      let bestScore = 0;

      for (const [canonical, aliases] of Object.entries(dictionary)) {
        for (const alias of aliases) {
          const score = this.levenshtein.similarity(normalized, alias);

          if (score > bestScore) {
            bestScore = score;
            bestCanonical = canonical;
          }
        }
      }

      return bestScore >= 0.75 && bestCanonical
        ? {
            ...detection,
            canonicalText: bestCanonical,
          }
        : detection;
    });
  }

  private normalize(text: string): string {
    return text
      .toUpperCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^A-Z0-9]/g, '');
  }
}
