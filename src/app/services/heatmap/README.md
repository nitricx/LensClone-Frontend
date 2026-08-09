# Heatmap Service

The `HeatmapService` manages geolocated supermarket store prices, GPS coordinate tracking, category filters, and aggregated grocery list basket price optimization per store location.

## Public API & Signal State
- `stores`: Signal of `StoreLocation[]` detailing monitored store locations with explicit GPS coordinates (`lat`, `lng`), addresses, and store price index multipliers.
- `productCatalog`: Signal of sample products with category tags and base prices.
- `selectedProduct`: Signal for filtering heatmap data by a specific product.
- `selectedCategory`: Signal for filtering heatmap data by category ('Dairy', 'Bakery', etc.).
- `calculateStoreSummaries(items: ShoppingListItem[])`: Computes basket totals, average item cost, savings percentage, and price index scores per store GPS location for a given shopping list.
