# RM Monitor - Machine Learning Model Validation Report

**Overall Verdict**: `NOT READY`
**Audit Timestamp**: `2026-07-26T00:18:00.368040`
**Model Path**: `D:\atendence-main\ai\models\rm_model_v2.joblib`
**Model Version**: `v2`

---

## Executive Summary

- **Algorithm**: `RandomForestRegressor`
- **Target Column**: `quantity_used`
- **Target Is Constant**: `True`
- **Included Features Count**: `23`
- **Constant Features Count**: `17`
- **Leakage Suspects Count**: `0`
- **5-Fold CV Mean MAE**: `0.0 ± 0.0`
- **5-Fold CV Mean RMSE**: `0.0 ± 0.0`
- **5-Fold CV Mean R²**: `1.0 ± 0.0`

---

## 15-Sample Prediction Validation

| Index | Actual quantity_used | Predicted quantity_used | Absolute Error |
| :---: | :---: | :---: | :---: |
| 3 | 0.0 | 0.0 | 0.0 |
| 5 | 0.0 | 0.0 | 0.0 |
| 6 | 0.0 | 0.0 | 0.0 |
| 8 | 0.0 | 0.0 | 0.0 |
| 12 | 0.0 | 0.0 | 0.0 |
| 13 | 0.0 | 0.0 | 0.0 |
| 17 | 0.0 | 0.0 | 0.0 |
| 19 | 0.0 | 0.0 | 0.0 |
| 26 | 0.0 | 0.0 | 0.0 |
| 32 | 0.0 | 0.0 | 0.0 |
| 34 | 0.0 | 0.0 | 0.0 |
| 41 | 0.0 | 0.0 | 0.0 |
| 43 | 0.0 | 0.0 | 0.0 |
| 47 | 0.0 | 0.0 | 0.0 |
| 50 | 0.0 | 0.0 | 0.0 |

---

## Diagnostic Verdict & Next Steps

❌ **Model Validation Failed. Action required before proceeding to Module 5:**
- Target column 'quantity_used' is completely unpopulated/constant zero in feature_dataset.csv.
- All feature importance scores equal 0.0 due to zero target variance.
- Model predictions are degenerate constant values (0.0 for all inputs).