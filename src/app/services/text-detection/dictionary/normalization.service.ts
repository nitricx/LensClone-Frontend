import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NormalizationService {
  normalize(text: string): string {
    return text
      .toUpperCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^A-Z0-9]/g, '');
  }
}
