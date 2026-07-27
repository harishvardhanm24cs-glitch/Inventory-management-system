import os
import pandas as pd
from pathlib import Path

try:
    from config import FEATURE_DATASET_CSV, CLEAN_DATASET_CSV, TARGET_COLUMN, MIN_ROWS_REQUIRED
except ImportError:
    from ai_training.config import FEATURE_DATASET_CSV, CLEAN_DATASET_CSV, TARGET_COLUMN, MIN_ROWS_REQUIRED


class DatasetValidationError(Exception):
    """Custom exception raised when dataset validation checks fail."""
    pass


class DatasetLoader:
    """
    DatasetLoader
    ─────────────
    Reads exported warehouse datasets from RM Monitor (backend/ml_datasets/)
    without duplicating operational tables. Performs strict validation checks.
    """

    def __init__(self, feature_dataset_path=None):
        self.feature_dataset_path = Path(feature_dataset_path or FEATURE_DATASET_CSV)

    def load_and_validate_feature_dataset(self) -> tuple[pd.DataFrame, dict]:
        validation_summary = {
            "dataset_path": str(self.feature_dataset_path),
            "file_exists": False,
            "readable": False,
            "raw_rows": 0,
            "raw_columns": 0,
            "duplicate_rows_detected": 0,
            "duplicate_rows_removed": 0,
            "final_rows": 0,
            "missing_values_count": {},
            "target_column_present": False,
            "validation_status": "FAILED",
            "errors": []
        }

        if not self.feature_dataset_path.exists():
            err_msg = f"Dataset file does not exist at '{self.feature_dataset_path}'."
            validation_summary["errors"].append(err_msg)
            raise FileNotFoundError(err_msg)
        validation_summary["file_exists"] = True

        try:
            df = pd.read_csv(self.feature_dataset_path)
            validation_summary["readable"] = True
        except Exception as e:
            err_msg = f"Dataset file is unreadable or corrupted: {e}"
            validation_summary["errors"].append(err_msg)
            raise DatasetValidationError(err_msg)

        validation_summary["raw_rows"] = len(df)
        validation_summary["raw_columns"] = len(df.columns)

        if len(df) == 0:
            err_msg = f"Dataset at '{self.feature_dataset_path}' is completely empty (0 rows)."
            validation_summary["errors"].append(err_msg)
            raise DatasetValidationError(err_msg)

        if len(df) < MIN_ROWS_REQUIRED:
            err_msg = f"Insufficient data rows: {len(df)} rows found, less than required {MIN_ROWS_REQUIRED}."
            validation_summary["errors"].append(err_msg)
            raise DatasetValidationError(err_msg)

        if TARGET_COLUMN not in df.columns:
            err_msg = f"Target column '{TARGET_COLUMN}' is missing from the dataset columns."
            validation_summary["errors"].append(err_msg)
            raise DatasetValidationError(err_msg)
        validation_summary["target_column_present"] = True

        duplicate_count = int(df.duplicated().sum())
        validation_summary["duplicate_rows_detected"] = duplicate_count
        if duplicate_count > 0:
            df = df.drop_duplicates().reset_index(drop=True)
            validation_summary["duplicate_rows_removed"] = duplicate_count
            print(f"[DatasetLoader] Purged {duplicate_count} duplicate rows before training.")

        validation_summary["final_rows"] = len(df)

        if len(df) < MIN_ROWS_REQUIRED:
            err_msg = f"Insufficient data rows after duplicate removal: {len(df)} rows remain."
            validation_summary["errors"].append(err_msg)
            raise DatasetValidationError(err_msg)

        missing_counts = {col: int(df[col].isnull().sum()) for col in df.columns if df[col].isnull().sum() > 0}
        validation_summary["missing_values_count"] = missing_counts
        validation_summary["validation_status"] = "PASSED"

        print(
            f"[DatasetLoader] Validation PASSED. Dataset has {len(df)} valid rows and {len(df.columns)} columns "
            f"({duplicate_count} duplicate rows purged)."
        )

        return df, validation_summary

    def load_clean_dataset(self) -> pd.DataFrame:
        if not os.path.exists(CLEAN_DATASET_CSV):
            raise FileNotFoundError(f"Clean warehouse dataset not found at '{CLEAN_DATASET_CSV}'.")
        return pd.read_csv(CLEAN_DATASET_CSV)


__all__ = ["DatasetLoader", "DatasetValidationError"]

