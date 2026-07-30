import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WeightedLevenshteinService {
  private readonly cheapSubstitutions = new Set([
    '0O',
    'O0',
    '1I',
    'I1',
    '5S',
    'S5',
    '8B',
    'B8',
    '2Z',
    'Z2',
    '6G',
    'G6',
    '7T',
    'T7',
  ]);

  similarity(a: string, b: string): number {
    const distance = this.distance(a, b);
    return 1 - distance / Math.max(a.length, b.length);
  }

  private distance(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
      new Array(b.length + 1).fill(0),
    );

    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const substitution =
          a[i - 1] === b[j - 1]
            ? 0
            : this.cheapSubstitutions.has(`${a[i - 1]}${b[j - 1]}`)
              ? 0.25
              : 1;

        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + substitution);
      }
    }

    return dp[a.length][b.length];
  }
}
