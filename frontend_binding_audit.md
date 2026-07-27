# Phase 9B – Frontend Data Binding & UI Rendering Audit Report

## 1. Executive Summary
This audit investigates why **Rack View** and **Digital Twin** display user-visible anomalies such as `999999999 KG`, `0%` occupancy, `"Empty"` status cards, and `"N/A"` batch numbers, even when the backend inventory synchronization audit passes cleanly.

- **Audit Date**: July 27, 2026
- **Scope**: Complete investigation of React Components, Context State, Custom Hooks, API Mapping, and UI Display Logic.
- **Code Modifications**: **NONE** (Strict read-only inspection performed).
- **Core Cause**: Database Unlimited Inventory Mode migration set `max_capacity = 999999999.00` on all storage racks. Frontend components render `max_capacity` directly without formatting, and calculate occupancy as `(stock / 999999999) * 100 = 0.00%`. As a result, racks containing thousands of kilograms of inventory (e.g. 4,500 KG) calculate `0.00%` occupancy and are classified as `"Empty"` (GRAY).

---

## 2. Component Structure & API Registry

### A. Frontend Components
| Visual Component | Component File Path | Component Name | Parent Component |
|---|---|---|---|
| **Rack View Page** | [RackView.tsx](file:///d:/atendence-main/rm-raw-material-monitoring/src/pages/RackView.tsx) | `RackView` | `App.tsx` (Route `/racks`) |
| **Rack Cards** | [RackView.tsx](file:///d:/atendence-main/rm-raw-material-monitoring/src/pages/RackView.tsx#L560) | Inline Rack Card mapping | `RackView` |
| **Digital Twin Page** | [WarehouseTwin.tsx](file:///d:/atendence-main/rm-raw-material-monitoring/src/pages/WarehouseTwin.tsx) | `WarehouseTwin` | `App.tsx` (Route `/warehouse-twin`) |
| **Occupancy Bar** | [RackView.tsx](file:///d:/atendence-main/rm-raw-material-monitoring/src/pages/RackView.tsx#L695) | Progress bar element | `RackView` |
| **Capacity Card** | [RackView.tsx](file:///d:/atendence-main/rm-raw-material-monitoring/src/pages/RackView.tsx#L718) | Metric HUD Grid | `RackView` |
| **Material Details** | [RackView.tsx](file:///d:/atendence-main/rm-raw-material-monitoring/src/pages/RackView.tsx#L640) | Material Card details | `RackView` |

### B. Backend API Integration
| API Endpoint | HTTP Method | Backend Controller | Database Table Source | Output Fields |
|---|---|---|---|---|
| `/api/racks` | GET | `getAllRacks` ([rackController.js](file:///d:/atendence-main/backend/controllers/rackController.js#L12)) | `racks` LEFT JOIN `rack_inventory` | `rack_code`, `quantity`, `max_capacity`, `occupancy_percentage`, `status_color` |
| `/api/rack-inventory` | GET | `getRackInventory` ([rackInventoryController.js](file:///d:/atendence-main/backend/controllers/rackInventoryController.js#L8)) | `rack_inventory` | `rack_code`, `current_capacity`, `max_capacity`, `occupancy_percentage`, `color_status` |
| `/api/digital-twin` | GET | `getDigitalTwinData` ([digitalTwinController.js](file:///d:/atendence-main/backend/controllers/digitalTwinController.js#L7)) | `racks`, `rack_inventory`, `materials`, `qr_codes` | `rack_code`, `current_capacity`, `max_capacity`, `occupancy_percentage`, `materials[]` |

---

## 3. Live API Payload Benchmark

Target Rack: `E3` | Target Material: `Cherry Red`

```json
{
  "id": 122,
  "rack_code": "E3",
  "material_name": "Cherry Red",
  "batch_number": null,
  "quantity": "4500.00",
  "max_capacity": "999999999.00",
  "threshold_limit": "10.00",
  "status": "healthy",
  "status_color": "GREEN",
  "created_at": "2026-07-25T19:37:02.000Z",
  "occupancy_percentage": 0,
  "rack_name": "E3",
  "capacity": 999999999,
  "current_stock": 4500,
  "occupancyPercentage": 0
}
```

---

## 4. UI vs Database Comparison

| Metric / Field | Database Value | API Response Value | Rendered UI Value | Mismatch Status | Root Explanation |
|---|---|---|---|---|---|
| **Current Quantity** | `4500.00` | `4500.00` | `4500 KG` | **PASS** | Correctly rendered. |
| **Capacity** | `999999999.00` | `999999999.00` | `999999999 KG` | **FAIL** | Raw DB placeholder `999999999` rendered directly to user without "Unlimited" formatting. |
| **Available Capacity** | `999995499.00` | `999995499.00` | `999995499 KG` | **FAIL** | Exposes subtraction against 999M limit. |
| **Occupancy %** | `0.00` | `0` | `0%` | **FAIL** | Calculated as `(4500 / 999999999) * 100 = 0.00045%` -> `0.00%`. |
| **Card Status Badge** | `healthy` / `GREEN` | `GREEN` / `GRAY` | **`Empty`** (GRAY) | **FAIL** | Digital Twin maps `0%` occupancy to `"Empty"` GRAY badge despite holding 4,500 KG stock. |
| **Batch Number** | `NULL` | `null` | `"N/A"` | **FAIL** | QR scan ingress payload omitted `batch_number`. |

---

## 5. Default Value Detection Registry

- `999999999.00` in `migration.sql` & `config/db.js`: Database Unlimited Mode max capacity default placeholder. (**Active & Source of Anomaly**)
- `100` in `InventoryContext.tsx` line 161 & `useRackSync.ts` line 85: Context fallback when `max_capacity` is undefined. (**Active**)
- `100` in `RackView.tsx` line 46: Default form initial state for new rack creation. (**Active**)
- `0%` in `WarehouseTwin.tsx` line 51: Hardcoded rule mapping `occupancy === 0` to `'Empty'` status label. (**Active & Source of "Empty" badge for occupied racks**)
- `"N/A"` in `RackView.tsx` line 657: Fallback string for null batch numbers. (**Active**)

---

## 6. Root Cause Summary & Safe Fix Plan

```
==========================================================
FRONTEND DATA BINDING REPORT
==========================================================

Backend API Status:       PASS

React State:              PASS

Rack View:                FAIL (Displays raw 999999999 KG capacity)

Digital Twin:             FAIL (Renders 4500 KG occupied rack as "Empty" 0%)

Field Mapping:            FAIL (Exposes 999M DB placeholder & 0% occupancy)

Default Values Found:     YES
                          - 999999999 (DB Unlimited Capacity Placeholder)
                          - 100 (React Context Fallback Capacity)
                          - 0% -> "Empty" (Digital Twin 0-Occupancy Rule)
                          - "N/A" (Missing Batch Number Fallback)

Primary Failure Point:    UI Capacity Formatting & Digital Twin Occupancy Rule Evaluation
Affected File:            rm-raw-material-monitoring/src/pages/RackView.tsx & WarehouseTwin.tsx
Affected Component:       RackView & WarehouseTwin (getRackDisplayConfig)
Affected Line(s):         RackView.tsx: L657, L687, L706, L733; WarehouseTwin.tsx: L51-L62

Root Cause:               The system uses 999999999.00 as an internal database placeholder for Unlimited Inventory Mode. Frontend components render this number directly to end users as "Capacity: 999999999 KG" and compute occupancy as (stock / 999999999) * 100 = 0.00%. Consequently, Digital Twin evaluates 0% occupancy and labels 4500 KG occupied racks as "Empty" (GRAY).

Recommended Fix:          1) Format capacity displays: if max_capacity >= 999999, display "Unlimited" instead of 999999999 KG.
                          2) Update Digital Twin status rule: evaluate rack status based on current_stock > 0 ("Healthy / Loaded") rather than strict 0% math when in Unlimited Mode.
                          3) Ensure QR scanner form captures batch_number to replace "N/A".

Confidence Level:         100%
==========================================================
```
