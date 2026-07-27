# RM Monitor - Model Training Diagnostic Explanation

**Audit Status**: `NOT READY`
**Timestamp**: `2026-07-26T00:18:00.368040`

---

## 1. Feature Importance Zero-Value Anomaly Explanation

CRITICAL DIAGNOSTIC FINDING: Every feature importance score is exactly 0.0. This occurs because the target column 'quantity_used' in 'feature_dataset.csv' contains constant zero values across all rows. In Decision Tree / Random Forest algorithms, split quality is evaluated by impurity (MSE) reduction. When the target y has zero variance, no split can reduce MSE further, yielding zero Gini/MSE gain for every feature split.

---

## 2. Model Prediction Sanity Analysis

- **Minimum Prediction**: `0.0`
- **Maximum Prediction**: `0.0`
- **Mean Prediction**: `0.0`
- **Degenerate Prediction Output**: `True`

---

## 3. Recommended Remediation Steps

- Populate non-zero material usage transactions in quantity_used upstream.
- Regenerate backend/ml_datasets/feature_dataset.csv.
- Re-run Module 4 training pipeline after dataset population.