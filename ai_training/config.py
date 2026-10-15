import os
from pathlib import Path

AI_TRAINING_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = AI_TRAINING_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
ML_DATASETS_DIR = BACKEND_DIR / "ml_datasets"

FEATURE_DATASET_CSV = ML_DATASETS_DIR / "feature_dataset.csv"
FEATURE_DATASET_JSON = ML_DATASETS_DIR / "feature_dataset.json"
CLEAN_DATASET_CSV = ML_DATASETS_DIR / "clean_warehouse_dataset.csv"

FEATURE_REGISTRY_JSON = ML_DATASETS_DIR / "feature_registry.json"
FEATURE_IMPORTANCE_TEMPLATE_JSON = ML_DATASETS_DIR / "feature_importance_template.json"
PREPROCESSING_CONFIG_JSON = ML_DATASETS_DIR / "preprocessing_config.json"
MODEL_REGISTRY_JSON = ML_DATASETS_DIR / "model_registry.json"
FEATURE_PIPELINE_JSON = ML_DATASETS_DIR / "feature_pipeline.json"

EXPORT_MODEL_DIR = PROJECT_ROOT / "ai" / "models"
LOCAL_STAGING_MODEL_DIR = AI_TRAINING_DIR / "models"
REPORTS_DIR = AI_TRAINING_DIR / "reports"

os.makedirs(EXPORT_MODEL_DIR, exist_ok=True)
os.makedirs(LOCAL_STAGING_MODEL_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

TARGET_COLUMN = "quantity_used"
RANDOM_STATE = 42
TEST_SPLIT_RATIO = 0.2
VAL_SPLIT_RATIO = 0.1
DEFAULT_FRAMEWORK = "scikit-learn"
MIN_ROWS_REQUIRED = 50
MODEL_NAME_PREFIX = "rm_model"

