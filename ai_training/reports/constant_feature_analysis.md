# RM Monitor - Constant Warehouse Feature Diagnostic Report

**Audit Timestamp**: `2026-07-26T01:39:31.274213`

---

## Constant Feature Stage Matrix

| Feature Name | Database Constant? | Generator Constant? | Feature Engineering Constant? | Primary Constant Stage |
| :--- | :---: | :---: | :---: | :--- |
| `quantity` | `NO` | `NO` | `YES` | Feature Engineering Pipeline (Code Omission Bug) |
| `current_rack_quantity` | `YES` | `YES` | `YES` | Database Layer (racks.quantity = 0 in MySQL) |
| `occupancy_percentage` | `YES` | `YES` | `YES` | Database Layer (rack_inventory.occupancy_percentage = 0.0 in MySQL) |

---

## Root Cause Breakdown

### Feature: `quantity`
- **Cause Category**: `Code Omission Bug in Feature Engineering Mapping`
- **Affected File**: `backend/services/featureEngineeringPipelineService.js`
- **Affected Function**: `runFeaturePipeline()` (`Lines 232-326`)
- **Explanation**: The raw 'quantity' column in MySQL transactions contains varying values (5.0 to 1000.0) and is correctly extracted by datasetGeneratorService.js. However, in featureEngineeringPipelineService.js, the 'quantity' key was omitted from the returning object definition in engineeredRows.map(), causing it to export as undefined / empty commas ',,' to feature_dataset.csv, which Pandas loaded as NaN and filled with 0.0.

### Feature: `current_rack_quantity`
- **Cause Category**: `Unpopulated Source Database Table & JOIN Target`
- **Affected File**: `MySQL Database table 'racks' & datasetGeneratorService.js`
- **Affected Function**: `extractDatasetRows() SQL Query` (`Line 102 in datasetGeneratorService.js`)
- **Explanation**: In MySQL, the 'racks' table contains quantity = 0 for all rack rows because material stock movements update the 'materials' table, not the 'racks' table. The SQL query JOINs racks r ON r.material_name = m.material_name and selects COALESCE(r.quantity, 0), which returns 0 for all rows.

### Feature: `occupancy_percentage`
- **Cause Category**: `Unpopulated Telemetry Table & Default Zero Fallback`
- **Affected File**: `MySQL Database table 'rack_inventory' & datasetGeneratorService.js`
- **Affected Function**: `extractDatasetRows() SQL Query & JS calculation` (`Lines 104, 143-145 in datasetGeneratorService.js`)
- **Explanation**: In MySQL, 'rack_inventory.occupancy_percentage' contains 0.0 for all records because active rack IoT telemetry updates have not been written. In datasetGeneratorService.js, calcOccPct computes (current_rack_quantity / max_capacity) * 100 = (0 / 1000) * 100 = 0.0, evaluating to 0.0 across all dataset rows.
