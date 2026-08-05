import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistoryService } from './history.service';

describe('HistoryService', () => {
  let service: HistoryService;
  let mockStore: Map<string, string>;

  beforeEach(() => {
    mockStore = new Map<string, string>();
    const localStorageMock = {
      getItem: (key: string) => mockStore.get(key) ?? null,
      setItem: (key: string, value: string) => mockStore.set(key, value),
      removeItem: (key: string) => mockStore.delete(key),
      clear: () => mockStore.clear(),
      length: 0,
      key: () => null,
    };
    vi.stubGlobal('localStorage', localStorageMock);
    service = new HistoryService();
  });

  it('should initialize with empty history items', () => {
    expect(service.items()).toEqual([]);
    expect(service.count()).toBe(0);
  });

  it('should add capture item and update signals and localStorage', () => {
    const item = service.addCapture('data:image/png;base64,abc', 3, 'Sample text');

    expect(item.id).toBeDefined();
    expect(item.dataUrl).toBe('data:image/png;base64,abc');
    expect(item.detectionsCount).toBe(3);
    expect(item.textSnippet).toBe('Sample text');

    expect(service.count()).toBe(1);
    expect(service.items()[0]).toEqual(item);
  });

  it('should delete capture item by id', () => {
    const item1 = service.addCapture('data:image/png;base64,1', 1);
    const item2 = service.addCapture('data:image/png;base64,2', 2);

    expect(service.count()).toBe(2);
    service.deleteItem(item1.id);

    expect(service.count()).toBe(1);
    expect(service.items()[0].id).toBe(item2.id);
  });

  it('should clear history', () => {
    service.addCapture('data:image/png;base64,1', 1);
    service.addCapture('data:image/png;base64,2', 2);

    expect(service.count()).toBe(2);
    service.clearHistory();

    expect(service.count()).toBe(0);
    expect(service.items()).toEqual([]);
  });
});
