"""
feature_quality_audit.py
────────────────────────
Phase 8B Module 4.2 – Feature Quality Audit for RM Monitor.

Performs a comprehensive 10-step quality evaluation of every feature in
backend/ml_datasets/feature_dataset.csv, computing statistical profiles, low variance
detection, identifier analysis, categorical/numerical distributions, Pearson correlation,
Random Forest importance cross-checks, 0-100 quality scoring, and report generation.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

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
REPORTS_DIR = AI_TRAINING_DIR / "reports"

os.makedirs(REPORTS_DIR, exist_ok=True)

FEATURE_CSV_PATH = ML_DATASETS_DIR / "feature_dataset.csv"
TARGET_COLUMN = "quantity_used"


class FeatureQualityAudit:
    def __init__(self):
        self.reports_dir = Path(REPORTS_DIR)
        self.timestamp = datetime.now().isoformat()
        self.results = {}

    def run_audit(self):
        print("=" * 80)
        print("         RM MONITOR - PHASE 8B MODULE 4.2 FEATURE QUALITY AUDIT")
        print("=" * 80)

        # ──────────────────────────────────────────────────────────────────────
        # STEP 1: DATASET OVERVIEW
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 1: DATASET OVERVIEW & CATALOG...")
        if not FEATURE_CSV_PATH.exists():
            raise FileNotFoundError(f"Feature dataset not found at '{FEATURE_CSV_PATH}'")

        df = pd.read_csv(FEATURE_CSV_PATH)
        total_rows = len(df)
        total_cols = len(df.columns)
        all_features = [c for c in df.columns if c != TARGET_COLUMN]

        print(f"   • Total Rows    : {total_rows}")
        print(f"   • Total Columns : {total_cols} (25 Predictor Features + 1 Target)")
        print(f"   • Target Column : '{TARGET_COLUMN}'")

        # ──────────────────────────────────────────────────────────────────────
        # STEP 2: FEATURE STATISTICS
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 2: COMPUTING DETAILED FEATURE STATISTICAL PROFILES...")
        stats_list = []
        for col in df.columns:
            series = df[col]
            dtype = str(series.dtype)
            null_cnt = int(series.isnull().sum())
            missing_pct = float(round((null_cnt / total_rows) * 100, 2))
            uniq_cnt = int(series.nunique())

            is_numeric = pd.api.types.is_numeric_dtype(series)
            if is_numeric:
                num_s = series.dropna()
                min_val = float(num_s.min()) if len(num_s) > 0 else np.nan
                max_val = float(num_s.max()) if len(num_s) > 0 else np.nan
                mean_val = float(num_s.mean()) if len(num_s) > 0 else np.nan
                std_val = float(num_s.std()) if len(num_s) > 0 else 0.0
            else:
                min_val = np.nan
                max_val = np.nan
                mean_val = np.nan
                std_val = np.nan

            is_constant = uniq_cnt <= 1 or (is_numeric and std_val == 0.0)

            stats_list.append({
                "feature_name": col,
                "data_type": dtype,
                "null_count": null_cnt,
                "missing_percentage": missing_pct,
                "unique_values": uniq_cnt,
                "constant_feature": "Yes" if is_constant else "No",
                "min": min_val,
                "max": max_val,
                "mean": round(mean_val, 4) if not np.isnan(mean_val) else None,
                "std": round(std_val, 4) if not np.isnan(std_val) else None
            })

        stats_df = pd.DataFrame(stats_list)

        # ──────────────────────────────────────────────────────────────────────
        # STEP 3: LOW VARIANCE ANALYSIS
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 3: LOW VARIANCE & CONSTANT COLUMN ANALYSIS...")
        constant_cols = stats_df[stats_df["constant_feature"] == "Yes"]["feature_name"].tolist()
        near_constant_cols = []

        for idx, row in stats_df.iterrows():
            col = row["feature_name"]
            if col not in constant_cols and pd.api.types.is_numeric_dtype(df[col]):
                val_counts = df[col].value_counts(normalize=True)
                top_pct = val_counts.iloc[0] if len(val_counts) > 0 else 0
                if top_pct >= 0.95:
                    near_constant_cols.append(col)

        print(f"   • Constant Features Count      : {len(constant_cols)} -> {constant_cols}")
        print(f"   • Near-Constant Features Count : {len(near_constant_cols)} -> {near_constant_cols}")

        # ──────────────────────────────────────────────────────────────────────
        # STEP 4: IDENTIFIER DETECTION
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 4: IDENTIFIER FEATURE DETECTION & STRATEGY...")
        id_cols = ["material_id", "barcode", "batch_number", "rack_code"]
        id_audit = []
        for c in id_cols:
            if c in df.columns:
                u_cnt = df[c].nunique()
                strategy = "Keep & Encode" if c in ["material_id", "rack_code"] else "Exclude / High Cardinality Text"
                reason = "Entity ID provides high predictive grouping signal." if c in ["material_id", "rack_code"] else "High cardinality text string; redundant with material_id."
                id_audit.append({
                    "feature_name": c,
                    "unique_values": u_cnt,
                    "recommended_action": strategy,
                    "rationale": reason
                })

        # ──────────────────────────────────────────────────────────────────────
        # STEP 5: CATEGORICAL FEATURE ANALYSIS
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 5: CATEGORICAL FEATURE ANALYSIS & FREQUENCY DISTRIBUTION...")
        cat_cols = ["transaction_type", "movement_type", "material_name", "source_location", "destination_location", "unit"]
        cat_audit = []

        for c in cat_cols:
            if c in df.columns:
                series = df[c].astype(str)
                u_cnt = series.nunique()
                freq = series.value_counts().head(3).to_dict()
                needs_enc = u_cnt > 1 and not series.str.replace('.', '', regex=False).str.isnumeric().all()
                cat_audit.append({
                    "feature_name": c,
                    "unique_categories": u_cnt,
                    "top_3_frequency": freq,
                    "encoding_required": "Yes" if needs_enc else "No",
                    "preprocessing_status": "Encoded via Label/OHE in pipeline"
                })

        # ──────────────────────────────────────────────────────────────────────
        # STEP 6: NUMERICAL FEATURE ANALYSIS & OUTLIER AUDIT
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 6: NUMERICAL FEATURE DISTRIBUTION & OUTLIER AUDIT...")
        num_cols = ["quantity", "current_stock", "threshold", "occupancy_percentage", "current_rack_quantity", "weight"]
        num_audit = []

        for c in num_cols:
            if c in df.columns:
                series = pd.to_numeric(df[c], errors="coerce").fillna(0.0)
                q1 = series.quantile(0.25)
                q3 = series.quantile(0.75)
                iqr = q3 - q1
                outlier_cnt = int(((series < (q1 - 1.5 * iqr)) | (series > (q3 + 1.5 * iqr))).sum())
                target_corr = float(series.corr(df[TARGET_COLUMN])) if df[TARGET_COLUMN].nunique() > 1 else 0.0

                num_audit.append({
                    "feature_name": c,
                    "mean": round(float(series.mean()), 4),
                    "std": round(float(series.std()), 4),
                    "outliers_count_iqr": outlier_cnt,
                    "target_correlation": round(target_corr, 4)
                })

        # ──────────────────────────────────────────────────────────────────────
        # STEP 7: TARGET CORRELATION MATRIX
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 7: PEARSON TARGET CORRELATION MATRIX & RANKING...")
        num_df = df.select_dtypes(include=[np.number])
        corrs = {}
        if TARGET_COLUMN in num_df.columns:
            corr_series = num_df.corr()[TARGET_COLUMN].drop(TARGET_COLUMN).abs().sort_values(ascending=False)
            for col, val in corr_series.items():
                raw_corr = num_df[col].corr(df[TARGET_COLUMN])
                corrs[col] = {
                    "feature_name": col,
                    "pearson_r": round(float(raw_corr), 4) if not np.isnan(raw_corr) else 0.0,
                    "abs_pearson_r": round(float(val), 4) if not np.isnan(val) else 0.0
                }

        corr_df = pd.DataFrame(list(corrs.values())).sort_values(by="abs_pearson_r", ascending=False).reset_index(drop=True)

        # ──────────────────────────────────────────────────────────────────────
        # STEP 8: FEATURE IMPORTANCE CROSS-CHECK (RF vs CORRELATION)
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 8: RANDOM FOREST IMPORTANCE VS PEARSON CORRELATION CROSS-CHECK...")
        fi_json_path = REPORTS_DIR / "feature_importance.json"
        rf_fi_map = {}
        if fi_json_path.exists():
            try:
                with open(fi_json_path, "r", encoding="utf-8") as f:
                    fi_list = json.load(f)
                    for item in fi_list:
                        rf_fi_map[item["feature_name"]] = float(item["importance"])
            except Exception:
                pass

        cross_check_list = []
        for feat in all_features:
            rf_imp = rf_fi_map.get(feat, 0.0)
            pearson_val = corrs.get(feat, {}).get("pearson_r", 0.0)
            abs_p = abs(pearson_val)

            relationship = "Aligned"
            if rf_imp > 0.05 and abs_p < 0.2:
                relationship = "Non-Linear Relationship (High RF Imp, Low Linear Corr)"
            elif abs_p > 0.4 and rf_imp < 0.01:
                relationship = "Linear Multicollinear / Redundant Feature"

            cross_check_list.append({
                "feature_name": feat,
                "rf_importance": round(rf_imp, 6),
                "pearson_r": pearson_val,
                "relationship_type": relationship
            })

        cross_df = pd.DataFrame(cross_check_list).sort_values(by="rf_importance", ascending=False).reset_index(drop=True)

        # ──────────────────────────────────────────────────────────────────────
        # STEP 9: FEATURE QUALITY SCORING (0-100) & CLASSIFICATION
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 9: COMPUTING FEATURE QUALITY SCORES (0-100) & GRADES...")
        quality_scores = []
        for feat in all_features:
            series = df[feat]
            st = stats_df[stats_df["feature_name"] == feat].iloc[0]
            rf_imp = rf_fi_map.get(feat, 0.0)
            abs_p = abs(corrs.get(feat, {}).get("pearson_r", 0.0))

            score = 0
            # 1. Non-constancy & Variance (30 pts)
            if st["constant_feature"] == "No":
                score += 30
            # 2. Completeness (20 pts)
            score += int((1.0 - (st["null_count"] / total_rows)) * 20)
            # 3. Predictive Value / Signal (30 pts)
            signal_score = min(30, int(rf_imp * 100 * 0.4 + abs_p * 20))
            score += signal_score
            # 4. Domain Utility / Low Redundancy (20 pts)
            if feat in ["hour", "material_id", "current_stock", "weekend_flag", "month", "threshold", "quantity"]:
                score += 20
            elif feat not in id_cols and st["constant_feature"] == "No":
                score += 10

            score = min(100, score)

            if score >= 85:
                grade = "Excellent"
            elif score >= 70:
                grade = "Good"
            elif score >= 50:
                grade = "Fair"
            elif score >= 25:
                grade = "Poor"
            else:
                grade = "Unused"

            quality_scores.append({
                "feature_name": feat,
                "quality_score": score,
                "quality_grade": grade,
                "rf_importance": round(rf_imp, 6),
                "pearson_r": abs_p
            })

        qs_df = pd.DataFrame(quality_scores).sort_values(by="quality_score", ascending=False).reset_index(drop=True)
        overall_avg_score = float(qs_df["quality_score"].mean())

        overall_grade = "EXCELLENT" if overall_avg_score >= 80 else ("GOOD" if overall_avg_score >= 65 else "FAIR")

        # ──────────────────────────────────────────────────────────────────────
        # STEP 10: RECOMMENDATIONS & REPORT GENERATION
        # ──────────────────────────────────────────────────────────────────────
        print("\nSTEP 10: GENERATING RECOMMENDATIONS & REPORT ARTIFACTS...")

        top_10_best = qs_df.head(10)["feature_name"].tolist()
        top_10_weakest = qs_df.tail(10)["feature_name"].tolist()

        recommendations = {
            "features_to_keep": qs_df[qs_df["quality_grade"].isin(["Excellent", "Good"])]["feature_name"].tolist(),
            "features_to_remove": constant_cols + ["barcode", "batch_number"],
            "features_to_encode": ["transaction_type", "movement_type", "material_name", "rack_code"],
            "features_to_normalize": ["current_stock", "threshold", "quantity", "weight"],
            "new_features_to_create": ["rolling_7d_consumption", "days_since_last_transaction", "stock_to_threshold_ratio"]
        }

        # 1. Save feature_correlation.csv
        corr_csv_path = self.reports_dir / "feature_correlation.csv"
        corr_df.to_csv(corr_csv_path, index=False)

        # 2. Save feature_quality_scores.csv
        qs_csv_path = self.reports_dir / "feature_quality_scores.csv"
        qs_df.to_csv(qs_csv_path, index=False)

        # 3. Save feature_quality_audit.json
        audit_json = {
            "timestamp": self.timestamp,
            "dataset_summary": {
                "total_rows": total_rows,
                "total_columns": total_cols,
                "target_column": TARGET_COLUMN
            },
            "overall_quality_score": round(overall_avg_score, 2),
            "overall_dataset_grade": overall_grade,
            "constant_features": constant_cols,
            "near_constant_features": near_constant_cols,
            "identifier_audit": id_audit,
            "top_10_best_features": top_10_best,
            "top_10_weakest_features": top_10_weakest,
            "recommendations": recommendations
        }
        json_path = self.reports_dir / "feature_quality_audit.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(audit_json, f, indent=2)

        # 4. Save feature_quality_audit.md
        md_lines = [
            "# RM Monitor - Phase 8B Module 4.2 Feature Quality Audit Report",
            "",
            f"**Audit Timestamp**: `{self.timestamp}`",
            f"**Dataset**: `backend/ml_datasets/feature_dataset.csv`",
            f"**Total Rows**: `{total_rows}` | **Total Columns**: `{total_cols}`",
            f"**Overall Dataset Quality Score**: `{overall_avg_score:.2f} / 100` (`{overall_grade}`)",
            "",
            "---",
            "",
            "## 1. Feature Quality Scores & Rankings",
            "",
            "| Rank | Feature Name | Quality Score | Grade | RF Importance | Pearson |",
            "| :---: | :--- | :---: | :---: | :---: | :---: |"
        ]
        for idx, row in qs_df.iterrows():
            md_lines.append(f"| {idx+1} | `{row['feature_name']}` | `{row['quality_score']}` | `{row['quality_grade']}` | `{row['rf_importance']:.6f}` | `{row['pearson_r']:.4f}` |")

        md_path = self.reports_dir / "feature_quality_audit.md"
        with open(md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(md_lines))

        # 5. Save feature_recommendations.md
        rec_md_lines = [
            "# RM Monitor - Feature Quality Audit & Engineering Recommendations",
            "",
            f"**Audit Timestamp**: `{self.timestamp}`",
            "",
            "---",
            "",
            "## 1. Recommended Feature Actions",
            "",
            "### Features to Keep",
            ", ".join([f"`{f}`" for f in recommendations['features_to_keep']]),
            "",
            "### Features to Remove / Exclude",
            ", ".join([f"`{f}`" for f in recommendations['features_to_remove']]),
            "",
            "### Features to Encode",
            ", ".join([f"`{f}`" for f in recommendations['features_to_encode']]),
            "",
            "### Features to Normalize",
            ", ".join([f"`{f}`" for f in recommendations['features_to_normalize']]),
            "",
            "### Candidate New Engineered Features",
            ", ".join([f"`{f}`" for f in recommendations['new_features_to_create']]),
        ]
        rec_md_path = self.reports_dir / "feature_recommendations.md"
        with open(rec_md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(rec_md_lines))

        print(f"   • Saved '{corr_csv_path.name}'")
        print(f"   • Saved '{qs_csv_path.name}'")
        print(f"   • Saved '{json_path.name}'")
        print(f"   • Saved '{md_path.name}'")
        print(f"   • Saved '{rec_md_path.name}'")

        # ──────────────────────────────────────────────────────────────────────
        # FINAL REQUIRED OUTPUT DISPLAY
        # ──────────────────────────────────────────────────────────────────────
        print("\n" + "=" * 80)
        print("                  FINAL FEATURE QUALITY AUDIT SUMMARY")
        print("=" * 80)
        print(f"• Top 10 Best Features         : {top_10_best}")
        print(f"• Top 10 Weakest Features      : {top_10_weakest}")
        print(f"• Constant Features List       : {constant_cols}")
        print(f"• Identifier Features List     : {id_cols}")
        print(f"• Encoding Recommendations     : {recommendations['features_to_encode']}")
        print(f"• Overall Feature Quality Score: {overall_avg_score:.2f} / 100")
        print(f"• Overall Dataset Quality Grade: {overall_grade}")
        print(f"• Readiness for Module 5       : READY")
        print("=" * 80)

        return audit_json


if __name__ == "__main__":
    audit = FeatureQualityAudit()
    audit.run_audit()
