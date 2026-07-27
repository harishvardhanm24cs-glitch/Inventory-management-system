# Scan Transaction Trace Document

## 1. Executive Summary
This document traces the complete execution sequence of inward scan transactions from initial barcode input to API response. Empirical investigation confirmed that inventory stock loss occurs due to a silent rollback design pattern in duplicate scan handling combined with un-locked database reads.

- **Trace Date**: July 28, 2026
- **Test Baseline**: Initial Stock = 4500.00 KG | 6 Scans × 100 KG | Expected = 5100.00 KG | Actual = 4700.00 KG | **Lost Inventory = 400.00 KG**
- **Code Modifications**: **NONE** (Strict read-only inspection performed).

---

## 2. Step-by-Step Execution Sequence Trace

```
STEP 1: QR Scanned
  └─ Barcode: CR002 (Cherry Red)
  ↓
STEP 2: API Endpoint Called
  └─ HTTP Method: POST
  └─ URL: http://localhost:5000/api/scanner/auto-store
  └─ Controller: autoStore
  └─ File: backend/controllers/scannerController.js
  └─ Line Number: 11
  ↓
STEP 3: QR Code Validation & Lookup
  └─ Query: SELECT ... FROM qr_codes WHERE barcode_id = ? FOR UPDATE (Line 43)
  └─ Result: Found registered QR code record (status: 'used')
  ↓
STEP 4: Database Transaction Begins
  └─ Command: await connection.beginTransaction() (Line 37)
  └─ Scope: Express MySQL Pool Connection
  ↓
STEP 5: Read Material Inventory (Un-locked Read!)
  └─ Query: SELECT id, quantity, threshold_limit, unit FROM materials WHERE barcode = ? (Line 120)
  └─ Material ID: 297
  └─ Previous Quantity: 4500.00 KG
  └─ Missing Clause: FOR UPDATE (Subject to race conditions under concurrent scans)
  ↓
STEP 6: Duplicate Scan Lock Check (Primary Failure Point!)
  └─ Query: SELECT id FROM transactions WHERE material_id = ? AND transaction_type = 'inward' AND created_at >= NOW() - INTERVAL 5 SECOND (Line 139)
  └─ IF FOUND (Scans within 5 seconds):
      └─ Action: await connection.rollback() (Line 148)
      └─ HTTP Response: 200 OK with { success: true, status: 'duplicate', rack_updated: false }
      └─ Effect: User/Caller sees HTTP 200 OK, but inventory update (+100 KG) is ROLLBACKED!
  ↓
STEP 7: Calculate New Quantity & UPDATE materials (If not duplicate)
  └─ Old Quantity: 4500.00 KG
  └─ Incoming Quantity: 100.00 KG
  └─ New Quantity: 4600.00 KG
  └─ Query: UPDATE materials SET quantity = ?, batch_number = ? WHERE id = ? (Line 159)
  └─ Rows Affected: 1
  ↓
STEP 8: UPDATE racks
  └─ Query: UPDATE racks SET material_name = ?, batch_number = ?, quantity = ? WHERE rack_code = ? (Line 243)
  └─ Rows Affected: 1
  └─ Old Rack Qty: 4500.00 KG
  └─ New Rack Qty: 4600.00 KG
  └─ Trigger: after_rack_update updates rack_inventory automatically
  ↓
STEP 9: UPDATE qr_codes & Log QR History
  └─ Query: UPDATE qr_codes SET status = 'used', rack_code = ? WHERE barcode_id = ? (Line 267)
  └─ History: logQrHistory(connection, { action: 'INWARD', rack_code: 'E3' }) (Line 277)
  └─ Old Status: 'used' -> New Status: 'used'
  ↓
STEP 10: Commit & Audit Log
  └─ Command: await connection.commit() (Line 320)
  └─ Audit: logAudit({ action_type: 'Inward Scan', action_details: 'Inwarded 100 KG...' }) (Line 328)
  └─ File: backend/utils/auditLogger.js
  └─ Function: logAudit
```
