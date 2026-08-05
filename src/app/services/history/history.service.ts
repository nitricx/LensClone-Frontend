import { Injectable, signal, computed } from '@angular/core';
import { GpsCoordinates } from '../text-detection/types';

export interface HistoryItem {
  id: string;
  timestamp: string;
  dataUrl: string;
  detectionsCount: number;
  textSnippet?: string;
  coordinates?: GpsCoordinates;
}

const STORAGE_KEY = 'lens_clone_history_v1';
const MAX_HISTORY_ITEMS = 20;

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private readonly _items = signal<HistoryItem[]>(this.loadFromStorage());

  readonly items = computed(() => this._items());
  readonly count = computed(() => this._items().length);

  addCapture(
    dataUrl: string,
    detectionsCount: number,
    textSnippet?: string,
    coordinates?: GpsCoordinates,
  ): HistoryItem {
    const newItem: HistoryItem = {
      id: `capture_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      dataUrl,
      detectionsCount,
      textSnippet: textSnippet?.trim() || undefined,
      coordinates,
    };

    const updated = [newItem, ...this._items()].slice(0, MAX_HISTORY_ITEMS);
    this._items.set(updated);
    this.saveToStorage(updated);
    return newItem;
  }

  deleteItem(id: string): void {
    const updated = this._items().filter((item) => item.id !== id);
    this._items.set(updated);
    this.saveToStorage(updated);
  }

  clearHistory(): void {
    this._items.set([]);
    this.saveToStorage([]);
  }

  private loadFromStorage(): HistoryItem[] {
    try {
      if (typeof localStorage === 'undefined' || !localStorage.getItem) {
        return [];
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(items: HistoryItem[]): void {
    try {
      if (typeof localStorage === 'undefined' || !localStorage.setItem) {
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save history to localStorage:', e);
    }
  }
}
