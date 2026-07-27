# Inventory Difference Report

This report compares expected vs actual inventory stock levels across 6 sequential inward scans (100 KG each) on Cherry Red (`CR002`).

---

## 1. Scan-by-Scan Difference Matrix

Baseline Initial Stock: **`4500.00 KG`** | Individual Scan Quantity: **`100.00 KG`**

| Scan # | Submitted Quantity | Cumulative Expected Stock | Actual Recorded Stock | Stock Difference (Lost Stock) | HTTP Status | Response Status | DB Transaction Result |
|---|---|---|---|---|---|---|---|
| **Scan 1** | 100.00 KG | `4600.00 KG` | `4600.00 KG` | **`0.00 KG`** | `200 OK` | `"used"` | **COMMIT (+100 KG)** |
| **Scan 2** | 100.00 KG | `4700.00 KG` | `4600.00 KG` | **`-100.00 KG`** | `200 OK` | `"duplicate"` | **ROLLBACK (+0 KG)** |
| **Scan 3** | 100.00 KG | `4800.00 KG` | `4600.00 KG` | **`-200.00 KG`** | `200 OK` | `"duplicate"` | **ROLLBACK (+0 KG)** |
| **Scan 4** | 100.00 KG | `4900.00 KG` | `4600.00 KG` | **`-300.00 KG`** | `200 OK` | `"duplicate"` | **ROLLBACK (+0 KG)** |
| **Scan 5** | 100.00 KG | `5000.00 KG` | `4700.00 KG` | **`-300.00 KG`** | `200 OK` | `"used"` | **COMMIT (+100 KG)** |
| **Scan 6** | 100.00 KG | `5100.00 KG` | `4700.00 KG` | **`-400.00 KG`** | `200 OK` | `"duplicate"` | **ROLLBACK (+0 KG)** |

---

## 2. Quantitative Summary
- **Scans Submitted**: 6
- **Total Inward Quantity Submitted**: 600.00 KG
- **Expected Final Inventory**: `5100.00 KG`
- **Actual Final Inventory**: `4700.00 KG`
- **Total Disappeared Inventory**: **`400.00 KG`**
- **Root Cause**: Scans 2, 3, 4, and 6 occurred within 5 seconds of the preceding scan. The duplicate lock handler in `scannerController.js` executed `connection.rollback()` but returned HTTP Status **200 OK**. End-users registered all 6 scans as successful, but 400 KG was discarded silently by database rollback.
