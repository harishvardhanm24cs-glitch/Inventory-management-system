# Phase 9G – Concurrency Test Document

This document analyzes database lock isolation behavior under concurrent scanning requests following the implementation of `FOR UPDATE` row locks and atomic SQL updates.

---

## Concurrency Protection Architecture

### 1. Row Level Locking (`FOR UPDATE`)
```sql
SELECT id, quantity, threshold_limit, unit, material_name 
FROM materials 
WHERE barcode = ? FOR UPDATE;
```
- **Behavior**: MySQL InnoDB locks the targeted `materials` row in exclusive mode.
- **Concurrent Scenario**: When Transaction B attempts to read the same material row while Transaction A is executing, Transaction B is suspended until Transaction A issues `commit()` or `rollback()`.
- **Result**: No stale reads occur.

### 2. Atomic Increment Query
```sql
UPDATE materials 
SET quantity = quantity + ?, 
    batch_number = COALESCE(?, batch_number), 
    material_name = ? 
WHERE id = ?;
```
- **Behavior**: Inventory quantity calculation is evaluated atomically inside the database engine during the write phase.
- **Result**: Completely eliminates read-modify-write lost update race conditions.
