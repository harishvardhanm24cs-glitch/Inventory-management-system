# Warehouse Synchronization Step-by-Step Data Flow Trace

This document details the complete end-to-end execution chain of an inward scan request across the application stack.

```
QR Scan
  ↓
Controller Layer (`scannerController.js`)
  ↓
Service / Utility Layer (`qrHistory.js`, `auditLogger.js`, `alertService.js`)
  ↓
Database Inward Transaction (`transactions` table)
  ↓
Material Inventory Update (`materials` table)
  ↓
Rack Storage Update (`racks` table)
  ↓
MySQL Trigger Sync (`after_rack_update`)
  ↓
Rack Inventory Table Update (`rack_inventory` table)
  ↓
Occupancy Calculation (`(current_capacity / max_capacity) * 100`)
  ↓
API Response Generation (`digitalTwinController.js`, `rackController.js`)
  ↓
Frontend UI Rendering (`WarehouseTwin.tsx`, `RackView.tsx`)
```

---

## Complete Stage Execution Matrix

| Stage # | Stage Name | Target File | Function / Query Name | Execution Status | Stage Details & Findings |
|---|---|---|---|---|---|
| **1** | **QR Scan Ingestion** | [scannerRoutes.js](file:///d:/atendence-main/backend/routes/scannerRoutes.js#L8) | `router.post('/auto-store')` | **YES** | Intercepts HTTP POST request containing `barcode_id`, `material_name`, `quantity`, and `rack_code`. |
| **2** | **Controller Ingress** | [scannerController.js](file:///d:/atendence-main/backend/controllers/scannerController.js#L11) | `autoStore` | **YES** | Validates payload integrity, acquires MySQL connection pool handle, and initiates database transaction (`connection.beginTransaction()`). |
| **3** | **QR Registry Check** | [scannerController.js](file:///d:/atendence-main/backend/controllers/scannerController.js#L73) | `SELECT ... FROM qr_codes FOR UPDATE` | **YES** | Verifies barcode exists and acquires row lock. Returns HTTP 404 if barcode is unregistered. |
| **4** | **Material Stock Update** | [scannerController.js](file:///d:/atendence-main/backend/controllers/scannerController.js#L188) | `UPDATE materials SET quantity = quantity + ?` | **YES** | Increments material total quantity in `materials` table. Creates new material row if barcode has no prior material record. |
| **5** | **Rack Allocation & Update** | [scannerController.js](file:///d:/atendence-main/backend/controllers/scannerController.js#L273) | `UPDATE racks SET quantity = quantity + ?` | **YES** | Allocates or updates designated rack (`E3`). Increments physical rack stock. |
| **6** | **Transaction History Logging** | [scannerController.js](file:///d:/atendence-main/backend/controllers/scannerController.js#L290) | `INSERT INTO transactions` | **YES** | Records transaction record with `material_id`, `transaction_type = 'inward'`, `quantity`, `user_id`, and `created_at`. |
| **7** | **QR Lifecycle Logging** | [scannerController.js](file:///d:/atendence-main/backend/controllers/scannerController.js#L297) & [qrHistory.js](file:///d:/atendence-main/backend/utils/qrHistory.js) | `UPDATE qr_codes` & `logQrHistory` | **YES** | Updates `scanned_at` timestamp in `qr_codes` and inserts audit events (`SCANNED`, `INWARD`) into `qr_history`. (**Note**: Does not set `status = 'used'`). |
| **8** | **MySQL Trigger Auto-Sync** | [db.js](file:///d:/atendence-main/backend/config/db.js#L418) | `after_rack_update` (Trigger) | **YES** | Database trigger fires automatically on `UPDATE racks`, syncing `current_capacity`, `max_capacity`, and `material_name` into `rack_inventory`. |
| **9** | **Occupancy Calculation** | [db.js](file:///d:/atendence-main/backend/config/db.js#L421) | Trigger Expression | **YES** | Formula: `occupancy_percentage = IF(max_capacity > 0, (quantity / max_capacity) * 100, 0.00)`. |
| **10** | **Alert Engine Check** | [alertService.js](file:///d:/atendence-main/backend/services/alertService.js#L11) | `processThresholdCheck` & `processRackOccupancyCheck` | **YES** | Checks material low-stock limits and rack overflow thresholds (>90%). Resolves active alerts or triggers new notifications. |
| **11** | **Audit Logging** | [auditLogger.js](file:///d:/atendence-main/backend/utils/auditLogger.js) | `logAudit` | **YES** | Records user action details in `audit_logs` table. |
| **12** | **Controller Response** | [scannerController.js](file:///d:/atendence-main/backend/controllers/scannerController.js#L382) | `res.status(200).json(...)` | **YES** | Commits transaction (`connection.commit()`) and returns structured JSON response with updated rack payload. |
| **13** | **Digital Twin API Servicing** | [digitalTwinController.js](file:///d:/atendence-main/backend/controllers/digitalTwinController.js#L7) | `getDigitalTwinData` | **YES** | Serves GET `/api/digital-twin`, joining `racks` and `rack_inventory` for rack capacities, and `materials` via `qr_codes` for nested items. |
| **14** | **Rack View API Servicing** | [rackController.js](file:///d:/atendence-main/backend/controllers/rackController.js#L12) | `getAllRacks` | **YES** | Serves GET `/api/racks` and GET `/api/rack-inventory` to display physical rack status colors and occupancy bars. |
| **15** | **Frontend Digital Twin Render** | [WarehouseTwin.tsx](file:///d:/atendence-main/rm-raw-material-monitoring/src/pages/WarehouseTwin.tsx#L588) | `fetchRackInventory` / `fetchWarehouseStats` | **YES** | React component polls or receives `rack-inventory-update` custom event, updating UI gauges, heatmaps, and movement banners. |
| **16** | **Frontend Rack View Render** | [RackView.tsx](file:///d:/atendence-main/rm-raw-material-monitoring/src/pages/RackView.tsx#L50) | `useRackSync` / `RackView` | **YES** | React component updates card borders, flash animations (`inward sync`), progress bars, and critical stock badges. |
