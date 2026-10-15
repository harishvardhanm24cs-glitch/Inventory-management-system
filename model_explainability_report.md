# Model Explainability & AI Decision Report – Module 5D

This document explains **WHY** the production **Gradient Boosting Regressor** model makes its raw material stock depletion predictions.

---

## 1. Top 10 Most Influential Features

| Rank | Feature Name | Built-in Importance | Importance % | Permutation Mean Drop |
|---|---|---|---|---|
| 1 | **norm_quantity** | 0.5867 | **58.67%** | 29.0420 |
| 2 | **ohe_mov_OUTWARD** | 0.1868 | **18.68%** | 6.5184 |
| 3 | **ohe_mov_INWARD** | 0.1176 | **11.76%** | 2.8356 |
| 4 | **rolling_movement_avg** | 0.0182 | **1.82%** | 0.1743 |
| 5 | **total_outward** | 0.0148 | **1.48%** | 0.0979 |
| 6 | **material_weight** | 0.0120 | **1.20%** | 0.0191 |
| 7 | **hour** | 0.0108 | **1.08%** | 0.0102 |
| 8 | **avg_transaction_quantity** | 0.0100 | **1.00%** | 0.0071 |
| 9 | **inventory_health_score** | 0.0099 | **0.99%** | 0.0060 |
| 10 | **stock_difference** | 0.0075 | **0.75%** | 0.0056 |

---

## 2. Business Language Interpretation
- **Transaction Outward Direction**: High values in `ohe_mov_OUTWARD` and `norm_quantity` directly drive non-zero predictions for material usage (`quantity_used`).
- **Stock Depletion Indicator**: High `daily_consumption` and `inventory_turnover` signal higher expected raw material usage.
- **Inward Scan Suppressor**: Scans tagged with `ohe_mov_INWARD` reduce `quantity_used` to `0.0 KG`, perfectly mirroring physical warehouse material ingress.

---

## 3. Feature Audit Classification
- **Critical Features (3)**: norm_quantity, ohe_mov_OUTWARD, ohe_mov_INWARD
- **Useful Features (9)**: rolling_movement_avg, total_outward, material_weight, hour, avg_transaction_quantity
- **Weak Features (41)**: 41 minor time/frequency indicators
- **Unused Features (14)**: 14 zero-importance features

---

## 4. Visual Artifacts Exported
- [shap_bar.png](file:///D:/atendence-main/backend/../shap_bar.png) — Global Feature Importance Bar Chart.
- [shap_summary.png](file:///D:/atendence-main/backend/../shap_summary.png) — Permutation Importance Distribution.
- [shap_beeswarm.png](file:///D:/atendence-main/backend/../shap_beeswarm.png) — Residual Error Distribution Scatter Plot.
