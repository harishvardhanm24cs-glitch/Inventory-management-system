# UI Render Trace Document

This document traces the step-by-step path of data values from database storage through Express controllers, React services, React context, component props, to final DOM text rendering.

```
Database (`racks` & `rack_inventory`)
  ↓
Express Controller (`rackController.js` / `rackInventoryController.js`)
  ↓
JSON API Response (`GET /api/racks`, `GET /api/rack-inventory`)
  ↓
React API Service (`api.ts`)
  ↓
React Context / Custom Hook (`InventoryContext.tsx` / `useRackSync.ts`)
  ↓
Component Props & Array Mapping (`racks.map(rack => ...)`)
  ↓
Final DOM Nodes (`RackView.tsx` / `WarehouseTwin.tsx`)
```

---

## Detailed Data Transformation Journey

### 1. Database Layer (`MySQL`)
- **Table**: `racks`
- **Stored Values for Rack E3**:
  - `rack_code`: `"E3"`
  - `material_name`: `"Cherry Red"`
  - `batch_number`: `NULL`
  - `quantity`: `4500.00`
  - `max_capacity`: `999999999.00` (Set by Unlimited Inventory Mode migration)
  - `status_color`: `"GREEN"`

### 2. Express Controller Layer (`backend/controllers/rackController.js`)
- **Function**: `getAllRacks`
- **Calculations performed**:
  ```javascript
  const qty = parseFloat(rack.quantity) || 0; // 4500
  const maxCap = parseFloat(rack.max_capacity) || 1; // 999999999
  const occPercent = maxCap > 0 ? parseFloat(((qty / maxCap) * 100).toFixed(2)) : 0.00; // 0.00
  ```
- **Controller Output JSON Payload**:
  ```json
  {
    "rack_code": "E3",
    "quantity": "4500.00",
    "max_capacity": "999999999.00",
    "capacity": 999999999,
    "current_stock": 4500,
    "occupancy_percentage": 0,
    "batch_number": null
  }
  ```

### 3. React API Service Layer (`src/services/api.ts`)
- **Function**: `getRacks()` / `getRackInventory()`
- **Action**: Receives HTTP 200 response and returns raw payload object to context/hook without modifying numbers.

### 4. React Context & State Layer (`src/context/InventoryContext.tsx` & `src/hooks/useRackSync.ts`)
- **State Store**: `racks` array state
- **Mapping Code**:
  ```ts
  const capacity = r.capacity !== undefined ? parseFloat(String(r.capacity)) : maxCap; // 999999999
  const current_stock = r.current_stock !== undefined ? parseFloat(String(r.current_stock)) : qty; // 4500
  const occupancy_percentage = capacity > 0 ? parseFloat(((current_stock / capacity) * 100).toFixed(2)) : 0.00; // 0
  ```
- **State Entry for Rack E3**:
  `{ rack_code: "E3", capacity: 999999999, current_stock: 4500, occupancy_percentage: 0, batch_number: null }`

### 5. React Component Rendering Layer (`src/pages/RackView.tsx` & `src/pages/WarehouseTwin.tsx`)

#### A. In `RackView.tsx`:
- **Current Stock**: `<p>Current Stock: {rack.current_stock} KG / Capacity: {rack.capacity} KG</p>`
  - Evaluates to: **`"Current Stock: 4500 KG / Capacity: 999999999 KG"`**
- **Occupancy Gauge**: `<span>{rack.occupancy_percentage}%</span>`
  - Evaluates to: **`"0%"`**
- **Batch Number**: `<p>{rack.batch_number || "N/A"}</p>`
  - Evaluates to: **`"N/A"`**
- **HUD Grid Capacity**: `<p>{rack.capacity} KG</p>`
  - Evaluates to: **`"999999999 KG"`**

#### B. In `WarehouseTwin.tsx`:
- **Occupancy Rule**: `getRackDisplayConfig(rack.occupancy_percentage)`
  - Input: `0`
  - Rule `if (occ === 0)` triggers:
    `{ label: 'Empty', card: 'bg-slate-50/60', dot: 'bg-slate-350', badgeColor: 'text-slate-500' }`
  - Card displays status badge **`"Empty"`** in **`GRAY`** color!

---

## Conclusion & Architectural Summary
The frontend rendering anomalies (`999999999 KG`, `0%` occupancy, `"Empty"` cards, `"N/A"` batch numbers) are **NOT** caused by broken APIs or failed backend database synchronization. They are caused by:
1. **Unformatted rendering of Unlimited Inventory Mode DB placeholders (`999999999.00`)**.
2. **Strict division of stock against 999M limit resulting in 0.00045% -> `0%` occupancy**.
3. **Digital Twin 0-Occupancy rule mapping `0%` to `"Empty"` GRAY card status**.
4. **Scanner payload omitting `batch_number` resulting in NULL DB storage**.
