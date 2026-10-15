# Machine Learning Model Comparison Report – Module 5C

This document presents the empirical comparison of 5 regression algorithms trained on the validated warehouse feature dataset (`feature_dataset.csv`).

---

## 1. Executive Summary & Winner Declaration
- **Winning Production Model**: **Gradient Boosting**
- **Overall Score**: **99.95 / 100**
- **Cross Validation R²**: **0.9573**
- **Test Set RMSE**: **2.3198 KG**
- **Justification**: Gradient Boosting achieved the highest weighted score (99.95/100) with a CV R² of 0.9573, test RMSE of 2.3198 KG, and healthy generalization gap (0.0427).

---

## 2. Algorithm Performance Comparison Matrix

| Rank | Model | Train Time | MAE (KG) | RMSE (KG) | R² Score | CV R² | CV RMSE | Gen Gap | Overall Score |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Gradient Boosting** | 0.0692s | 0.4008 | 2.3198 | 0.9842 | **0.9573** | 18.9616 | 0.0427 | **99.95** |
| 2 | **Extra Trees** | 0.0623s | 0.3954 | 2.3058 | 0.9844 | **0.9517** | 20.4301 | 0.0483 | **98.86** |
| 3 | **Random Forest** | 0.3497s | 0.4423 | 2.5789 | 0.9805 | **0.9376** | 26.2809 | 0.0624 | **92.74** |
| 4 | **XGBoost** | 1.0159s | 0.6442 | 3.7552 | 0.9587 | **-0.7541** | 32.1716 | 1.7541 | **42.59** |
| 5 | **HistGradientBoosting** | 2.0204s | 17.2855 | 32.5875 | -2.1082 | **-0.7636** | 60.3984 | 1.5326 | **6.04** |

---

## 3. Algorithm Rankings (Weighted Scoring)
1. **Gradient Boosting** — Score: `99.95`
2. **Extra Trees** — Score: `98.86`
3. **Random Forest** — Score: `92.74`
4. **XGBoost** — Score: `42.59`
5. **HistGradientBoosting** — Score: `6.04`
