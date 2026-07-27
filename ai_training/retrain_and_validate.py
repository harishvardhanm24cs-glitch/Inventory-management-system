"""
retrain_and_validate.py
───────────────────────
Phase 8B Module 4 Retraining and Module 4.1 Validation.

Executes end-to-end model retraining on corrected feature_dataset.csv (with preserved quantity_used),
evaluates performance metrics (MAE, RMSE, R², 5-Fold CV), extracts non-zero feature importances,
validates 20 sample predictions, exports versioned model rm_model_v3.joblib, updates model_registry.json,
and generates 7 diagnostic report files in ai_training/reports/.
"""

import os
import sys
import time
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import KFold
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Configure sys.stdout for UTF-8 encoding if supported
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

AI_TRAINING_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = AI_TRAINING_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
ML_DATASETS_DIR = BACKEND_DIR / "ml_datasets"

sys.path.insert(0, str(AI_TRAINING_DIR))
sys.path.insert(0, str(PROJECT_ROOT))

try:
    from config import (
        FEATURE_DATASET_CSV, MODEL_REGISTRY_JSON, EXPORT_MODEL_DIR,
        REPORTS_DIR, TARGET_COLUMN, RANDOM_STATE, TEST_SPLIT_RATIO, MODEL_NAME_PREFIX
    )
    from dataset_loader import DatasetLoader
    from preprocessing import DataPreprocessor
    from export_model import ModelExporter
    from model_registry import ModelRegistryManager
    from training_logger import TrainingLogger
except ImportError:
    from ai_training.config import (
        FEATURE_DATASET_CSV, MODEL_REGISTRY_JSON, EXPORT_MODEL_DIR,
        REPORTS_DIR, TARGET_COLUMN, RANDOM_STATE, TEST_SPLIT_RATIO, MODEL_NAME_PREFIX
    )
    from ai_training.dataset_loader import DatasetLoader
    from ai_training.preprocessing import DataPreprocessor
    from ai_training.export_model import ModelExporter
    from ai_training.model_registry import ModelRegistryManager
    from ai_training.training_logger import TrainingLogger


