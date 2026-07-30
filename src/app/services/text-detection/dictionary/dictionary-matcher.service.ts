import { Injectable, inject } from '@angular/core';
import { DictionaryService } from './dictionary.service';
import { NormalizationService } from './normalization.service';
import { WeightedLevenshteinService } from './weighted-levenshtein.service';

export interface DictionaryMatch {
  canonical: string;
  matched: string;
  score: number;
}

@Injectable({
  providedIn: 'root',
})
export class DictionaryMatcherService {
  constructor(
    private readonly dictionaryService: DictionaryService,
    private readonly normalization: NormalizationService,
    private readonly levenshtein: WeightedLevenshteinService,
  ) {}

  private dictionary: Record<string, string[]> = {};

  async initialize(): Promise<void> {
    this.dictionary = await this.dictionaryService.load();
  }

  match(text: string): DictionaryMatch | null {
    const normalized = this.normalization.normalize(text);

    let best: DictionaryMatch | null = null;

    for (const [canonical, aliases] of Object.entries(this.dictionary)) {
      for (const alias of aliases) {
        const score = this.levenshtein.similarity(normalized, this.normalization.normalize(alias));

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
}
