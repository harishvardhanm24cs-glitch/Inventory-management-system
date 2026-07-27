import os
import sys
from pathlib import Path

# Load environment variables if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Dynamic Relative Base Paths
CONFIG_DIR = Path(__file__).resolve().parent
AI_TRAINING_DIR = CONFIG_DIR.parent
PROJECT_ROOT = AI_TRAINING_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
ML_DATASETS_DIR = BACKEND_DIR / "ml_datasets"

# Environment Variables & Version Metadata
PYTHON_VERSION = sys.version.split()[0]
ENVIRONMENT = os.getenv("PYTHON_ENV", "development")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
RANDOM_STATE = int(os.getenv("RANDOM_SEED", "42"))
DEFAULT_FRAMEWORK = os.getenv("DEFAULT_FRAMEWORK", "scikit-learn")

# Dynamic Configurable Dataset Paths (RM Monitor Ingestion)
FEATURE_DATASET_CSV = ML_DATASETS_DIR / "feature_dataset.csv"
FEATURE_DATASET_JSON = ML_DATASETS_DIR / "feature_dataset.json"
CLEAN_DATASET_CSV = ML_DATASETS_DIR / "clean_warehouse_dataset.csv"

# Governance & Metadata Paths
FEATURE_REGISTRY_JSON = ML_DATASETS_DIR / "feature_registry.json"
FEATURE_IMPORTANCE_TEMPLATE_JSON = ML_DATASETS_DIR / "feature_importance_template.json"
PREPROCESSING_CONFIG_JSON = ML_DATASETS_DIR / "preprocessing_config.json"
FEATURE_PIPELINE_JSON = ML_DATASETS_DIR / "feature_pipeline.json"
MODEL_REGISTRY_JSON = ML_DATASETS_DIR / "model_registry.json"

# Logging & Workspace Internal Paths
LOGS_DIR = AI_TRAINING_DIR / "reports"
EXPERIMENTS_DIR = AI_TRAINING_DIR / "experiments"
TRAINING_DIR = AI_TRAINING_DIR / "training"
LOCAL_STAGING_MODEL_DIR = AI_TRAINING_DIR / "models"

# Model Export Directory & Constants
EXPORT_MODEL_DIR = PROJECT_ROOT / "ai" / "models"
REPORTS_DIR = AI_TRAINING_DIR / "reports"

TARGET_COLUMN = "quantity_used"
TEST_SPLIT_RATIO = 0.2
VAL_SPLIT_RATIO = 0.1
MIN_ROWS_REQUIRED = 50
MODEL_NAME_PREFIX = "rm_model"

# Ensure Configured Directories Exist
for d in [LOGS_DIR, EXPERIMENTS_DIR, TRAINING_DIR, LOCAL_STAGING_MODEL_DIR, EXPORT_MODEL_DIR, REPORTS_DIR]:
    os.makedirs(d, exist_ok=True)

