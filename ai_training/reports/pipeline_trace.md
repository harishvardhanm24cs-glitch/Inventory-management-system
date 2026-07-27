# RM Monitor - Warehouse Feature Pipeline Execution Trace

**Audit Timestamp**: `2026-07-26T01:39:31.274213`

---

## Feature Transformation Lineage

### Feature: `quantity`

```
1. SQL Query  : SELECT t.quantity FROM transactions t
2. JS Variable: const qty = parseFloat(t.quantity) || 0.0;
3. Generator  : quantity: qty
4. FE Input   : Varying numerical (5.0 to 1000.0) from clean_warehouse_dataset.json
5. FE Transform: Used in calculations (avg_transaction_quantity, norm_quantity), BUT raw 'quantity' property was OMITTED from returned object mapping in runFeaturePipeline() (lines 232-326).
6. Final Export: undefined -> serialized as empty commas ',,' in feature_dataset.csv -> read by Pandas as NaN -> fillna(0.0)
```

### Feature: `current_rack_quantity`

```
1. SQL Query  : SELECT COALESCE(r.quantity, 0) AS current_rack_quantity FROM transactions t LEFT JOIN racks r ON r.material_name = m.material_name
2. JS Variable: const rackQty = parseFloat(t.current_rack_quantity) || 0.0;
3. Generator  : current_rack_quantity: rackQty
4. FE Input   : 0.0 from clean_warehouse_dataset.json
5. FE Transform: const current_rack_quantity = parseFloat(r.current_rack_quantity) || 0.0; used in rack_load_ratio = (current_rack_quantity / rack_cap). Key omitted or mapped as 0.0.
6. Final Export: 0.0
```

### Feature: `occupancy_percentage`

```
1. SQL Query  : SELECT COALESCE(ri.occupancy_percentage, 0.0) AS occupancy_percentage FROM transactions t LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code
2. JS Variable: const occPct = parseFloat(t.occupancy_percentage) > 0 ? parseFloat(t.occupancy_percentage) : calcOccPct;
3. Generator  : occupancy_percentage: occPct
4. FE Input   : 0.0 from clean_warehouse_dataset.json
5. FE Transform: const rack_occupancy_pct = parseFloat(r.occupancy_percentage) || 0.0; mapped as rack_occupancy_pct: 0.0. Raw key 'occupancy_percentage' omitted or mapped to 0.0.
6. Final Export: 0.0
```
