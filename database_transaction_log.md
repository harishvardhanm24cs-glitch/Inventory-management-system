# Database Transaction Log Document

This document records the exact state of `materials.quantity`, `racks.quantity`, and `qr_codes.status` before and after each scan during the 6-scan empirical audit.

---

## Database State Trace Matrix (6 Inward Scans × 100 KG)

Baseline Initial Stock: `materials.quantity = 4500.00 KG` | `racks.quantity = 4500.00 KG` (Rack `E3`) | Target Material: `Cherry Red` (`CR002`)

| Scan # | Transaction Action | `materials.quantity` BEFORE | `materials.quantity` AFTER | `racks.quantity` BEFORE | `racks.quantity` AFTER | `qr_codes.status` BEFORE | `qr_codes.status` AFTER | DB Transaction Outcome |
|---|---|---|---|---|---|---|---|---|
| **Scan 1** | Inward (+100 KG) | `4500.00 KG` | `4600.00 KG` | `4500.00 KG` | `4600.00 KG` | `used` | `used` | **COMMITTED** |
| **Scan 2** | Inward (+100 KG) | `4600.00 KG` | `4600.00 KG` | `4600.00 KG` | `4600.00 KG` | `used` | `used` | **ROLLBACKED** (Duplicate Lock) |
| **Scan 3** | Inward (+100 KG) | `4600.00 KG` | `4600.00 KG` | `4600.00 KG` | `4600.00 KG` | `used` | `used` | **ROLLBACKED** (Duplicate Lock) |
| **Scan 4** | Inward (+100 KG) | `4600.00 KG` | `4600.00 KG` | `4600.00 KG` | `4600.00 KG` | `used` | `used` | **ROLLBACKED** (Duplicate Lock) |
| **Scan 5** | Inward (+100 KG) | `4600.00 KG` | `4700.00 KG` | `4600.00 KG` | `4700.00 KG` | `used` | `used` | **COMMITTED** |
| **Scan 6** | Inward (+100 KG) | `4700.00 KG` | `4700.00 KG` | `4700.00 KG` | `4700.00 KG` | `used` | `used` | **ROLLBACKED** (Duplicate Lock) |

---

## Summary Statistics
- **Total Inward Requests Submitted**: 6
- **Transactions Committed**: 2 (+200 KG total)
- **Transactions Rollbacked**: 4 (0 KG updated)
- **Expected Final Quantity**: `5100.00 KG`
- **Actual Final Quantity**: `4700.00 KG`
- **Disappeared Inventory**: **`400.00 KG`**
