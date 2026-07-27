# RM Monitor - Retrained ML Model Report

**Model Version**: `v4`
**Algorithm**: `RandomForestRegressor`
**Training Timestamp**: `2026-07-26T01:24:39.957281`
**Training Duration**: `0.1295 seconds`
**Model Export Path**: `D:\atendence-main\ai\models\rm_model_v4.joblib`

---

## 1. Dataset Summary

- **Total Rows**: `96`
- **Total Columns**: `26`
- **Target Column**: `quantity_used`
- **Non-Zero Target Count**: `20`
- **Target Mean**: `18.2760`

---

## 2. Test Set Performance Metrics

- **MAE**: `11.2470`
- **RMSE**: `24.8487`
- **R² Score**: `-5.5515`
- **5-Fold CV Mean MAE**: `31.1679 ± 23.2834`
- **5-Fold CV Mean RMSE**: `93.8857 ± 84.8103`
- **5-Fold CV Mean R²**: `-27.9827 ± 49.9343`

---

## 3. Top 10 Important Features

| Rank | Feature Name | Importance Score | Percentage |
| :---: | :--- | :---: | :---: |
| 1 | `material_id` | `0.441165` | `44.12%` |
| 2 | `hour` | `0.276799` | `27.68%` |
| 3 | `current_stock` | `0.231978` | `23.20%` |
| 4 | `weekend_flag` | `0.028535` | `2.85%` |
| 5 | `month` | `0.020178` | `2.02%` |
| 6 | `threshold` | `0.001345` | `0.13%` |
| 7 | `barcode` | `0.000000` | `0.00%` |
| 8 | `unit` | `0.000000` | `0.00%` |
| 9 | `batch_number` | `0.000000` | `0.00%` |
| 10 | `material_name` | `0.000000` | `0.00%` |