import os
import sys
from pathlib import Path
import pandas as pd

# Add ai_training directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

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
        """
        Loads and validates the feature dataset for model training.

        Validation Steps:
        1. Verify dataset exists and is readable.
        2. Check dataset is not empty and has at least MIN_ROWS_REQUIRED (50 rows).
        3. Verify target column exists.
        4. Detect and purge duplicate rows.
        5. Generate validation summary report.

        Returns:
            (cleaned_dataframe, validation_summary_dict)
        """
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

        # 1. File existence
        if not self.feature_dataset_path.exists():
            err_msg = f"Dataset file does not exist at '{self.feature_dataset_path}'."
            validation_summary["errors"].append(err_msg)
            raise FileNotFoundError(err_msg)
        validation_summary["file_exists"] = True

        # 2. Readability and empty check
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

        # 3. Minimum row check
        if len(df) < MIN_ROWS_REQUIRED:
            err_msg = (
                f"Insufficient data rows: Dataset contains {len(df)} rows, "
                f"which is less than the minimum required threshold of {MIN_ROWS_REQUIRED} rows."
            )
            validation_summary["errors"].append(err_msg)
            raise DatasetValidationError(err_msg)

        # 4. Target column verification
        if TARGET_COLUMN not in df.columns:
            err_msg = (
                f"Target column '{TARGET_COLUMN}' is missing from the dataset columns. "
                f"Available columns: {list(df.columns)}"
            )
            validation_summary["errors"].append(err_msg)
            raise DatasetValidationError(err_msg)
        validation_summary["target_column_present"] = True

        # 5. Duplicate detection & removal
        duplicate_count = int(df.duplicated().sum())
        validation_summary["duplicate_rows_detected"] = duplicate_count
        if duplicate_count > 0:
            df = df.drop_duplicates().reset_index(drop=True)
            validation_summary["duplicate_rows_removed"] = duplicate_count
            print(f"[DatasetLoader] Purged {duplicate_count} duplicate rows before training.")

        validation_summary["final_rows"] = len(df)

        # 6. Check again if rows after deduplication meet threshold
        if len(df) < MIN_ROWS_REQUIRED:
            err_msg = (
                f"Insufficient data rows after duplicate removal: {len(df)} rows remain, "
                f"below minimum threshold of {MIN_ROWS_REQUIRED} rows."
            )
            validation_summary["errors"].append(err_msg)
            raise DatasetValidationError(err_msg)

        # 7. Missing value summary
        missing_counts = {col: int(df[col].isnull().sum()) for col in df.columns if df[col].isnull().sum() > 0}
        validation_summary["missing_values_count"] = missing_counts
        validation_summary["validation_status"] = "PASSED"

        print(
            f"[DatasetLoader] Validation PASSED. Dataset has {len(df)} valid rows and {len(df.columns)} columns "
            f"({duplicate_count} duplicate rows purged)."
        )

        return df, validation_summary

    def load_clean_dataset(self) -> pd.DataFrame:
        """
        Loads the sanitized clean dataset from RM Monitor.
        """
        if not os.path.exists(CLEAN_DATASET_CSV):
            raise FileNotFoundError(
                f"Clean warehouse dataset not found at '{CLEAN_DATASET_CSV}'."
            )
        return pd.read_csv(CLEAN_DATASET_CSV)


if __name__ == "__main__":
    loader = DatasetLoader()
    try:
        df, summary = loader.load_and_validate_feature_dataset()
        print("[DatasetLoader Test] Validation Status:", summary["validation_status"])
        print("[DatasetLoader Test] Head columns:", list(df.columns[:5]))
    except Exception as e:
        print("[DatasetLoader Test Error]:", e)

