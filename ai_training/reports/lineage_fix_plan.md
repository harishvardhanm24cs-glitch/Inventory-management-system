# RM Monitor - Target Lineage Remediation Implementation Plan

**Audit Timestamp**: `2026-07-26T00:26:16.114574`
**Risk Level**: `LOW (Non-breaking additive fixes)`

---

## Safe Implementation Plan

### Step 1: backend/services/featureEngineeringPipelineService.js
- **Function**: `runFeaturePipeline()`
- **Risk Level**: `LOW`
- **Impact**: Restores target column in engineered dataset CSV export.
- **Recommended Change**: `Add 'quantity_used: r.quantity_used ?? (String(r.transaction_type).toLowerCase() === "outward" ? parseFloat(r.quantity) || 0.0 : (r.daily_consumption || 0.0))' to engineeredRows object mapping.`

### Step 2: backend/services/datasetGeneratorService.js
- **Function**: `extractDatasetRows()`
- **Risk Level**: `LOW`
- **Impact**: Provides non-zero material usage target values for model training.
- **Recommended Change**: `Enhance fallback dataset generator / seed sample outward consumption transactions so dataset has non-zero quantity_used values.`
