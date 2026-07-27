# RM Monitor - End-to-End Target Data Lineage Audit Report

**Target Column**: `quantity_used`
**Audit Timestamp**: `2026-07-26T00:26:16.114574`

---

## Executive Summary

Target data loss occurs via a **dual-root cause**: (1) The database contains only Inward transactions (0 Outward consumption records), causing Dataset Generator to produce 0.0 for all rows; and (2) Feature Engineering Pipeline omits the `quantity_used` key from mapped output objects, serializing empty strings to CSV.

---

## Code Path Lineage Summary

| Stage | Component | Status | Finding |
| :--- | :--- | :---: | :--- |
| 1. Database Layer (MySQL) | `transactions table` | `VALID INPUT` | 65 operational transaction records exist, but 100% are 'Inward' transactions. |
| 2. Dataset Generator | `datasetGeneratorService.js` | `STAGE 1 TARGET LOSS` | qtyUsed = isOutward ? t.quantity : 0.0 evaluates to 0.0 for all 65 rows due to lack of outward records. |
| 3. Data Cleaning Pipeline | `dataCleaningPipelineService.js` | `PASS THROUGH` | Preserves 0.0 values in clean_warehouse_dataset.json. |
| 4. Feature Engineering Pipeline | `featureEngineeringPipelineService.js` | `STAGE 2 TARGET LOSS (CRITICAL BUG)` | completely omits quantity_used key from returning object mapping, leaving property undefined. |
| 5. CSV Export | `feature_dataset.csv` | `SERIALIZATION ERROR` | convertToCSV() serializes undefined as empty commas ',,'. |
| 6. Model Training Pipeline | `ai_training/train.py & preprocessing.py` | `MODEL DEGENERACY` | Pandas reads empty string as NaN -> fillna(0.0) -> constant 0.0 target -> zero feature importances. |