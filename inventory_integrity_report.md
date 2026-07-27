# Inventory Integrity Analysis Report

## 1. Executive Summary
During repeated scanning operations, raw material stock disappears because the backend duplicate scan handler (**`scannerController.js` lines 138–155**) catches rapid scans within 5 seconds, issues an explicit database `rollback()`, but returns an **HTTP 200 OK** status to the caller with a body `{ success: true, status: 'duplicate' }`.

Because the caller/frontend receives HTTP 200 OK, the operator registers the scan as successful, but the inventory increment (+100 KG per scan) is discarded by the database rollback.

---

## 2. Identified Failure Modes & Silent Rollbacks

### Failure Mode 1: Silent DB Rollback on Duplicate Lock Returning HTTP 200 OK
- **Location**: [scannerController.js](file:///d:/atendence-main/backend/controllers/scannerController.js#L148-L155)
- **Code Snippet**:
  ```javascript
  if (recentTx.length > 0) {
    console.warn(`[Scanner Sync] Duplicate scan blocked for barcode: ${barcode_id}`);
    await connection.rollback();
    return res.status(200).json({
      success: true,
      status: 'duplicate',
      rack_updated: false,
      message: 'Duplicate scan ignored (already registered in the last 5 seconds)'
    });
  }
  ```
- **Impact**: In a 6-scan rapid sequence, 4 scans fell inside the 5-second interval. All 4 returned **HTTP 200 OK**, but their database updates were rollbacked. **Result: 400 KG lost from inventory stock.**

### Failure Mode 2: Un-locked Read Race Condition on `materials` Table
- **Location**: [scannerController.js](file:///d:/atendence-main/backend/controllers/scannerController.js#L120)
- **Code Snippet**:
  ```javascript
  const [existingMaterials] = await connection.query(
    'SELECT id, quantity, threshold_limit, unit, material_name FROM materials WHERE barcode = ?',
    [barcode_id]
  );
  ```
- **Impact**: Unlike `qr_codes` which uses `FOR UPDATE`, `materials` reads `quantity` without a row lock. Concurrent or near-simultaneous scans read identical `currentQty` and calculate `newQty = currentQty + scannedQty`, causing the second transaction to overwrite the first transaction's increment.

---

## 3. Silent Failure Audit Checklist

| Silent Failure Type | Detected? | Location / Explanation |
|---|---|---|
| **SQL UPDATE affecting zero rows** | NO | UPDATE statements match primary keys. |
| **Duplicate Scans Ignored Silently** | **YES (ROOT CAUSE)** | Scans within 5s trigger DB rollback but return HTTP 200 OK. |
| **Exceptions Swallowed** | NO | Errors caught in try/catch and passed to `next(error)`. |
| **Missing `await`** | NO | Async database queries use `await`. |
| **Silent Transaction Rollback** | **YES** | Duplicate handler explicitly executes `connection.rollback()`. |
| **Parallel Update Race Condition** | **YES** | `materials` lookup lacks `FOR UPDATE` row lock. |
| **Inventory Overwritten** | **YES** | Absolute value `UPDATE materials SET quantity = newQty` overwrites concurrent writes instead of atomic `quantity = quantity + ?`. |
