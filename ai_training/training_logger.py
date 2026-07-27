import os
import json
import csv
import pandas as pd
from datetime import datetime
from pathlib import Path

try:
    from config import REPORTS_DIR
except ImportError:
    from ai_training.config import REPORTS_DIR



class TrainingLogger:
    """
    TrainingLogger
    ──────────────
    Generates training reports, metrics summaries, feature importance tables,
    and plain text execution logs in ai_training/reports/.
    """

    def __init__(self, reports_dir=None):
        self.reports_dir = Path(reports_dir or REPORTS_DIR)
        os.makedirs(self.reports_dir, exist_ok=True)
        self.log_messages = []

    def log(self, message: str):
        """Appends log message with timestamp."""
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = f"[{ts}] {message}"
        self.log_messages.append(entry)
        print(message)

    def save_reports(
        self,
        validation_summary: dict,
        model_config: dict,
        evaluation_results: dict,
        feature_importance_df: pd.DataFrame,
        export_info: dict,
        training_duration_sec: float
    ) -> dict:
        """
        Generates all required report files:
        1. training_report.md
        2. training_metrics.json
        3. feature_importance.csv
        4. feature_importance.json
        5. training_log.txt
        """

        timestamp_iso = datetime.now().isoformat()
        model_version = export_info.get("model_version", "v1")
        export_path = export_info.get("export_path", "")
        test_metrics = evaluation_results.get("test_metrics", {})
        error_summary = evaluation_results.get("prediction_error_summary", {})

        # Top 10 Feature Importance
        top10_df = feature_importance_df.head(10)
        top10_list = top10_df.to_dict(orient="records")

        # 1. training_metrics.json
        metrics_json_data = {
            "timestamp": timestamp_iso,
            "model_version": model_version,
            "model_path": export_path,
            "algorithm": "RandomForestRegressor",
            "training_duration_seconds": round(training_duration_sec, 4),
            "data_validation": validation_summary,
            "hyperparameters": model_config,
            "sample_counts": {
                "training_samples": evaluation_results.get("training_samples"),
                "testing_samples": evaluation_results.get("testing_samples")
            },
            "performance_metrics": test_metrics,
            "prediction_error_summary": error_summary,
            "top_10_features": top10_list
        }
        metrics_json_path = self.reports_dir / "training_metrics.json"
        with open(metrics_json_path, "w", encoding="utf-8") as f:
            json.dump(metrics_json_data, f, indent=2)

        # 2. feature_importance.csv & feature_importance.json
        fi_csv_path = self.reports_dir / "feature_importance.csv"
        feature_importance_df.to_csv(fi_csv_path, index=False)

        fi_json_path = self.reports_dir / "feature_importance.json"
        fi_dict_list = feature_importance_df.to_dict(orient="records")
        with open(fi_json_path, "w", encoding="utf-8") as f:
            json.dump(fi_dict_list, f, indent=2)

        # 3. training_log.txt
        log_txt_path = self.reports_dir / "training_log.txt"
        with open(log_txt_path, "w", encoding="utf-8") as f:
            f.write("\n".join(self.log_messages) + "\n")

        # 4. training_report.md
        report_md_lines = [
            "# RM Monitor - ML Model Training Report",
            "",
            f"**Model Version**: `{model_version}`",
            f"**Algorithm**: `RandomForestRegressor`",
            f"**Training Timestamp**: `{timestamp_iso}`",
            f"**Training Duration**: `{training_duration_sec:.2f} seconds`",
            f"**Model Export Path**: `{export_path}`",
            "",
            "---",
            "",
            "## 1. Executive Summary",
            "",
            f"- **Validation Status**: `{validation_summary.get('validation_status')}`",
            f"- **Total Raw Rows**: `{validation_summary.get('raw_rows')}`",
            f"- **Duplicates Removed**: `{validation_summary.get('duplicate_rows_removed')}`",
            f"- **Final Ingested Rows**: `{validation_summary.get('final_rows')}`",
            f"- **Train / Test Split**: `{evaluation_results.get('training_samples')} Training (80%) | {evaluation_results.get('testing_samples')} Testing (20%)`",
            "",
            "---",
            "",
            "## 2. Model Performance Metrics (Test Set)",
            "",
            "| Metric | Value |",
            "| :--- | :--- |",
            f"| **MAE (Mean Absolute Error)** | **{test_metrics.get('mae')}** |",
            f"| **RMSE (Root Mean Squared Error)** | **{test_metrics.get('rmse')}** |",
            f"| **R² Score** | **{test_metrics.get('r2_score')}** |",
            "",
            "### Residual & Prediction Error Summary",
            "",
            f"- **Mean Error**: `{error_summary.get('mean_error')}`",
            f"- **Std Error**: `{error_summary.get('std_error')}`",
            f"- **Min Error**: `{error_summary.get('min_error')}`",
            f"- **Max Error**: `{error_summary.get('max_error')}`",
            f"- **Median Absolute Error**: `{error_summary.get('median_absolute_error')}`",
            "",
            "---",
            "",
            "## 3. Top 10 Important Features",
            "",
            "| Rank | Feature Name | Importance Score | Percentage |",
            "| :---: | :--- | :---: | :---: |"
        ]

        for _, row in top10_df.iterrows():
            rank = int(row['rank'])
            feat = row['feature_name']
            score = row['importance']
            pct = score * 100
            report_md_lines.append(f"| {rank} | `{feat}` | `{score:.6f}` | `{pct:.2f}%` |")

        report_md_lines.extend([
            "",
            "---",
            "",
            "## 4. Hyperparameters",
            "```json",
            json.dumps(model_config, indent=2),
            "```",
            "",
            "---",
            "",
            "## 5. Artifact Output Summary",
            f"- **Model File**: `{export_path}`",
            f"- **Metrics JSON**: `{metrics_json_path}`",
            f"- **Feature Importance CSV**: `{fi_csv_path}`",
            f"- **Feature Importance JSON**: `{fi_json_path}`",
            f"- **Execution Log**: `{log_txt_path}`"
        ])

        report_md_path = self.reports_dir / "training_report.md"
        with open(report_md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(report_md_lines))

        print(f"[TrainingLogger] Reports generated successfully in '{self.reports_dir}'.")

        return {
            "training_report_md": str(report_md_path),
            "training_metrics_json": str(metrics_json_path),
            "feature_importance_csv": str(fi_csv_path),
            "feature_importance_json": str(fi_json_path),
            "training_log_txt": str(log_txt_path)
        }


if __name__ == "__main__":
    import pandas as pd
    logger = TrainingLogger()
    logger.log("[TrainingLogger Test] Logger initialized.")

