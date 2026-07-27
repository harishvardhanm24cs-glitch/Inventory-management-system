"""
verify_environment.py
──────────────────────
RM Monitor AI Training Workspace Environment Verification Script.
Checks Python version, venv, installed packages, dataset connection, folder structure,
model export paths, and outputs a formatted Readiness Report.
"""

import os
import sys
import importlib
from pathlib import Path

# Add project root and ai_training to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

try:
    from ai_training.config import (
        PYTHON_VERSION, AI_TRAINING_DIR, PROJECT_ROOT, ML_DATASETS_DIR,
        FEATURE_DATASET_CSV, FEATURE_REGISTRY_JSON, PREPROCESSING_CONFIG_JSON,
        FEATURE_PIPELINE_JSON, EXPORT_MODEL_DIR
    )
except ImportError:
    AI_TRAINING_DIR = Path(__file__).resolve().parent
    PROJECT_ROOT = AI_TRAINING_DIR.parent
    ML_DATASETS_DIR = PROJECT_ROOT / "backend" / "ml_datasets"
    FEATURE_DATASET_CSV = ML_DATASETS_DIR / "feature_dataset.csv"
    FEATURE_REGISTRY_JSON = ML_DATASETS_DIR / "feature_registry.json"
    PREPROCESSING_CONFIG_JSON = ML_DATASETS_DIR / "preprocessing_config.json"
    FEATURE_PIPELINE_JSON = ML_DATASETS_DIR / "feature_pipeline.json"
    EXPORT_MODEL_DIR = PROJECT_ROOT / "ai" / "models"
    PYTHON_VERSION = sys.version.split()[0]


def verify_environment():
    report = {
        "python_version": PYTHON_VERSION,
        "venv_status": "NOT_FOUND",
        "folder_structure": {},
        "packages": {},
        "datasets": {},
        "model_export_directory": "NOT_FOUND",
        "overall_readiness": "UNKNOWN"
    }

    # 1. Verify Virtual Environment
    venv_dir = AI_TRAINING_DIR / "venv"
    if os.path.exists(venv_dir):
        report["venv_status"] = f"VERIFIED ({venv_dir})"
    else:
        report["venv_status"] = "MISSING"

    # 2. Verify Folder Structure (11 Subdirectories)
    required_folders = [
        "venv", "datasets", "preprocessing", "feature_engineering",
        "training", "evaluation", "experiments", "reports",
        "models", "utils", "config"
    ]
    for folder in required_folders:
        folder_path = AI_TRAINING_DIR / folder
        report["folder_structure"][folder] = "VERIFIED" if os.path.exists(folder_path) else "MISSING"

    # 3. Verify Required Python Packages
    required_packages = [
        "pandas", "numpy", "sklearn", "joblib", "scipy",
        "matplotlib", "dotenv", "tqdm", "yaml"
    ]
    for pkg in required_packages:
        try:
            importlib.import_module(pkg)
            report["packages"][pkg] = "INSTALLED"
        except ImportError:
            report["packages"][pkg] = "NOT_INSTALLED (Optional / Extensible)"

    # 4. Verify RM Monitor Dataset Ingestion Connection
    datasets_to_check = {
        "feature_dataset.csv": FEATURE_DATASET_CSV,
        "feature_registry.json": FEATURE_REGISTRY_JSON,
        "preprocessing_config.json": PREPROCESSING_CONFIG_JSON,
        "feature_pipeline.json": FEATURE_PIPELINE_JSON
    }
    all_datasets_available = True
    for name, path in datasets_to_check.items():
        exists = os.path.exists(path)
        report["datasets"][name] = f"AVAILABLE ({path})" if exists else "MISSING"
        if not exists:
            all_datasets_available = False

    # 5. Verify Model Export Directory
    if os.path.exists(EXPORT_MODEL_DIR):
        report["model_export_directory"] = f"VERIFIED ({EXPORT_MODEL_DIR})"
    else:
        report["model_export_directory"] = "MISSING"

    # Determine Overall Readiness
    folders_ok = all(v == "VERIFIED" for v in report["folder_structure"].values())
    report["overall_readiness"] = "100% READY FOR PHASE 8B MODULE 4" if (folders_ok and all_datasets_available) else "PARTIALLY READY"

    return report


def print_readiness_report(report):
    print("=" * 80)
    print("        RM MONITOR AI TRAINING WORKSPACE ENVIRONMENT READINESS REPORT")
    print("=" * 80)
    print(f"• Python Installation Version  : {report['python_version']}")
    print(f"• Virtual Environment ('venv') : {report['venv_status']}")
    print(f"• Model Export Directory       : {report['model_export_directory']}")
    print(f"• Overall Workspace Readiness  : {report['overall_readiness']}")

    print("\n" + "-" * 80)
    print("1. FOLDER STRUCTURE VERIFICATION (11 SUBDIRECTORIES)")
    print("-" * 80)
    for folder, status in report["folder_structure"].items():
        symbol = "[OK]" if status == "VERIFIED" else "[FAIL]"
        print(f"  {symbol} ai_training/{folder:<22} : {status}")

    print("\n" + "-" * 80)
    print("2. RM MONITOR DATASET CONNECTION (READ-ONLY INGESTION)")
    print("-" * 80)
    for ds, status in report["datasets"].items():
        symbol = "[OK]" if "AVAILABLE" in status else "[FAIL]"
        print(f"  {symbol} {ds:<28} : {status}")

    print("\n" + "-" * 80)
    print("3. PYTHON PACKAGE DEPENDENCY MATRIX")
    print("-" * 80)
    for pkg, status in report["packages"].items():
        symbol = "[OK]" if status == "INSTALLED" else "[INFO]"
        print(f"  {symbol} {pkg:<28} : {status}")

    print("=" * 80)


if __name__ == "__main__":
    rep = verify_environment()
    print_readiness_report(rep)
