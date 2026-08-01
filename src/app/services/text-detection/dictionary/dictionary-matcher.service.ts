import { Injectable } from '@angular/core';
import { WeightedLevenshteinService } from './weighted-levenshtein.service';
import dictionary from './grocery-dictionary.json';

export interface DictionaryMatch {
  canonical: string;
  matched: string;
  score: number;
}

@Injectable({
  providedIn: 'root',
})
export class DictionaryMatcherService {
  constructor(private readonly levenshtein: WeightedLevenshteinService) {}

  match(text: string): DictionaryMatch | null {
    const normalized = this.normalize(text);

    let best: DictionaryMatch | null = null;

    for (const [canonical, aliases] of Object.entries(dictionary)) {
      for (const alias of aliases) {
        const score = this.levenshtein.similarity(normalized, alias);

        if (!best || score > best.score) {
          best = {
            canonical,
            matched: alias,
            score,
          };
        }
      }
    }

    return best && best.score >= 0.75 ? best : null;
  }

  private normalize(text: string): string {
    return text
      .toUpperCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^A-Z0-9]/g, '');
  }
}
