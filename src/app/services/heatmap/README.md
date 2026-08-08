# Heatmap Service

The `HeatmapService` manages regional price heatmaps, monitored supermarket geographic zones, category filters, and aggregated grocery list basket price optimization.

## Public API & Signal State
- `zones`: Signal of `GeographicZone[]` detailing monitored geographic clusters and regional price index multipliers.
- `productCatalog`: Signal of sample products with category tags and base prices.
- `selectedProduct`: Signal for filtering heatmap data by a specific product.
- `selectedCategory`: Signal for filtering heatmap data by category ('Dairy', 'Bakery', etc.).
- `calculateListZoneSummaries(items: ShoppingListItem[])`: Computes basket totals, average item cost, savings percentage, and price index scores per regional zone for a given shopping list.
