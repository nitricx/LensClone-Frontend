# History Service

The `HistoryService` tracks, stores, and manages captured scan history items, including image data URLs, detection counts, and recognized text snippets.

## Primary Files
- [history.service.ts](file:///d:/Repositories/PoC-LensClone/src/app/services/history/history.service.ts) - Service for managing scan history state and local storage persistence.

## Key Signals & State Exposed
- `items`: `Signal<HistoryItem[]>` - Computed signal returning list of saved scan captures (max 20 items).
- `count`: `Signal<number>` - Total number of stored history captures.

## Key Methods
- `addCapture(dataUrl: string, detectionsCount: number, textSnippet?: string)`: Prepend a new capture item and update storage.
- `deleteItem(id: string)`: Removes a specific capture item by ID.
- `clearHistory()`: Wipes all saved history entries.

## Storage & Limits
History entries are persisted in `localStorage` under key `lens_clone_history_v1` and capped at `MAX_HISTORY_ITEMS = 20` entries.
