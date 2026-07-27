import json
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

try:
    from config import PREPROCESSING_CONFIG_JSON, TARGET_COLUMN, RANDOM_STATE, TEST_SPLIT_RATIO
except ImportError:
    from ai_training.config import PREPROCESSING_CONFIG_JSON, TARGET_COLUMN, RANDOM_STATE, TEST_SPLIT_RATIO


class DataPreprocessor:
    """
    DataPreprocessor
    ────────────────
    Applies missing value imputation, categorical feature encoding according to
    preprocessing_config.json, feature matrix extraction, and 80/20 train/test split.
    """

    def __init__(self, target_column=None, config_path=None):
        self.target_column = target_column or TARGET_COLUMN
        self.config_path = Path(config_path or PREPROCESSING_CONFIG_JSON)
        self.preprocessing_config = self._load_config()
        self.label_encoders = {}

    def _load_config(self) -> dict:
        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[DataPreprocessor Warning] Could not read preprocessing config: {e}")
        return {}

    def preprocess_dataset(self, df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, list[str]]:
        """
        Preprocesses dataframe into feature matrix X and target y.

        Steps:
        1. Fill missing values based on preprocessing_config.json.
        2. Verify and extract target vector y (quantity_used).
        3. Exclude target column from features X.
        4. Encode categorical string columns into numeric values.
        5. Return X, y, and list of feature column names.
        """
        df_processed = df.copy()

        # 1. Missing Value Imputation
        missing_strat = self.preprocessing_config.get("missing_value_strategy", {})
        for col in df_processed.columns:
            if df_processed[col].isnull().sum() > 0:
                if col in missing_strat:
                    strat = missing_strat[col]
                    if "Unknown" in str(strat):
                        df_processed[col] = df_processed[col].fillna("Unknown")
                    elif "N/A" in str(strat):
                        df_processed[col] = df_processed[col].fillna("N/A")
                    else:
                        df_processed[col] = df_processed[col].fillna(0)
                elif pd.api.types.is_numeric_dtype(df_processed[col]):
                    # Default numeric strategy: fill with 0
                    df_processed[col] = df_processed[col].fillna(0)
                else:
                    df_processed[col] = df_processed[col].fillna("Unknown")

        # 2. Extract Target y
        if self.target_column not in df_processed.columns:
            raise KeyError(f"Target column '{self.target_column}' missing from dataset.")

        y = df_processed[self.target_column].astype(float)

        # 3. Exclude Target Column
        X_df = df_processed.drop(columns=[self.target_column])

        # Drop non-predictive or redundant ID text columns if present
        ignore_cols = ["user_id", "timestamp"]
        for ic in ignore_cols:
            if ic in X_df.columns:
                X_df = X_df.drop(columns=[ic])

        # 4. Handle Categorical Columns
        for col in X_df.columns:
            if X_df[col].dtype == "object" or isinstance(X_df[col].dtype, pd.CategoricalDtype):
                le = LabelEncoder()
                X_df[col] = le.fit_transform(X_df[col].astype(str))
                self.label_encoders[col] = le

        # Ensure all columns are numeric
        X_df = X_df.apply(pd.to_numeric, errors="coerce").fillna(0)

        feature_names = list(X_df.columns)
        return X_df, y, feature_names

    def split_data(
        self, X: pd.DataFrame, y: pd.Series, test_size=None, random_state=None
    ) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
        """
        Splits dataset into 80% train and 20% test sets with random_state = 42.
        """
        test_size = test_size if test_size is not None else TEST_SPLIT_RATIO
        random_state = random_state if random_state is not None else RANDOM_STATE

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )

        print(
            f"[DataPreprocessor] Split complete: Train samples = {len(X_train)} (80%), "
            f"Test samples = {len(X_test)} (20%), Random State = {random_state}."
        )
        return X_train, X_test, y_train, y_test


__all__ = ["DataPreprocessor"]