class RetrainingPipeline:
    def __init__(self):
        self.reports_dir = Path(REPORTS_DIR)
        os.makedirs(self.reports_dir, exist_ok=True)
        self.timestamp = datetime.now().isoformat()
        self.results = {}

    def run_pipeline(self):
        print("=" * 80)
        print("   RM MONITOR - PHASE 8B MODULE 4 RETRAINING & MODULE 4.1 VALIDATION")
        print("=" * 80)

        # ──────────────────────────────────────────────────────────────────────
        # STEP 1: LOAD DATASET & VERIFY STATISTICS
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 1: LOADING & AUDITING DATASET ('feature_dataset.csv')...")
        csv_path = Path(FEATURE_DATASET_CSV)
        if not csv_path.exists():
            raise FileNotFoundError(f"Feature dataset not found at '{csv_path}'")

        df = pd.read_csv(csv_path)
        total_rows = len(df)
        total_cols = len(df.columns)

        if TARGET_COLUMN not in df.columns:
            raise KeyError(f"Target column '{TARGET_COLUMN}' missing from dataset!")

        target_series = df[TARGET_COLUMN]
        null_count = int(target_series.isnull().sum())
        numeric_target = pd.to_numeric(target_series, errors="coerce").fillna(0.0)

        min_val = float(numeric_target.min())
        max_val = float(numeric_target.max())
        mean_val = float(numeric_target.mean())
        zero_count = int((numeric_target == 0.0).sum())
        non_zero_count = total_rows - zero_count

        dataset_summary = {
            "csv_path": str(csv_path),
            "file_exists": True,
            "row_count": total_rows,
            "column_count": total_cols,
            "target_column": TARGET_COLUMN,
            "null_count": null_count,
            "zero_count": zero_count,
            "non_zero_count": non_zero_count,
            "min": min_val,
            "max": max_val,
            "mean": round(mean_val, 4)
        }

        print(f"   • File Exists       : True")
        print(f"   • Row Count         : {total_rows}")
        print(f"   • Column Count      : {total_cols}")
        print(f"   • Target Column     : '{TARGET_COLUMN}'")
        print(f"   • Null Count        : {null_count}")
        print(f"   • Zero Count        : {zero_count}")
        print(f"   • Non-Zero Count    : {non_zero_count}")
        print(f"   • Range & Mean      : Min={min_val:.4f}, Max={max_val:.4f}, Mean={mean_val:.4f}")

        # ──────────────────────────────────────────────────────────────────────
        # STEP 2: PREPROCESSING & TRAIN/TEST SPLIT
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 2: PREPROCESSING & FEATURE MATRIX ENCODING...")
        preprocessor = DataPreprocessor(target_column=TARGET_COLUMN)
        X, y, feature_names = preprocessor.preprocess_dataset(df)

        print(f"   • Total Input Features Selected: {len(feature_names)}")

        X_train, X_test, y_train, y_test = preprocessor.split_data(
            X, y, test_size=TEST_SPLIT_RATIO, random_state=RANDOM_STATE
        )

        print(f"   • Training Set Samples : {len(X_train)} (80%)")
        print(f"   • Testing Set Samples  : {len(X_test)} (20%)")

        # ──────────────────────────────────────────────────────────────────────
        # STEP 3: MODEL TRAINING & EXPORT
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 3: RETRAINING RANDOMFORESTREGRESSOR MODEL...")
        rf_params = {
            "n_estimators": 100,
            "random_state": RANDOM_STATE,
            "n_jobs": -1,
            "criterion": "squared_error"
        }
        rf_model = RandomForestRegressor(**rf_params)

        train_start = time.time()
        rf_model.fit(X_train, y_train)
        training_time_sec = time.time() - train_start

        print(f"   • Model Training Time: {training_time_sec:.4f} seconds")

        # Export model
        exporter = ModelExporter()
        export_info = exporter.export(rf_model, model_prefix=MODEL_NAME_PREFIX)
        model_version = export_info["model_version"]
        export_path = export_info["export_path"]

        # ──────────────────────────────────────────────────────────────────────
        # STEP 4: EVALUATION & 5-FOLD CROSS VALIDATION
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 4: EVALUATION & 5-FOLD CROSS VALIDATION...")
        predict_start = time.time()
        y_test_pred = rf_model.predict(X_test)
        prediction_time_sec = time.time() - predict_start

        mae = float(mean_absolute_error(y_test, y_test_pred))
        rmse = float(np.sqrt(mean_squared_error(y_test, y_test_pred)))
        r2 = float(r2_score(y_test, y_test_pred))

        print(f"   • MAE            : {mae:.4f}")
        print(f"   • RMSE           : {rmse:.4f}")
        print(f"   • R² Score       : {r2:.4f}")
        print(f"   • Prediction Time: {prediction_time_sec:.6f} seconds")

        # 5-Fold Cross Validation
        kf = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
        cv_mae_scores, cv_rmse_scores, cv_r2_scores = [], [], []

        for tr_idx, va_idx in kf.split(X):
            X_tr, X_va = X.iloc[tr_idx], X.iloc[va_idx]
            y_tr, y_va = y.iloc[tr_idx], y.iloc[va_idx]

            fold_m = RandomForestRegressor(**rf_params)
            fold_m.fit(X_tr, y_tr)
            y_va_p = fold_m.predict(X_va)

            cv_mae_scores.append(mean_absolute_error(y_va, y_va_p))
            cv_rmse_scores.append(np.sqrt(mean_squared_error(y_va, y_va_p)))
            cv_r2_scores.append(r2_score(y_va, y_va_p))

        cv_mean_mae = float(np.mean(cv_mae_scores))
        cv_std_mae = float(np.std(cv_mae_scores))
        cv_mean_rmse = float(np.mean(cv_rmse_scores))
        cv_std_rmse = float(np.std(cv_rmse_scores))
        cv_mean_r2 = float(np.mean(cv_r2_scores))
        cv_std_r2 = float(np.std(cv_r2_scores))

        print(f"   • 5-Fold CV Mean MAE  : {cv_mean_mae:.4f} ± {cv_std_mae:.4f}")
        print(f"   • 5-Fold CV Mean RMSE : {cv_mean_rmse:.4f} ± {cv_std_rmse:.4f}")
        print(f"   • 5-Fold CV Mean R²   : {cv_mean_r2:.4f} ± {cv_std_r2:.4f}")

        # Update model_registry.json
        registry_mgr = ModelRegistryManager()
        registry_entry = registry_mgr.register_trained_model(
            model_name="RM Monitor Material Usage Regressor",
            algorithm="RandomForestRegressor",
            training_timestamp=self.timestamp,
            dataset_used=str(csv_path),
            number_of_features=len(feature_names),
            training_samples=len(X_train),
            testing_samples=len(X_test),
            performance_metrics={
                "mae": round(mae, 4),
                "rmse": round(rmse, 4),
                "r2_score": round(r2, 4),
                "cv_mean_mae": round(cv_mean_mae, 4),
                "cv_mean_rmse": round(cv_mean_rmse, 4),
                "cv_mean_r2": round(cv_mean_r2, 4)
            },
            model_version=model_version,
            model_path=export_path
        )

        # ──────────────────────────────────────────────────────────────────────
        # STEP 5: FEATURE IMPORTANCE COMPUTATION & RANKING
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 5: COMPUTING & RANKING FEATURE IMPORTANCE...")
        importances = rf_model.feature_importances_
        fi_df = pd.DataFrame({
            "feature_name": feature_names,
            "importance": importances
        }).sort_values(by="importance", ascending=False).reset_index(drop=True)
        fi_df["rank"] = fi_df.index + 1

        top_10_df = fi_df.head(10)
        print("-" * 65)
        print(f"{'Rank':<6} | {'Feature Name':<35} | {'Importance':<12} | {'Pct':<8}")
        print("-" * 65)
        for _, row in top_10_df.iterrows():
            pct = row['importance'] * 100
            print(f"{int(row['rank']):<6} | {row['feature_name']:<35} | {row['importance']:<12.6f} | {pct:<6.2f}%")
        print("-" * 65)

        # ──────────────────────────────────────────────────────────────────────
        # STEP 6: VALIDATION & 20 PREDICTION SAMPLES
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 6: VALIDATING MODEL PREDICTIONS & FEATURE IMPORTANCE...")
        all_importances_zero = bool(np.all(importances == 0.0))

        # Select 20 random prediction samples using seed 42
        np.random.seed(RANDOM_STATE)
        sample_indices = np.random.choice(len(X), size=min(20, len(X)), replace=False)
        sample_indices.sort()

        X_samples = X.iloc[sample_indices]
        y_samples = y.iloc[sample_indices]
        y_preds = rf_model.predict(X_samples)

        pred_records = []
        for idx, orig_idx in enumerate(sample_indices):
            act_val = float(y_samples.iloc[idx])
            prd_val = float(y_preds[idx])
            err = act_val - prd_val
            abs_e = abs(err)

            pred_records.append({
                "sample_index": int(orig_idx),
                "actual_quantity_used": round(act_val, 4),
                "predicted_quantity_used": round(prd_val, 4),
                "prediction_error": round(err, 4),
                "absolute_error": round(abs_e, 4)
            })

        pred_samples_df = pd.DataFrame(pred_records)
        unique_predictions_count = int(pred_samples_df["predicted_quantity_used"].nunique())
        is_constant_prediction = unique_predictions_count <= 1

        target_learned = (not all_importances_zero) and (not is_constant_prediction)
        validation_passed = (
            not all_importances_zero and
            not is_constant_prediction and
            target_learned
        )

        readiness_status = "READY" if validation_passed else "NOT READY"

        print(f"   • Model Predicts Multiple Values?  : {'YES' if not is_constant_prediction else 'NO'}")
        print(f"   • Feature Importances Non-Zero?   : {'YES' if not all_importances_zero else 'NO'}")
        print(f"   • Target quantity_used Learned?   : {'YES' if target_learned else 'NO'}")
        print(f"   • Validation Status               : {'PASSED' if validation_passed else 'FAILED'}")
        print(f"   • Overall Readiness               : {readiness_status}")

        # ──────────────────────────────────────────────────────────────────────
        # STEP 7: GENERATE 7 REPORT FILES IN ai_training/reports/
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 7: GENERATING 7 REPORT ARTIFACTS IN ai_training/reports/...")

        # 1. feature_importance.csv & feature_importance.json
        fi_csv_path = self.reports_dir / "feature_importance.csv"
        fi_df.to_csv(fi_csv_path, index=False)

        fi_json_path = self.reports_dir / "feature_importance.json"
        with open(fi_json_path, "w", encoding="utf-8") as f:
            json.dump(fi_df.to_dict(orient="records"), f, indent=2)

        # 2. prediction_samples.csv
        pred_csv_path = self.reports_dir / "prediction_samples.csv"
        pred_samples_df.to_csv(pred_csv_path, index=False)

        # 3. training_metrics.json
        metrics_json_data = {
            "timestamp": self.timestamp,
            "model_version": model_version,
            "model_path": export_path,
            "algorithm": "RandomForestRegressor",
            "hyperparameters": rf_params,
            "dataset_summary": dataset_summary,
            "sample_counts": {
                "training_samples": len(X_train),
                "testing_samples": len(X_test)
            },
            "performance_metrics": {
                "mae": round(mae, 4),
                "rmse": round(rmse, 4),
                "r2_score": round(r2, 4),
                "training_time_seconds": round(training_time_sec, 4),
                "prediction_time_seconds": round(prediction_time_sec, 6)
            },
            "cross_validation_5fold": {
                "mean_mae": round(cv_mean_mae, 4),
                "std_mae": round(cv_std_mae, 4),
                "mean_rmse": round(cv_mean_rmse, 4),
                "std_rmse": round(cv_std_rmse, 4),
                "mean_r2": round(cv_mean_r2, 4),
                "std_r2": round(cv_std_r2, 4)
            },
            "top_10_features": top_10_df.to_dict(orient="records")
        }
        metrics_json_path = self.reports_dir / "training_metrics.json"
        with open(metrics_json_path, "w", encoding="utf-8") as f:
            json.dump(metrics_json_data, f, indent=2)

        # 4. validation_report.json
        val_json_data = {
            "timestamp": self.timestamp,
            "model_version": model_version,
            "validation_status": "PASSED" if validation_passed else "FAILED",
            "overall_readiness": readiness_status,
            "checks": {
                "multiple_prediction_values": not is_constant_prediction,
                "non_zero_feature_importances": not all_importances_zero,
                "target_quantity_used_learned": target_learned
            },
            "sample_predictions_count": len(pred_records)
        }
        val_json_path = self.reports_dir / "validation_report.json"
        with open(val_json_path, "w", encoding="utf-8") as f:
            json.dump(val_json_data, f, indent=2)

        # 5. training_report.md
        train_md_lines = [
            "# RM Monitor - Retrained ML Model Report",
            "",
            f"**Model Version**: `{model_version}`",
            f"**Algorithm**: `RandomForestRegressor`",
            f"**Training Timestamp**: `{self.timestamp}`",
            f"**Training Duration**: `{training_time_sec:.4f} seconds`",
            f"**Model Export Path**: `{export_path}`",
            "",
            "---",
            "",
            "## 1. Dataset Summary",
            "",
            f"- **Total Rows**: `{total_rows}`",
            f"- **Total Columns**: `{total_cols}`",
            f"- **Target Column**: `{TARGET_COLUMN}`",
            f"- **Non-Zero Target Count**: `{non_zero_count}`",
            f"- **Target Mean**: `{mean_val:.4f}`",
            "",
            "---",
            "",
            "## 2. Test Set Performance Metrics",
            "",
            f"- **MAE**: `{mae:.4f}`",
            f"- **RMSE**: `{rmse:.4f}`",
            f"- **R² Score**: `{r2:.4f}`",
            f"- **5-Fold CV Mean MAE**: `{cv_mean_mae:.4f} ± {cv_std_mae:.4f}`",
            f"- **5-Fold CV Mean RMSE**: `{cv_mean_rmse:.4f} ± {cv_std_rmse:.4f}`",
            f"- **5-Fold CV Mean R²**: `{cv_mean_r2:.4f} ± {cv_std_r2:.4f}`",
            "",
            "---",
            "",
            "## 3. Top 10 Important Features",
            "",
            "| Rank | Feature Name | Importance Score | Percentage |",
            "| :---: | :--- | :---: | :---: |"
        ]
        for _, row in top_10_df.iterrows():
            train_md_lines.append(f"| {int(row['rank'])} | `{row['feature_name']}` | `{row['importance']:.6f}` | `{row['importance']*100:.2f}%` |")

        train_md_path = self.reports_dir / "training_report.md"
        with open(train_md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(train_md_lines))

        # 6. validation_report.md
        val_md_lines = [
            "# RM Monitor - Module 4.1 Retraining Validation Report",
            "",
            f"**Overall Readiness Verdict**: `{readiness_status}`",
            f"**Validation Status**: `PASSED`" if validation_passed else "**Validation Status**: `FAILED`",
            f"**Timestamp**: `{self.timestamp}`",
            f"**Model Version**: `{model_version}`",
            "",
            "---",
            "",
            "## Validation Audit Matrix",
            "",
            f"- **Multiple Prediction Values Produced**: `{'PASS' if not is_constant_prediction else 'FAIL'}`",
            f"- **Feature Importances Non-Zero**: `{'PASS' if not all_importances_zero else 'FAIL'}`",
            f"- **Target quantity_used Learned**: `{'PASS' if target_learned else 'FAIL'}`",
            "",
            "---",
            "",
            "## 20 Prediction Samples Table",
            "",
            "| Index | Actual quantity_used | Predicted quantity_used | Error | Absolute Error |",
            "| :---: | :---: | :---: | :---: | :---: |"
        ]
        for p in pred_records:
            val_md_lines.append(f"| {p['sample_index']} | {p['actual_quantity_used']} | {p['predicted_quantity_used']} | {p['prediction_error']} | {p['absolute_error']} |")

        val_md_lines.extend([
            "",
            "---",
            "",
            "## Readiness Verdict",
            f"✅ **Model is READY for Phase 8B Module 5 Inference.**" if readiness_status == "READY" else "❌ **Model is NOT READY.**"
        ])
        val_md_path = self.reports_dir / "validation_report.md"
        with open(val_md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(val_md_lines))

        print(f"   • Saved '{fi_csv_path.name}'")
        print(f"   • Saved '{fi_json_path.name}'")
        print(f"   • Saved '{pred_csv_path.name}'")
        print(f"   • Saved '{metrics_json_path.name}'")
        print(f"   • Saved '{val_json_path.name}'")
        print(f"   • Saved '{train_md_path.name}'")
        print(f"   • Saved '{val_md_path.name}'")

        # ──────────────────────────────────────────────────────────────────────
        # FINAL REQUIRED OUTPUT DISPLAY
        # ──────────────────────────────────────────────────────────────────────
        print("\n" + "=" * 80)
        print("                  FINAL RETRAINING & VALIDATION SUMMARY")
        print("=" * 80)
        print(f"• Dataset Summary        : {total_rows} rows, {total_cols} cols, {non_zero_count} non-zero target rows (Mean: {mean_val:.4f})")
        print(f"• Training Time          : {training_time_sec:.4f} seconds")
        print(f"• Prediction Time        : {prediction_time_sec:.6f} seconds")
        print(f"• Performance Metrics    : MAE = {mae:.4f}, RMSE = {rmse:.4f}, R² Score = {r2:.4f}")
        print(f"• 5-Fold Cross Validation: Mean MAE = {cv_mean_mae:.4f}, Mean RMSE = {cv_mean_rmse:.4f}, Mean R² = {cv_mean_r2:.4f}")
        print(f"• Model Export Location  : '{export_path}'")
        print(f"• Model Version          : {model_version}")
        print(f"• Validation Status      : {'PASSED' if validation_passed else 'FAILED'}")
        print("-" * 80)
        print(f"Top 10 Feature Importance:")
        for idx, r in top_10_df.iterrows():
            print(f"  {int(r['rank']):>2}. {r['feature_name']:<35} : {r['importance']:.6f} ({r['importance']*100:.2f}%)")
        print("=" * 80)
        print(f"OVERALL READINESS: {readiness_status}")
        print("=" * 80)

        return readiness_status


if __name__ == "__main__":
    pipeline = RetrainingPipeline()
    pipeline.run_pipeline()
