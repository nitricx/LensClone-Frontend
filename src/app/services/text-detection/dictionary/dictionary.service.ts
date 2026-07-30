import { Injectable } from '@angular/core';
import dictionary from './grocery-dictionary.json';

@Injectable({
  providedIn: 'root',
})
export class DictionaryService {
  load(): Record<string, string[]> {
    return dictionary;
  }
}
