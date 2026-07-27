# Feature Catalog - Module 3: Feature Engineering

**Version**: `v1.0.0`  
**Module**: Module 3: Feature Engineering  
**Scope**: Model-Independent Reusable AI Telemetry Features  

---

## Executive Summary
Module 3 produces 10 standardized, reusable, model-independent AI features from historical warehouse operational data. All features are strictly calculated metrics without machine learning predictions. Each feature is versioned and consumable across **Prediction Engine**, **Dashboard**, **Reports**, and **Digital Twin**.

---

## 10 Engineered Features Specification

### 1. Daily Consumption
- **Description**: Total outward material quantity consumed over the preceding 24-hour window.
- **Formula**: $\sum \text{quantity}_{\text{outward, 24h}}$
- **Unit**: Material Unit (`KG`, `TONS`, `SHEETS`, `UNITS`)
- **Version**: `v1.0.0`
- **Consumers**: Prediction Engine, Dashboard, Reports

### 2. Weekly Consumption
- **Description**: Rolling sum of outward material usage over the past 7 days.
- **Formula**: $\sum \text{quantity}_{\text{outward, 7d}}$
- **Unit**: Material Unit (`KG`, `TONS`, `SHEETS`, `UNITS`)
- **Version**: `v1.0.0`
- **Consumers**: Prediction Engine, Dashboard, Reports

### 3. Monthly Consumption
- **Description**: Rolling sum of outward material usage over the past 30 days.
- **Formula**: $\sum \text{quantity}_{\text{outward, 30d}}$
- **Unit**: Material Unit (`KG`, `TONS`, `SHEETS`, `UNITS`)
- **Version**: `v1.0.0`
- **Consumers**: Prediction Engine, Dashboard, Reports

### 4. Inventory Turnover
- **Description**: Velocity metric measuring how quickly inventory is consumed relative to current stock level.
- **Formula**: $\frac{\text{Monthly Consumption}}{\text{Current Stock Level}}$
- **Category Classification**: `HIGH_TURNOVER` ($\ge 1.5$), `MODERATE_TURNOVER` ($0.5 - 1.49$), `SLOW_MOVING` ($< 0.5$)
- **Unit**: Ratio
- **Version**: `v1.0.0`
- **Consumers**: Reports, Dashboard, Prediction Engine

### 5. Rack Occupancy
- **Description**: Volumetric load percentage per warehouse rack.
- **Formula**: $\left(\frac{\text{Current Occupied Capacity}}{\text{Maximum Rack Capacity}}\right) \times 100\%$
- **Status Flag**: `OVERLOADED` ($\ge 85\%$), `OPTIMAL` ($16\% - 84\%$), `UNDERUTILIZED` ($\le 15\%$)
- **Unit**: Percentage (`%`)
- **Version**: `v1.0.0`
- **Consumers**: Digital Twin, Dashboard, Prediction Engine

### 6. Movement Frequency
- **Description**: Count of transaction dispatches and barcode scan events over 24h, 7d, and 30d windows.
- **Formula**: $\text{Count}(\text{Outward Txs}) + \text{Count}(\text{Scan Events})$
- **Unit**: Event Count
- **Version**: `v1.0.0`
- **Consumers**: Prediction Engine, Dashboard, Digital Twin

### 7. Average Scan Time
- **Description**: Average duration in seconds between consecutive QR barcode scanner events.
- **Formula**: $\text{Mean}(t_{\text{scan, i}} - t_{\text{scan, i-1}})$
- **Efficiency Rating**: `FAST` ($< 90\text{s}$), `MODERATE` ($90\text{s} - 300\text{s}$), `SLOW` ($> 300\text{s}$)
- **Unit**: Seconds / Formatted (`Xm Ys`)
- **Version**: `v1.0.0`
- **Consumers**: Dashboard, Reports

### 8. Material Activity Score
- **Description**: Weighted composite score ($0 - 100$) reflecting transaction frequency, movement volume, and recency.
- **Formula**: $\text{Min}\left(100, \text{Freq}_{30\text{d}} \times 5 + \text{Freq}_{7\text{d}} \times 10 + \text{TurnoverRatio} \times 10\right)$
- **Activity Tier**: `VERY_HIGH` ($\ge 75$), `HIGH` ($50 - 74$), `MODERATE` ($25 - 49$), `DORMANT` ($< 25$)
- **Unit**: Score ($0-100$)
- **Version**: `v1.0.0`
- **Consumers**: Prediction Engine, Dashboard

### 9. Warehouse Utilization
- **Description**: Total active material volume stored across all racks relative to max warehouse capacity.
- **Formula**: $\left(\frac{\sum \text{Current Capacities}}{\sum \text{Max Capacities}}\right) \times 100\%$
- **Utilization Status**: `NEAR_FULL_CAPACITY` ($\ge 85\%$), `BALANCED` ($31\% - 84\%$), `UNDERUTILIZED_SPACE` ($\le 30\%$)
- **Unit**: Percentage (`%`)
- **Version**: `v1.0.0`
- **Consumers**: Digital Twin, Dashboard, Reports

### 10. Threshold Distance
- **Description**: Safety margin between current stock level and safety threshold limit.
- **Formula**: $\text{Current Stock} - \text{Threshold Limit}$
- **Margin Percentage**: $\left(\frac{\text{Threshold Distance}}{\text{Threshold Limit}}\right) \times 100\%$
- **Risk Flag**: `DEPLETED` ($0$), `BELOW_THRESHOLD` ($\le 0$), `NEAR_THRESHOLD` ($\le 20\%$), `SAFE` ($> 20\%$)
- **Unit**: Material Unit & Margin Percentage (`%`)
- **Version**: `v1.0.0`
- **Consumers**: Prediction Engine, Dashboard, Reports

---

## Consuming Module Integration Guide

```javascript
// Programmatic consumption in backend modules (e.g. Prediction Engine or Digital Twin)
import featureEngineeringService from './services/featureEngineeringService.js';

const features = await featureEngineeringService.generateAllFeatures();
console.log('Feature Version:', features.metadata.version);
console.log('Material Features:', features.material_features);
console.log('Rack Features:', features.rack_features);
console.log('Warehouse Utilization:', features.warehouse_features.warehouse_utilization);
```
