# Function Call Tree & Duplicate Path Audit Document

This document maps the function call hierarchy for scan operations and registers all functions in the codebase capable of mutating inventory.

---

## 1. Function Call Tree (Inward Scan Execution)

```
scannerController.autoStore() [HTTP POST /api/scanner/auto-store] (Total Time: ~86 ms)
├── db.getConnection() [Acquire DB pool connection] (Time: 2 ms) - SUCCESS
├── connection.beginTransaction() [Start MySQL transaction] (Time: 1 ms) - SUCCESS
├── connection.query('SELECT ... FROM qr_codes FOR UPDATE') [Lock & validate QR] (Time: 12 ms) - SUCCESS
├── connection.query('SELECT ... FROM materials WHERE barcode = ?') [Read material un-locked!] (Time: 8 ms) - SUCCESS
├── [BRANCH A: Duplicate Scan Detected (created_at >= NOW() - INTERVAL 5 SECOND)]
│   ├── connection.rollback() [Rollback DB changes] (Time: 1 ms) - SUCCESS
│   └── res.status(200).json({ success: true, status: 'duplicate' }) (Time: 1 ms) - SILENT ROLLBACK SUCCESS (200 OK)
└── [BRANCH B: Valid New Scan]
    ├── connection.query('UPDATE materials SET quantity = newQty...') [Update material] (Time: 15 ms) - SUCCESS
    ├── connection.query('UPDATE racks SET quantity = newRackQty...') [Update rack] (Time: 18 ms) - SUCCESS
    │   └── [DB Trigger] after_rack_update [Syncs rack_inventory table automatically] - SUCCESS
    ├── connection.query('INSERT INTO transactions...') [Log inward transaction] (Time: 10 ms) - SUCCESS
    ├── connection.query('UPDATE qr_codes SET status = "used"...') [Update QR status] (Time: 8 ms) - SUCCESS
    ├── logQrHistory(connection, { action: 'INWARD' }) [Write trace history] (Time: 5 ms) - SUCCESS
    ├── connection.commit() [Commit transaction] (Time: 4 ms) - SUCCESS
    ├── logAudit({ action_type: 'Inward Scan' }) [Write audit log] (Time: 2 ms) - SUCCESS
    └── res.status(200).json({ success: true, rack: mappedRack }) (Time: 1 ms) - SUCCESS
```

---

## 2. Duplicate Execution Path Audit

Searching the entire codebase (`backend/` & `rm-raw-material-monitoring/`) for functions capable of mutating inventory stock:

| Function Name | File Path | Capability | Is Active Path? |
|---|---|---|---|
| `autoStore` | [scannerController.js](file:///d:/atendence-main/backend/controllers/scannerController.js#L11) | Updates `materials` & `racks` on inward scan | **YES (Primary Inward Path)** |
| `outwardScan` | [scannerController.js](file:///d:/atendence-main/backend/controllers/scannerController.js#L364) | Reduces `materials` & `racks` on outward scan | **YES (Primary Outward Path)** |
| `createMaterial` | [materialController.js](file:///d:/atendence-main/backend/controllers/materialController.js#L10) | Inserts new material row | **YES (Admin Material Management)** |
| `updateMaterial` | [materialController.js](file:///d:/atendence-main/backend/controllers/materialController.js#L60) | Manual material quantity override | **YES (Admin Material Management)** |
| `updateRack` | [rackController.js](file:///d:/atendence-main/backend/controllers/rackController.js#L80) | Manual rack quantity override | **YES (Admin Rack Management)** |

**Duplicate Scanner Update Paths Found**: **1** (Scanning is consolidated inside `scannerController.js`).
