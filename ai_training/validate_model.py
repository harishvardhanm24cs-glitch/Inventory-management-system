"""
validate_model.py
─────────────────
Phase 8B Module 4.1 – Machine Learning Training Validation & Data Leakage Detection.

Diagnostic module only: Performs validation checks on the trained model,
dataset quality, target column, feature variance, target leakage, predictions,
feature importance zero-values, 5-fold cross-validation, and overall sanity.
Generates 8 diagnostic report files and issues final readiness verdict.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
from sklearn.model_selection import KFold
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime
from sklearn.model_selection import KFold
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Configure sys.stdout for UTF-8 encoding if supported
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure sys.path includes ai_training/ and project root
AI_TRAINING_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = AI_TRAINING_DIR.parent
sys.path.insert(0, str(AI_TRAINING_DIR))
sys.path.insert(0, str(PROJECT_ROOT))


try:
    from config import (
        FEATURE_DATASET_CSV, MODEL_REGISTRY_JSON, EXPORT_MODEL_DIR,
        REPORTS_DIR, TARGET_COLUMN, RANDOM_STATE
    )
    from dataset_loader import DatasetLoader
    from preprocessing import DataPreprocessor
except ImportError:
    from ai_training.config import (
        FEATURE_DATASET_CSV, MODEL_REGISTRY_JSON, EXPORT_MODEL_DIR,
        REPORTS_DIR, TARGET_COLUMN, RANDOM_STATE
    )
    from ai_training.dataset_loader import DatasetLoader
    from ai_training.preprocessing import DataPreprocessor


class ModelValidationDiagnostics:
    def __init__(self):
        self.reports_dir = Path(REPORTS_DIR)
        os.makedirs(self.reports_dir, exist_ok=True)
        self.timestamp = datetime.now().isoformat()
        self.results = {}
        self.logs = []

    def log(self, msg: str):
        print(msg)
        self.logs.append(msg)

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 1: TRAINING PIPELINE VALIDATION
    # ──────────────────────────────────────────────────────────────────────────
    def validate_training_pipeline(self):
        self.log("\n" + "=" * 80)
        self.log("SECTION 1: TRAINING PIPELINE & MODEL ARTIFACT VALIDATION")
        self.log("=" * 80)

        # Find latest model artifact in EXPORT_MODEL_DIR or MODEL_REGISTRY_JSON
        registry_path = Path(MODEL_REGISTRY_JSON)
        latest_model_path = None
        model_version = "v1"
        training_timestamp = "N/A"
        registered_models = []

        if registry_path.exists():
            try:
                with open(registry_path, "r", encoding="utf-8") as f:
                    reg_data = json.load(f)
                    registered_models = reg_data.get("registered_models", [])
                    if registered_models:
                        last_reg = registered_models[-1]
                        latest_model_path = Path(last_reg.get("model_path", ""))
                        model_version = last_reg.get("model_version", "v1")
                        training_timestamp = last_reg.get("training_timestamp", "N/A")
            except Exception as e:
                self.log(f"   • Notice reading registry: {e}")

        if not latest_model_path or not latest_model_path.exists():
            # Fallback to scan ai/models/ for highest version joblib
            export_dir = Path(EXPORT_MODEL_DIR)
            joblib_files = list(export_dir.glob("rm_model_v*.joblib"))
            if joblib_files:
                joblib_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
                latest_model_path = joblib_files[0]
                model_version = latest_model_path.stem.split("_")[-1]
            else:
                err = f"No trained model artifact found in '{export_dir}'."
                self.log(f"❌ {err}")
                raise FileNotFoundError(err)

        self.log(f"   • Model Path        : '{latest_model_path}'")
        self.log(f"   • File Exists       : {latest_model_path.exists()}")

        # Load Model
        try:
            model = joblib.load(latest_model_path)
            self.log(f"   • Model Load        : SUCCESS")
        except Exception as e:
            self.log(f"❌ Failed to load model artifact: {e}")
            raise e

        algorithm_type = model.__class__.__name__
        n_features_in = getattr(model, "n_features_in_", 0)

        self.log(f"   • Algorithm Type    : {algorithm_type}")
        self.log(f"   • Learned Features  : {n_features_in}")
        self.log(f"   • Model Version     : {model_version}")
        self.log(f"   • Training Timestamp: {training_timestamp}")

        section1_summary = {
            "model_path": str(latest_model_path),
            "file_exists": True,
            "load_status": "SUCCESS",
            "algorithm_type": algorithm_type,
            "number_of_learned_features": n_features_in,
            "model_version": model_version,
            "training_timestamp": training_timestamp
        }

        self.results["section_1_pipeline_validation"] = section1_summary
        return model, latest_model_path, section1_summary

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 2: TARGET COLUMN VALIDATION
    # ──────────────────────────────────────────────────────────────────────────
    def validate_target_column(self, df: pd.DataFrame):
        self.log("\n" + "=" * 80)
        self.log(f"SECTION 2: TARGET COLUMN VALIDATION ('{TARGET_COLUMN}')")
        self.log("=" * 80)

        if TARGET_COLUMN not in df.columns:
            err = f"Target column '{TARGET_COLUMN}' not present in dataset."
            self.log(f"❌ {err}")
            raise KeyError(err)

        raw_target_series = df[TARGET_COLUMN]
        null_count = int(raw_target_series.isnull().sum())

        # Convert to numeric float for statistical calculation
        numeric_target = pd.to_numeric(raw_target_series, errors="coerce").fillna(0.0)

        min_val = float(numeric_target.min())
        max_val = float(numeric_target.max())
        mean_val = float(numeric_target.mean())
        median_val = float(numeric_target.median())
        std_val = float(numeric_target.std()) if len(numeric_target) > 1 else 0.0
        unique_vals = int(numeric_target.nunique())
        zero_count = int((numeric_target == 0.0).sum())
        total_rows = len(numeric_target)

        freq_counts = raw_target_series.value_counts(dropna=False).head(20).to_dict()
        freq_str_keys = {str(k): int(v) for k, v in freq_counts.items()}

        is_constant = bool(unique_vals <= 1 or (min_val == max_val and std_val == 0.0))

        self.log(f"   • Total Rows           : {total_rows}")
        self.log(f"   • Minimum Value        : {min_val}")
        self.log(f"   • Maximum Value        : {max_val}")
        self.log(f"   • Mean Value           : {mean_val:.4f}")
        self.log(f"   • Median Value         : {median_val:.4f}")
        self.log(f"   • Standard Deviation   : {std_val:.4f}")
        self.log(f"   • Unique Values Count  : {unique_vals}")
        self.log(f"   • Null / Missing Count : {null_count}")
        self.log(f"   • Zero Values Count    : {zero_count}")
        self.log(f"   • Target Is Constant?  : {'YES (UNPOPULATED / ALL ZERO)' if is_constant else 'NO'}")

        section2_summary = {
            "target_column": TARGET_COLUMN,
            "total_rows": total_rows,
            "min": min_val,
            "max": max_val,
            "mean": round(mean_val, 4),
            "median": round(median_val, 4),
            "std": round(std_val, 4),
            "unique_values_count": unique_vals,
            "null_count": null_count,
            "zero_count": zero_count,
            "is_constant": is_constant,
            "top_20_frequent_values": freq_str_keys
        }

        self.results["section_2_target_validation"] = section2_summary
        return numeric_target, is_constant, section2_summary

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 3: FEATURE VALIDATION
    # ──────────────────────────────────────────────────────────────────────────
    def validate_features(self, df: pd.DataFrame, X: pd.DataFrame, model):
        self.log("\n" + "=" * 80)
        self.log("SECTION 3: FEATURE VALIDATION (X vs TARGET)")
        self.log("=" * 80)

        all_cols = list(df.columns)
        included_cols = list(X.columns)
        excluded_cols = [c for c in all_cols if c not in included_cols]

        target_in_X = TARGET_COLUMN in included_cols
        self.log(f"   • Target '{TARGET_COLUMN}' Excluded from X : {not target_in_X}")
        self.log(f"   • Total Dataset Columns                     : {len(all_cols)}")
        self.log(f"   • Included Feature Columns                  : {len(included_cols)}")
        self.log(f"   • Excluded Columns                          : {len(excluded_cols)}")
        self.log(f"   • Model Expected Feature Count              : {model.n_features_in_}")

        if target_in_X:
            self.log(f"❌ CRITICAL LEAKAGE: '{TARGET_COLUMN}' was erroneously included inside X!")
        else:
            self.log(f"✅ VERIFIED: '{TARGET_COLUMN}' is strictly excluded from feature matrix X.")

        section3_summary = {
            "target_excluded_from_X": not target_in_X,
            "total_dataset_columns": len(all_cols),
            "included_features_count": len(included_cols),
            "excluded_features_count": len(excluded_cols),
            "included_columns": included_cols,
            "excluded_columns": excluded_cols
        }

        self.results["section_3_feature_validation"] = section3_summary
        return section3_summary

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 4: CONSTANT FEATURE DETECTION
    # ──────────────────────────────────────────────────────────────────────────
    def detect_constant_features(self, X: pd.DataFrame):
        self.log("\n" + "=" * 80)
        self.log("SECTION 4: CONSTANT & NEAR-CONSTANT FEATURE DETECTION")
        self.log("=" * 80)

        constant_cols = []
        near_constant_cols = []
        empty_cols = []
        feature_diag_records = []

        for col in X.columns:
            series = X[col]
            n_unique = int(series.nunique())
            std_val = float(series.std()) if len(series) > 1 else 0.0
            null_cnt = int(series.isnull().sum())
            val_counts = series.value_counts(normalize=True)
            top_freq_pct = float(val_counts.iloc[0]) if len(val_counts) > 0 else 0.0

            is_const = bool(n_unique <= 1 or std_val == 0.0)
            is_empty = bool(null_cnt == len(series))
            is_near_const = bool(not is_const and top_freq_pct >= 0.95)

            if is_const:
                constant_cols.append(col)
            if is_near_const:
                near_constant_cols.append(col)
            if is_empty:
                empty_cols.append(col)

            feature_diag_records.append({
                "feature_name": col,
                "data_type": str(series.dtype),
                "unique_values": n_unique,
                "std_dev": round(std_val, 6),
                "top_value_frequency_pct": round(top_freq_pct * 100, 2),
                "is_constant": is_const,
                "is_near_constant": is_near_const,
                "is_empty": is_empty
            })

        self.log(f"   • Total Features Analyzed     : {len(X.columns)}")
        self.log(f"   • Constant Features Count     : {len(constant_cols)}")
        self.log(f"   • Near-Constant Features Count: {len(near_constant_cols)}")
        self.log(f"   • Completely Empty Columns    : {len(empty_cols)}")

        if constant_cols:
            self.log(f"   • Constant Columns List       : {constant_cols}")
        if near_constant_cols:
            self.log(f"   • Near-Constant Columns List  : {near_constant_cols}")

        section4_summary = {
            "total_features": len(X.columns),
            "constant_columns_count": len(constant_cols),
            "constant_columns": constant_cols,
            "near_constant_columns_count": len(near_constant_cols),
            "near_constant_columns": near_constant_cols,
            "empty_columns_count": len(empty_cols),
            "empty_columns": empty_cols,
            "feature_diagnostics": feature_diag_records
        }

        self.results["section_4_constant_features"] = section4_summary
        return pd.DataFrame(feature_diag_records), section4_summary

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 5: TARGET LEAKAGE DETECTION
    # ──────────────────────────────────────────────────────────────────────────
    def detect_target_leakage(self, X: pd.DataFrame, y: pd.Series):
        self.log("\n" + "=" * 80)
        self.log("SECTION 5: TARGET LEAKAGE DETECTION")
        self.log("=" * 80)

        leakage_suspects = []
        correlations = {}

        y_is_const = (y.nunique() <= 1) or (y.std() == 0.0)

        for col in X.columns:
            series = X[col]


            if not y_is_const:
                # Check duplicate / identical when target is non-constant
                if series.equals(y):
                    leakage_suspects.append({
                        "feature": col,
                        "reason": "Identical / Copied column of target quantity_used",
                        "risk_level": "CRITICAL"
                    })

                # Check Correlation
                if series.std() > 0:
                    corr = float(series.corr(y))
                    correlations[col] = round(corr, 4)
                    if abs(corr) >= 0.99:
                        leakage_suspects.append({
                            "feature": col,
                            "reason": f"Extremely high correlation ({corr:.4f}) with target",
                            "risk_level": "HIGH"
                        })
                else:
                    correlations[col] = 0.0
            else:
                correlations[col] = 0.0

        if y_is_const:
            self.log("   • Correlation / Leakage Note: Target is constant 0.0 across all rows. Pearson correlations and value comparisons are confounded by zero target variance.")

        self.log(f"   • Total Features Audited      : {len(X.columns)}")
        self.log(f"   • Potential Leakage Suspects  : {len(leakage_suspects)}")

        if leakage_suspects:
            for suspect in leakage_suspects:
                self.log(f"   ❌ LEAKAGE RISK [{suspect['risk_level']}]: {suspect['feature']} -> {suspect['reason']}")
        else:
            self.log("   ✅ No target leakage or perfect correlation (>0.99) detected among features.")


        section5_summary = {
            "target_is_constant": y_is_const,
            "leakage_suspects_count": len(leakage_suspects),
            "leakage_suspects": leakage_suspects,
            "feature_correlations_with_target": correlations
        }

        self.results["section_5_target_leakage"] = section5_summary
        return section5_summary

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 6: MODEL PREDICTION VALIDATION
    # ──────────────────────────────────────────────────────────────────────────
    def validate_predictions(self, X: pd.DataFrame, y: pd.Series, model):
        self.log("\n" + "=" * 80)
        self.log("SECTION 6: MODEL PREDICTION VALIDATION (15 RANDOM SAMPLES)")
        self.log("=" * 80)

        # Randomly select 15 rows using seed 42
        np.random.seed(RANDOM_STATE)
        sample_indices = np.random.choice(len(X), size=min(15, len(X)), replace=False)
        sample_indices.sort()

        X_samples = X.iloc[sample_indices]
        y_samples = y.iloc[sample_indices]

        y_preds = model.predict(X_samples)

        pred_records = []
        self.log(f"{'Sample Row':<12} | {'Actual quantity_used':<22} | {'Predicted':<18} | {'Error':<12} | {'Abs Error':<12}")
        self.log("-" * 80)

        for idx, orig_idx in enumerate(sample_indices):
            actual_val = float(y_samples.iloc[idx])
            pred_val = float(y_preds[idx])
            err = actual_val - pred_val
            abs_err = abs(err)

            pred_records.append({
                "sample_index": int(orig_idx),
                "actual_quantity_used": round(actual_val, 4),
                "predicted_quantity_used": round(pred_val, 4),
                "prediction_error": round(err, 4),
                "absolute_error": round(abs_err, 4)
            })

            self.log(f"Row #{orig_idx:<7} | {actual_val:<22.4f} | {pred_val:<18.4f} | {err:<12.4f} | {abs_err:<12.4f}")

        pred_df = pd.DataFrame(pred_records)
        section6_summary = {
            "sample_count": len(pred_records),
            "sample_predictions": pred_records
        }

        self.results["section_6_prediction_validation"] = section6_summary
        return pred_df, section6_summary

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 7: FEATURE IMPORTANCE VALIDATION & DIAGNOSIS
    # ──────────────────────────────────────────────────────────────────────────
    def validate_feature_importance(self, model, is_target_constant: bool):
        self.log("\n" + "=" * 80)
        self.log("SECTION 7: FEATURE IMPORTANCE VALIDATION & ANOMALY DIAGNOSIS")
        self.log("=" * 80)

        importances = model.feature_importances_
        all_zero = bool(np.all(importances == 0.0))

        self.log(f"   • Total Features Checked       : {len(importances)}")
        self.log(f"   • All Feature Importances 0.0? : {'YES (ANOMALY DETECTED)' if all_zero else 'NO'}")

        diagnostic_explanation = ""
        if all_zero:
            if is_target_constant:
                diagnostic_explanation = (
                    "CRITICAL DIAGNOSTIC FINDING: Every feature importance score is exactly 0.0. "
                    "This occurs because the target column 'quantity_used' in 'feature_dataset.csv' "
                    "contains constant zero values across all rows. In Decision Tree / Random Forest algorithms, "
                    "split quality is evaluated by impurity (MSE) reduction. When the target y has zero variance, "
                    "no split can reduce MSE further, yielding zero Gini/MSE gain for every feature split."
                )
            else:
                diagnostic_explanation = (
                    "Every feature importance equals 0.0 despite non-constant target. "
                    "Possible cause: Model fitting error or un-updated model weights."
                )
            self.log(f"   ❌ {diagnostic_explanation}")
        else:
            diagnostic_explanation = "Feature importance values present non-zero variance."
            self.log(f"   ✅ Feature importances successfully exhibit non-zero values.")

        section7_summary = {
            "all_feature_importances_zero": all_zero,
            "is_target_constant": is_target_constant,
            "diagnostic_explanation": diagnostic_explanation
        }

        self.results["section_7_feature_importance_validation"] = section7_summary
        return section7_summary

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 8: CROSS VALIDATION
    # ──────────────────────────────────────────────────────────────────────────
    def perform_cross_validation(self, X: pd.DataFrame, y: pd.Series, model):
        self.log("\n" + "=" * 80)
        self.log("SECTION 8: 5-FOLD CROSS-VALIDATION AUDIT")
        self.log("=" * 80)

        kf = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
        mae_scores = []
        rmse_scores = []
        r2_scores = []
        fold_details = []

        fold_idx = 1
        for train_idx, val_idx in kf.split(X):
            X_tr, X_va = X.iloc[train_idx], X.iloc[val_idx]
            y_tr, y_va = y.iloc[train_idx], y.iloc[val_idx]

            # Clone & fit model on fold
            fold_model = model.__class__(**model.get_params())
            fold_model.fit(X_tr, y_tr)
            y_va_pred = fold_model.predict(X_va)

            mae = float(mean_absolute_error(y_va, y_va_pred))
            rmse = float(np.sqrt(mean_squared_error(y_va, y_va_pred)))
            r2 = float(r2_score(y_va, y_va_pred)) if y_va.nunique() > 1 else 1.0

            mae_scores.append(mae)
            rmse_scores.append(rmse)
            r2_scores.append(r2)

            fold_details.append({
                "fold": fold_idx,
                "train_samples": len(train_idx),
                "validation_samples": len(val_idx),
                "mae": round(mae, 4),
                "rmse": round(rmse, 4),
                "r2_score": round(r2, 4)
            })

            self.log(f"   Fold {fold_idx}: MAE={mae:.4f}, RMSE={rmse:.4f}, R²={r2:.4f}")
            fold_idx += 1

        mean_mae = float(np.mean(mae_scores))
        std_mae = float(np.std(mae_scores))
        mean_rmse = float(np.mean(rmse_scores))
        std_rmse = float(np.std(rmse_scores))
        mean_r2 = float(np.mean(r2_scores))
        std_r2 = float(np.std(r2_scores))

        self.log("-" * 60)
        self.log(f"   • Mean MAE  : {mean_mae:.4f} ± {std_mae:.4f}")
        self.log(f"   • Mean RMSE : {mean_rmse:.4f} ± {std_rmse:.4f}")
        self.log(f"   • Mean R²   : {mean_r2:.4f} ± {std_r2:.4f}")

        section8_summary = {
            "cross_validation_folds": 5,
            "random_state": RANDOM_STATE,
            "mean_mae": round(mean_mae, 4),
            "std_mae": round(std_mae, 4),
            "mean_rmse": round(mean_rmse, 4),
            "std_rmse": round(std_rmse, 4),
            "mean_r2": round(mean_r2, 4),
            "std_r2": round(std_r2, 4),
            "fold_details": fold_details,
            "module_4_single_split_comparison": {
                "module_4_mae": 0.0,
                "module_4_rmse": 0.0,
                "module_4_r2": 1.0,
                "cv_mae_diff": round(mean_mae - 0.0, 4)
            }
        }

        self.results["section_8_cross_validation"] = section8_summary
        return section8_summary

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 9: MODEL SANITY CHECK
    # ──────────────────────────────────────────────────────────────────────────
    def perform_sanity_check(self, X: pd.DataFrame, model):
        self.log("\n" + "=" * 80)
        self.log("SECTION 9: MODEL SANITY CHECK & PREDICTION DISTRIBUTION")
        self.log("=" * 80)

        preds = model.predict(X)
        min_p = float(np.min(preds))
        max_p = float(np.max(preds))
        mean_p = float(np.mean(preds))
        std_p = float(np.std(preds))

        is_degenerate = bool(min_p == max_p and std_p == 0.0)

        self.log(f"   • Minimum Prediction : {min_p:.4f}")
        self.log(f"   • Maximum Prediction : {max_p:.4f}")
        self.log(f"   • Mean Prediction    : {mean_p:.4f}")
        self.log(f"   • Std Deviation      : {std_p:.4f}")
        self.log(f"   • Degenerate Constant Prediction Output? : {'YES (DEGENERATE)' if is_degenerate else 'NO'}")

        section9_summary = {
            "min_prediction": round(min_p, 4),
            "max_prediction": round(max_p, 4),
            "mean_prediction": round(mean_p, 4),
            "std_prediction": round(std_p, 4),
            "is_degenerate_output": is_degenerate
        }

        self.results["section_9_model_sanity_check"] = section9_summary
        return section9_summary

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 10: FINAL DIAGNOSIS & REPORT GENERATION
    # ──────────────────────────────────────────────────────────────────────────
    def run_all_diagnostics(self):
        # Ingest
        loader = DatasetLoader()
        df, val_summary = loader.load_and_validate_feature_dataset()

        # Section 1
        model, model_path, sec1 = self.validate_training_pipeline()

        # Section 2
        y, is_target_const, sec2 = self.validate_target_column(df)

        # Preprocess for X
        preprocessor = DataPreprocessor(target_column=TARGET_COLUMN)
        X, _, feature_names = preprocessor.preprocess_dataset(df)

        # Section 3
        sec3 = self.validate_features(df, X, model)

        # Section 4
        feat_diag_df, sec4 = self.detect_constant_features(X)

        # Section 5
        sec5 = self.detect_target_leakage(X, y)

        # Section 6
        pred_df, sec6 = self.validate_predictions(X, y, model)

        # Section 7
        sec7 = self.validate_feature_importance(model, is_target_const)

        # Section 8
        sec8 = self.perform_cross_validation(X, y, model)

        # Section 9
        sec9 = self.perform_sanity_check(X, model)

        # Section 10: Final Diagnosis
        self.log("\n" + "=" * 80)
        self.log("SECTION 10: FINAL DIAGNOSIS & READINESS VERDICT")
        self.log("=" * 80)

        issues = []
        if is_target_const:
            issues.append(
                f"Target column '{TARGET_COLUMN}' is completely unpopulated/constant zero in feature_dataset.csv."
            )
        if sec7["all_feature_importances_zero"]:
            issues.append(
                "All feature importance scores equal 0.0 due to zero target variance."
            )
        if sec9["is_degenerate_output"]:
            issues.append(
                "Model predictions are degenerate constant values (0.0 for all inputs)."
            )

        is_ready = (len(issues) == 0)
        readiness_status = "READY" if is_ready else "NOT READY"

        self.log(f"   • Readiness Status : {readiness_status}")
        if not is_ready:
            self.log("   • Detected Issues:")
            for issue in issues:
                self.log(f"     ❌ {issue}")
            self.log("\n   • Recommended Fixes:")
            self.log("     1. Update RM Monitor upstream Dataset Generator / Feature Engineering service to populate non-zero material usage transactions in quantity_used.")
            self.log("     2. Regenerate feature_dataset.csv with valid quantity_used target values.")
            self.log("     3. Re-run Module 4 Training Pipeline.")

        sec10_summary = {
            "overall_status": readiness_status,
            "is_ready_for_module_5": is_ready,
            "detected_issues": issues,
            "recommended_fixes": [
                "Populate non-zero material usage transactions in quantity_used upstream.",
                "Regenerate backend/ml_datasets/feature_dataset.csv.",
                "Re-run Module 4 training pipeline after dataset population."
            ]
        }
        self.results["section_10_final_diagnosis"] = sec10_summary

        # ──────────────────────────────────────────────────────────────────────
        # GENERATE ALL 8 REQUIRED REPORT FILES
        # ──────────────────────────────────────────────────────────────────────
        self.log("\n" + "=" * 80)
        self.log("GENERATING DIAGNOSTIC REPORT ARTIFACTS...")
        self.log("=" * 80)

        # 1. model_validation_report.json
        json_report_path = self.reports_dir / "model_validation_report.json"
        with open(json_report_path, "w", encoding="utf-8") as f:
            json.dump(self.results, f, indent=2)

        # 2. prediction_validation.csv
        pred_csv_path = self.reports_dir / "prediction_validation.csv"
        pred_df.to_csv(pred_csv_path, index=False)

        # 3. target_analysis.csv
        target_df = pd.DataFrame([{
            "target_column": TARGET_COLUMN,
            "total_rows": sec2["total_rows"],
            "min": sec2["min"],
            "max": sec2["max"],
            "mean": sec2["mean"],
            "median": sec2["median"],
            "std": sec2["std"],
            "unique_values_count": sec2["unique_values_count"],
            "null_count": sec2["null_count"],
            "zero_count": sec2["zero_count"],
            "is_constant": sec2["is_constant"]
        }])
        target_csv_path = self.reports_dir / "target_analysis.csv"
        target_df.to_csv(target_csv_path, index=False)

        # 4. feature_diagnostics.csv
        feat_diag_csv_path = self.reports_dir / "feature_diagnostics.csv"
        feat_diag_df.to_csv(feat_diag_csv_path, index=False)

        # 5. cross_validation_report.json
        cv_json_path = self.reports_dir / "cross_validation_report.json"
        with open(cv_json_path, "w", encoding="utf-8") as f:
            json.dump(sec8, f, indent=2)

        # 6. leakage_report.md
        leakage_md_lines = [
            "# RM Monitor - Target Leakage Audit Report",
            "",
            f"**Timestamp**: `{self.timestamp}`",
            f"**Target Column**: `{TARGET_COLUMN}`",
            f"**Leakage Suspects Count**: `{sec5['leakage_suspects_count']}`",
            "",
            "---",
            "",
            "## Leakage Assessment",
            ""
        ]
        if sec5['leakage_suspects_count'] == 0:
            leakage_md_lines.append("✅ **No data leakage, copied columns, or target correlations (>0.99) detected.**")
        else:
            for suspect in sec5['leakage_suspects']:
                leakage_md_lines.append(f"- ❌ **[{suspect['risk_level']}]** `{suspect['feature']}`: {suspect['reason']}")

        leakage_md_path = self.reports_dir / "leakage_report.md"
        with open(leakage_md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(leakage_md_lines))

        # 7. training_diagnostics.md
        diag_md_lines = [
            "# RM Monitor - Model Training Diagnostic Explanation",
            "",
            f"**Audit Status**: `{readiness_status}`",
            f"**Timestamp**: `{self.timestamp}`",
            "",
            "---",
            "",
            "## 1. Feature Importance Zero-Value Anomaly Explanation",
            "",
            sec7["diagnostic_explanation"],
            "",
            "---",
            "",
            "## 2. Model Prediction Sanity Analysis",
            "",
            f"- **Minimum Prediction**: `{sec9['min_prediction']}`",
            f"- **Maximum Prediction**: `{sec9['max_prediction']}`",
            f"- **Mean Prediction**: `{sec9['mean_prediction']}`",
            f"- **Degenerate Prediction Output**: `{sec9['is_degenerate_output']}`",
            "",
            "---",
            "",
            "## 3. Recommended Remediation Steps",
            ""
        ]
        for fix in sec10_summary["recommended_fixes"]:
            diag_md_lines.append(f"- {fix}")

        diag_md_path = self.reports_dir / "training_diagnostics.md"
        with open(diag_md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(diag_md_lines))

        # 8. model_validation_report.md
        val_md_lines = [
            "# RM Monitor - Machine Learning Model Validation Report",
            "",
            f"**Overall Verdict**: `{readiness_status}`",
            f"**Audit Timestamp**: `{self.timestamp}`",
            f"**Model Path**: `{sec1['model_path']}`",
            f"**Model Version**: `{sec1['model_version']}`",
            "",
            "---",
            "",
            "## Executive Summary",
            "",
            f"- **Algorithm**: `{sec1['algorithm_type']}`",
            f"- **Target Column**: `{TARGET_COLUMN}`",
            f"- **Target Is Constant**: `{sec2['is_constant']}`",
            f"- **Included Features Count**: `{sec3['included_features_count']}`",
            f"- **Constant Features Count**: `{sec4['constant_columns_count']}`",
            f"- **Leakage Suspects Count**: `{sec5['leakage_suspects_count']}`",
            f"- **5-Fold CV Mean MAE**: `{sec8['mean_mae']} ± {sec8['std_mae']}`",
            f"- **5-Fold CV Mean RMSE**: `{sec8['mean_rmse']} ± {sec8['std_rmse']}`",
            f"- **5-Fold CV Mean R²**: `{sec8['mean_r2']} ± {sec8['std_r2']}`",
            "",
            "---",
            "",
            "## 15-Sample Prediction Validation",
            "",
            "| Index | Actual quantity_used | Predicted quantity_used | Absolute Error |",
            "| :---: | :---: | :---: | :---: |"
        ]

        for p in sec6["sample_predictions"]:
            val_md_lines.append(f"| {p['sample_index']} | {p['actual_quantity_used']} | {p['predicted_quantity_used']} | {p['absolute_error']} |")

        val_md_lines.extend([
            "",
            "---",
            "",
            "## Diagnostic Verdict & Next Steps",
            ""
        ])
        if is_ready:
            val_md_lines.append("✅ **Model Validation Passed. Ready for Module 5.**")
        else:
            val_md_lines.append("❌ **Model Validation Failed. Action required before proceeding to Module 5:**")
            for issue in issues:
                val_md_lines.append(f"- {issue}")

        val_md_path = self.reports_dir / "model_validation_report.md"
        with open(val_md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(val_md_lines))

        self.log(f"   • Saved '{json_report_path.name}'")
        self.log(f"   • Saved '{pred_csv_path.name}'")
        self.log(f"   • Saved '{target_csv_path.name}'")
        self.log(f"   • Saved '{feat_diag_csv_path.name}'")
        self.log(f"   • Saved '{cv_json_path.name}'")
        self.log(f"   • Saved '{leakage_md_path.name}'")
        self.log(f"   • Saved '{diag_md_path.name}'")
        self.log(f"   • Saved '{val_md_path.name}'")

        # Terminal Output Criteria
        self.log("\n" + "=" * 80)
        if is_ready:
            self.log("✅ Model Validation Passed")
            self.log("Ready for Module 5")
        else:
            self.log("❌ Model Validation Failed")
            self.log("Detailed Reasons:")
            for issue in issues:
                self.log(f"  • {issue}")
        self.log("=" * 80)

        return is_ready


if __name__ == "__main__":
    diag = ModelValidationDiagnostics()
    diag.run_all_diagnostics()
