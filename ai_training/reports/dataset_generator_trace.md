# RM Monitor - Dataset Generator Lineage Trace Report

**Audit Timestamp**: `2026-07-26T00:26:16.114574`
**Service**: `datasetGeneratorService.js`

---

## Dataset Generation Step Audit

- **Input Rows**: `65`
- **Output Rows**: `65`
- **Quantity Used Stats**: `Min=0.0, Max=0.0, Mean=0.0, NonZero=0`
- **Transformation Rule**: `isOutward = (t.transaction_type.toLowerCase() === 'outward') -> False for all rows`