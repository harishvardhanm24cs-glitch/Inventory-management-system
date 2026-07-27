# RM Monitor - Warehouse Feature Lineage Audit Report

**Audit Timestamp**: `2026-07-26T01:39:31.274213`
**Audited Features**: `quantity`, `current_rack_quantity`, `occupancy_percentage`

---

## Executive Summary

A comprehensive 6-step data lineage audit was conducted across the MySQL operational database, `datasetGeneratorService.js`, `featureEngineeringPipelineService.js`, and `feature_dataset.csv`.

- **`quantity`**: Database contains varying values (5.0 to 1000.0), but feature became constant 0.0 due to a code omission bug in `featureEngineeringPipelineService.js` (lines 232-326).
- **`current_rack_quantity`**: Constant 0.0 because the SQL query JOINs `racks r` where `r.quantity` = 0 in MySQL.
- **`occupancy_percentage`**: Constant 0.0 because `rack_inventory.occupancy_percentage` = 0.0 in MySQL and default capacity ratio calculates (0 / 1000) * 100 = 0.0.

---

## Audit Summary Table

| Feature | Database Values | Generator Values | Feature Engineering Values | Root Cause Category | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `quantity` | Varying (5.0–1000.0) | Varying (5.0–1000.0) | Constant (0.0) | FE Mapping Key Omission | Add `quantity: r.quantity` to `featureEngineeringPipelineService.js` object mapping |
| `current_rack_quantity` | Constant (0) | Constant (0.0) | Constant (0.0) | DB `racks.quantity` = 0 | Compute rack quantity dynamically from `materials` stock assigned to `rack_code` |
| `occupancy_percentage` | Constant (0.0) | Constant (0.0) | Constant (0.0) | DB `rack_inventory` = 0.0 | Calculate capacity utilization percentage: `(current_stock / rack_capacity) * 100` |