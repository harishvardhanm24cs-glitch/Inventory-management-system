# Rack View Field Mapping Audit Document

This document traces how database columns map through APIs, React context, and UI bindings inside `RackView.tsx`.

---

## Detailed Variable & Binding Trace Table

| UI Display Element | React Component Expression | Context / State Variable | API Property | Database Column | Rendered Value (Rack E3) | Audit Result |
|---|---|---|---|---|---|---|
| **Rack Name / Code** | `{rack.rack_name \|\| rack.rack_code}` | `rack.rack_code` | `rack_code` | `racks.rack_code` | `E3` | **PASS** |
| **Material Name** | `{rack.material_name \|\| "Available Space"}` | `rack.material_name` | `material_name` | `racks.material_name` | `Cherry Red` | **PASS** |
| **Batch Number** | `{rack.batch_number \|\| "N/A"}` | `rack.batch_number` | `batch_number` | `racks.batch_number` | `N/A` | **FAIL** (Null in DB, fallback renders `"N/A"`) |
| **Safety Limit** | `{limitVal} KG` | `rack.threshold_limit` | `threshold_limit` | `racks.threshold_limit` | `10.00 KG` | **PASS** |
| **Current Stock** | `{rack.current_stock ?? qtyVal} KG` | `rack.current_stock` | `current_stock` | `racks.quantity` | `4500 KG` | **PASS** |
| **Max Capacity** | `{rack.capacity ?? capVal} KG` | `rack.capacity` | `max_capacity` | `racks.max_capacity` | `999999999 KG` | **FAIL** (Unformatted DB infinity placeholder) |
| **Available Capacity** | `{rack.capacity - rack.current_stock} KG` | Computed in component | Computed in API | Derived | `999995499 KG` | **FAIL** (Exposes 999M subtraction) |
| **Occupancy %** | `{rack.occupancy_percentage}%` | `rack.occupancy_percentage` | `occupancy_percentage` | `rack_inventory.occupancy_percentage` | `0%` | **FAIL** (Calculated as `4500 / 999999999 * 100 = 0%`) |
| **Progress Fill Bar** | `getProgressBarFill(rack.occupancy_percentage)` | `occupancy_percentage` | `occupancy_percentage` | Derived | `bg-emerald-500` (0% fill width) | **FAIL** (Bar fill width is 0% for 4500 KG stock) |
| **Status Badge** | `vConfig.label` | Evaluated by `rackVisualizationRules` | `status_color` | `racks.status_color` | `Healthy Inventory` | **PASS** |

---

## Line-by-Line Code Reference in `RackView.tsx`

1. **Line 607**: `rack.rack_name || rack.rack_code`
2. **Line 646**: `rack.material_name || "Available Space"`
3. **Line 657**: `rack.batch_number || "N/A"` — *Line where "N/A" is produced when DB value is NULL*.
4. **Line 663**: `{limitVal} KG`
5. **Line 687**: `{rack.occupancy_percentage}%` — *Line where "0%" is rendered*.
6. **Line 706**: `Current Stock: ${rack.current_stock} KG / Capacity: ${rack.capacity} KG` — *Line where "Capacity: 999999999 KG" is rendered*.
7. **Line 733**: `{rack.capacity} KG` — *Line where "999999999 KG" is rendered in HUD Grid*.
