import { Injectable, signal, computed, inject } from '@angular/core';
import { GpsCoordinates } from '../text-detection/types';
import { IndexedDbService } from '../storage/indexed-db.service';

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
  private readonly idb: IndexedDbService | null;
  private readonly _items = signal<HistoryItem[]>([]);

  readonly items = computed(() => this._items());
  readonly count = computed(() => this._items().length);

  constructor(idb?: IndexedDbService) {
    if (idb) {
      this.idb = idb;
    } else {
      try {
        this.idb = inject(IndexedDbService, { optional: true });
      } catch {
        this.idb = null;
      }
    }
    this.initStorage();
  }

  private async initStorage(): Promise<void> {
    try {
      if (this.idb) {
        const items = await this.idb.getAll<HistoryItem>('scan_history');
        if (items && items.length > 0) {
          items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          this._items.set(items.slice(0, MAX_HISTORY_ITEMS));
          return;
        }
      }
      this._items.set(this.loadFromLocalStorage());
    } catch {
      this._items.set(this.loadFromLocalStorage());
    }
  }

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
    this.saveToIndexedDb(newItem);
    this.saveToLocalStorage(updated);
    return newItem;
  }

  deleteItem(id: string): void {
    const updated = this._items().filter((item) => item.id !== id);
    this._items.set(updated);
    if (this.idb) {
      this.idb.delete('scan_history', id).catch(() => {});
    }
    this.saveToLocalStorage(updated);
  }

  clearHistory(): void {
    this._items.set([]);
    if (this.idb) {
      this.idb.clear('scan_history').catch(() => {});
    }
    this.saveToLocalStorage([]);
  }

  private async saveToIndexedDb(item: HistoryItem): Promise<void> {
    try {
      if (this.idb) {
        await this.idb.put('scan_history', item);
      }
    } catch (e) {
      console.warn('Failed to save history item to IndexedDB:', e);
    }
  }

  private loadFromLocalStorage(): HistoryItem[] {
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

  private saveToLocalStorage(items: HistoryItem[]): void {
    try {
      if (typeof localStorage === 'undefined' || !localStorage.setItem) {
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore fallback quota errors
    }
  }
}
