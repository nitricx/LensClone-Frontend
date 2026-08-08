# Price Heatmap Component

The `PriceHeatmapComponent` visualizes geolocated regional supermarket prices within a 10km radius using an interactive SVG map and zone breakdown cards.

## Features
- **Grocery List Optimizer Mode**: Integrates with `ShoppingListService` to calculate total list basket cost across 4 regional supermarket zones (North Hub, Westside Outskirts, Central District, South Financial Quarter) and highlights the cheapest overall zone.
- **Product Filter Mode**: Visualizes price distribution across geographic zones for specific scanned or catalog products.
- **Category Aggregation Mode**: Aggregates average item price index by product category ('Dairy', 'Bakery', 'Produce', etc.).
- **Interactive SVG Map**: Color-coded geographic zone heatmap overlays with animated store pin locations.
