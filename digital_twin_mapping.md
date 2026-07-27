# Digital Twin Field Mapping Audit Document

This document details how backend API schemas map to React state and visual cards inside `WarehouseTwin.tsx`.

---

## Detailed Variable & Binding Trace Table

| Visual UI Feature | React Component Expression | Context / Hook State | API Payload Property | Database Source Column | Rendered Value (Rack E3) | Audit Status |
|---|---|---|---|---|---|---|
| **Rack Header Code** | `rack.rack_code` | `rack.rack_code` | `rack_code` | `racks.rack_code` | `E3` | **PASS** |
| **Current Capacity** | `rack.current_capacity` | `rack.current_capacity` | `current_capacity` | `racks.quantity` | `4500` | **PASS** |
| **Max Capacity** | `rack.max_capacity` | `rack.max_capacity` | `max_capacity` | `racks.max_capacity` | `999999999` | **FAIL** (Exposes raw 999M DB placeholder) |
| **Occupancy %** | `rack.occupancy_percentage` | `rack.occupancy_percentage` | `occupancy_percentage` | `rack_inventory.occupancy_percentage` | `0` (`0.00%`) | **FAIL** (Calculated against 999M limit) |
| **Status Badge Label** | `getRackDisplayConfig(occ).label` | Computed in component | Derived | Derived | **`"Empty"`** | **FAIL** (0% occupancy forces `"Empty"` badge for 4,500 KG loaded rack) |
| **Badge Color Code** | `getRackDisplayConfig(occ).badge` | Computed in component | `status_color` / `color_status` | Derived | **`GRAY`** (`text-slate-500`) | **FAIL** (Rendered as Gray empty card) |
| **Nested Material Count** | `rack.material_count` | `rack.materials.length` | `materials.length` | `materials` JOIN `qr_codes` | `0` | **FAIL** (Joined on `qr_codes.status = 'used'`) |
| **Nested Materials List** | `rack.materials.map(...)` | `rack.materials` | `materials[]` | `materials` JOIN `qr_codes` | `[]` (Empty) | **FAIL** (`autoStore` left QR status as `'unused'`) |

---

## Line-by-Line Code Reference in `WarehouseTwin.tsx`

1. **Line 51-62**: `getRackDisplayConfig` function:
   ```ts
   if (occ === 0) {
     return {
       ...
       label: 'Empty',
       badgeColor: 'text-slate-500',
     };
   }
   ```
   *Line where 0% occupancy triggers the `"Empty"` label and GRAY styling.*

2. **Line 255**: `const max = parseFloat(String(rack.max_capacity)) || 0;` — Reads `999999999`.

3. **Line 260**: Data integrity warning logged to browser console:
   ```ts
   `Reported=${occ}%, Computed from DB (${current}/${max} KG)=${computedOcc}%`
   ```

4. **Line 591**: `const res = await api.getRackInventory();` — Fetches data from `/api/rack-inventory`.
