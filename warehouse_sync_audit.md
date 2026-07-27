# End-to-End Warehouse Synchronization Audit Report

## 1. Executive Summary
An exhaustive end-to-end audit was conducted on the warehouse inventory synchronization pipeline, spanning from QR scan ingestion through database transactions, material stock updates, rack capacity calculations, MySQL sync triggers, Digital Twin APIs, and frontend visual rendering.

- **Audit Date**: July 27, 2026
- **Target Material**: `Cherry Red` (Barcode: `CR002`, Material ID: `297`)
- **Target Storage Rack**: `E3`
- **Audit Sequence**: 2x Consecutive Inward Scans of `100.00 KG` each (Total expected addition = `200.00 KG`)
- **Overall Synchronization Result**: **PASS (Capacity Sync)** / **WARNING (Nested QR Status Sync)**

---

## 2. System Preparation & Component Inspection

| Service / Layer | File Path | Function Name | Role / Action |
|---|---|---|---|
| **QR Scan Handler** | [scannerController.js](file:///d:/atendence-main/backend/controllers/scannerController.js#L11) | `autoStore` | Handles POST `/api/scanner/auto-store` inward scan payload validation and transactional database operations |
| **Inventory Update Service** | [scannerController.js](file:///d:/atendence-main/backend/controllers/scannerController.js#L188) | `autoStore` | Updates `materials.quantity` by adding inward scan amount |
| **Transaction Service** | [scannerController.js](file:///d:/atendence-main/backend/controllers/scannerController.js#L290) | `autoStore` | Inserts transaction record into `transactions` table (`transaction_type = 'inward'`) |
| **Material Update Service** | [materialController.js](file:///d:/atendence-main/backend/controllers/materialController.js#L209) | `updateStock` | Alternative endpoint handler for direct stock modifications |
| **Rack Update Service** | [scannerController.js](file:///d:/atendence-main/backend/controllers/scannerController.js#L273) | `autoStore` | Updates `racks.quantity` and `material_name` for allocated rack |
| **Sync Trigger Service** | [db.js](file:///d:/atendence-main/backend/config/db.js#L418) | `after_rack_update` (MySQL Trigger) | Automatically syncs `racks` changes to `rack_inventory` table |
| **Digital Twin API** | [digitalTwinController.js](file:///d:/atendence-main/backend/controllers/digitalTwinController.js#L7) | `getDigitalTwinData` | Serves GET `/api/digital-twin` returning rack capacities and nested materials |
| **Rack View API** | [rackController.js](file:///d:/atendence-main/backend/controllers/rackController.js#L12) & [rackInventoryController.js](file:///d:/atendence-main/backend/controllers/rackInventoryController.js#L8) | `getAllRacks` / `getRackInventory` | Serves GET `/api/racks` and GET `/api/rack-inventory` to frontend grid layout |
| **Frontend Digital Twin** | [WarehouseTwin.tsx](file:///d:/atendence-main/rm-raw-material-monitoring/src/pages/WarehouseTwin.tsx#L457) | `WarehouseTwin` | Renders dynamic warehouse map, capacity gauges, and real-time movement feeds |
| **Frontend Rack View** | [RackView.tsx](file:///d:/atendence-main/rm-raw-material-monitoring/src/pages/RackView.tsx#L14) | `RackView` | Renders physical rack grid, stock fill percentages, and alert beacons |

---

## 3. Controlled Audit Test Execution

### Initial State
- **Material**: `Cherry Red` (Barcode `CR002`, ID `297`)
- **Initial Material Stock**: `4500.00 KG`
- **Rack Code**: `E3`
- **Initial Rack Stock (`racks`)**: `4500.00 KG`
- **Initial Rack Inventory (`rack_inventory`)**: `4500.00 KG`
- **Rack Max Capacity**: `999999999.00 KG`
- **Stored Occupancy Percentage**: `0.00%`

### Inward Scan 1 (+100.00 KG)
- **Request**: POST `/api/scanner/auto-store` `{ barcode_id: "CR002", material_name: "Cherry Red", quantity: 100.00, rack_code: "E3" }`
- **HTTP Status**: `200 OK`
- **Material Stock After**: `4600.00 KG` (Difference = `+100.00 KG`, Expected = `4600.00 KG`, PASS)
- **Rack Stock (`racks`) After**: `4600.00 KG` (Difference = `+100.00 KG`, Expected = `4600.00 KG`, PASS)
- **Rack Stock (`rack_inventory`) After**: `4600.00 KG` (PASS)
- **Transaction ID Generated**: `303` (Type: `inward`, Quantity: `100.00`, PASS)

### Inward Scan 2 (+100.00 KG)
- **Request**: POST `/api/scanner/auto-store` `{ barcode_id: "CR002", material_name: "Cherry Red", quantity: 100.00, rack_code: "E3" }`
- **HTTP Status**: `200 OK`
- **Material Stock After**: `4700.00 KG` (Difference = `+100.00 KG`, Expected = `4700.00 KG`, PASS)
- **Rack Stock (`racks`) After**: `4700.00 KG` (Difference = `+100.00 KG`, Expected = `4700.00 KG`, PASS)
- **Rack Stock (`rack_inventory`) After**: `4700.00 KG` (PASS)
- **Transaction ID Generated**: `304` (Type: `inward`, Quantity: `100.00`, PASS)
- **Total Expected Stock**: `4700.00 KG` (Initial 4500 KG + 200 KG)

---

## 4. Stage-by-Stage Verification Table

### A. Transactions Table Inspection
| Parameter | Value | Status |
|---|---|---|
| **Transaction IDs** | `303`, `304` | PASS |
| **Material ID** | `297` | PASS |
| **Target Rack** | `E3` | PASS |
| **Quantities** | `100.00 KG`, `100.00 KG` | PASS |
| **Transaction Type** | `inward` | PASS |
| **Timestamps** | Valid ISO Timestamps | PASS |

### B. Materials Table Inspection
| Metric | Value | Status |
|---|---|---|
| **Material Name** | `Cherry Red` | PASS |
| **Current Stock Before Scan** | `4500.00 KG` | PASS |
| **Current Stock After Scan 1** | `4600.00 KG` | PASS |
| **Current Stock After Scan 2** | `4700.00 KG` | PASS |
| **Total Difference** | `+200.00 KG` | PASS |
| **Expected Stock** | `4700.00 KG` | PASS |
| **Sync Result** | Matched | **PASS** |

### C. Rack Table Inspection
| Metric | Value | Status |
|---|---|---|
| **Rack Code** | `E3` | PASS |
| **Rack Capacity (`max_capacity`)** | `999999999.00 KG` | PASS |
| **Current Rack Qty Before** | `4500.00 KG` | PASS |
| **Current Rack Qty After Scan 1** | `4600.00 KG` | PASS |
| **Current Rack Qty After Scan 2** | `4700.00 KG` | PASS |
| **Expected Quantity** | `4700.00 KG` | PASS |
| **Difference** | `+200.00 KG` | PASS |
| **Sync Result** | Matched | **PASS** |

### D. Occupancy Metric Inspection
| Metric | Value | Status |
|---|---|---|
| **Stored Occupancy** | `0.00%` | PASS |
| **Calculated Occupancy** | `(4700.00 / 999999999.00) * 100` = `0.00047%` -> `0.00%` | PASS |
| **Expected Occupancy** | `0.00%` | PASS |
| **Formula Used** | `Occupancy % = IF(max_capacity > 0, (current_capacity / max_capacity) * 100, 0.00)` | PASS |
| **Sync Result** | Matched | **PASS** |

---

## 5. Digital Twin & Rack View Verification

### Digital Twin Verification (`GET /api/digital-twin`)
- **Database Quantity (`racks.quantity`)**: `4700.00 KG`
- **API Response Payload (`current_capacity`)**: `4700`
- **Frontend Display Value**: `4700 KG`
- **Capacity Difference**: `0 KG` (**PASS**)
- **Nested Materials Array**: `[]` (**WARNING / DISCREPANCY**)
- **Database Field Read**: Reads `racks.quantity` for total capacity, and joins `materials` via `qr_codes.status = 'used'`.

### Rack View Verification (`GET /api/racks` & `GET /api/rack-inventory`)
- **Database Quantity (`racks.quantity`)**: `4700.00 KG`
- **API Response Payload (`current_stock`)**: `4700`
- **Frontend Display Value**: `4700 KG`
- **Difference**: `0 KG` (**PASS**)
- **Database Field Read**: `racks.quantity` (in `getAllRacks`) and `rack_inventory.current_capacity` (in `getRackInventory`).

---

## 6. Root Cause Analysis

| Stage | Status | Rationale |
|---|---|---|
| **QR Scanner** | **WARNING** | Scans process stock correctly, but `autoStore` in `scannerController.js` does NOT set `qr_codes.status = 'used'` or `qr_codes.rack_code = targetRackCode`. |
| **Transaction Insert** | **PASS** | `INSERT INTO transactions` executes atomically within transaction lock and records exact material ID and inward type. |
| **Material Update** | **PASS** | `UPDATE materials` correctly increments total inventory stock without rounding errors. |
| **Rack Update** | **PASS** | `UPDATE racks` updates physical rack quantity and material assignment accurately. |
| **Occupancy Calculation** | **PASS** | MySQL AFTER trigger `after_rack_update` recalculates `occupancy_percentage` dynamically. |
| **API Layer** | **WARNING** | Digital Twin query uses `JOIN qr_codes q ON m.barcode = q.barcode_id WHERE q.status = 'used'`. Because `autoStore` leaves `q.status = 'unused'`, nested materials list returns empty. |
| **Frontend Rendering** | **PASS** | Both `WarehouseTwin.tsx` and `RackView.tsx` render API values, capacity gauges, and status badges accurately. |

---

## 7. Safe Fix Recommendation Plan (NO CODE MODIFIED)

> [!IMPORTANT]
> No source code was modified during this audit. The recommendations below outline safe, targeted changes for future implementation.

### Recommended Fixes:
1. **`backend/controllers/scannerController.js` (`autoStore` function)**:
   - Add update statement to set `qr_codes.status = 'used'` and `qr_codes.rack_code = targetRackCode` upon successful inward scan.
2. **`backend/controllers/digitalTwinController.js` (`getDigitalTwinData` function)**:
   - Adjust materials lookup query to join materials assigned to racks regardless of QR flag, or accept both `'used'` and scanned status codes.

- **Files Requiring Changes**:
  - `d:/atendence-main/backend/controllers/scannerController.js`
  - `d:/atendence-main/backend/controllers/digitalTwinController.js`
- **Functions Requiring Changes**:
  - `autoStore`
  - `getDigitalTwinData`
- **Database Tables Involved**: `qr_codes`, `materials`, `racks`, `rack_inventory`
- **Estimated Impact**: Low / Non-breaking. Restores complete nested material visibility in Digital Twin view.
- **Risk Level**: Low.
