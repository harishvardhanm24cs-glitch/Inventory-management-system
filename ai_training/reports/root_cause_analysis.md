# RM Monitor - Target Data Loss Root Cause Analysis

**Audit Timestamp**: `2026-07-26T00:26:16.114574`

---

## Identified Root Causes

### [PRIMARY DATA CAUSE] Database Contains No Usage Data
Operational database 'transactions' table contains 65 'Inward' receipts and 0 'Outward' consumption transactions.

### [PRIMARY CODE BUG] Feature Engineering Overwrite / Omission
'featureEngineeringPipelineService.js' omitted the 'quantity_used' property from the returned object mapping, causing CSV export as undefined.
