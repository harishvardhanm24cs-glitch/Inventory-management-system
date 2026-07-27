"""
pre_training_verifier.py
─────────────────────────
RM Monitor Pre-Training Verification System.
Automatically audits project structure, datasets, dataset quality, feature registry,
preprocessing configuration, feature pipeline, Python environment, and model export path
before Phase 8B Module 4 Machine Learning Model Training begins.
"""

import os
import sys
import json
import datetime
import importlib
from pathlib import Path

# Insert sys.path for internal imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

try:
    from ai_training.config import (
        AI_TRAINING_DIR, PROJECT_ROOT, ML_DATASETS_DIR,
        FEATURE_DATASET_CSV, FEATURE_REGISTRY_JSON,
        PREPROCESSING_CONFIG_JSON, FEATURE_PIPELINE_JSON,
        EXPORT_MODEL_DIR, LOGS_DIR
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
    LOGS_DIR = AI_TRAINING_DIR / "reports"

os.makedirs(LOGS_DIR, exist_ok=True)
os.makedirs(EXPORT_MODEL_DIR, exist_ok=True)


def format_bytes(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} Bytes"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"


class PreTrainingVerifier:
    def __init__(self):
        self.results = {
            "timestamp": datetime.datetime.now().isoformat(),
            "overall_status": "PENDING",
            "project_structure": {},
            "dataset_files": {},
            "dataset_quality": {},
            "feature_registry": {},
            "preprocessing_config": {},
            "feature_pipeline": {},
            "python_environment": {},
            "model_directory": {},
            "issues": []
        }

    def verify_project_structure(self):
        required_folders = [
            "datasets", "preprocessing", "feature_engineering",
            "training", "evaluation", "reports", "models",
            "utils", "config"
        ]
        structure_status = {}
        for folder in required_folders:
            folder_path = AI_TRAINING_DIR / folder
            exists = os.path.exists(folder_path)
            structure_status[folder] = {
                "exists": exists,
                "path": str(folder_path)
            }
            if not exists:
                self.results["issues"].append(f"Missing required directory: ai_training/{folder}")
        self.results["project_structure"] = structure_status

    def verify_dataset_files(self):
        dataset_files = {
            "feature_dataset.csv": FEATURE_DATASET_CSV,
            "feature_registry.json": FEATURE_REGISTRY_JSON,
            "preprocessing_config.json": PREPROCESSING_CONFIG_JSON,
            "feature_pipeline.json": FEATURE_PIPELINE_JSON
        }
        file_status = {}
        for name, file_path in dataset_files.items():
            exists = os.path.exists(file_path)
            if exists:
                stat = os.stat(file_path)
                file_status[name] = {
                    "exists": True,
                    "full_path": str(file_path),
                    "size_bytes": stat.st_size,
                    "formatted_size": format_bytes(stat.st_size),
                    "created_date": datetime.datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "last_modified_date": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat()
                }
            else:
                file_status[name] = {
                    "exists": False,
                    "full_path": str(file_path)
                }
                self.results["issues"].append(f"Missing dataset artifact: {name} at '{file_path}'")

        self.results["dataset_files"] = file_status

    def verify_dataset_quality(self):
        if not os.path.exists(FEATURE_DATASET_CSV):
            self.results["dataset_quality"] = {"status": "SKIPPED_MISSING_FILE"}
            return

        try:
            import pandas as pd
            df = pd.read_csv(FEATURE_DATASET_CSV)

            total_rows = len(df)
            total_cols = len(df.columns)
            columns = list(df.columns)
            dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}

            missing_per_col = {col: int(df[col].isnull().sum()) for col in columns}
            duplicate_rows = int(df.duplicated().sum())

            numerical_features = [col for col in columns if pd.api.types.is_numeric_dtype(df[col])]
            categorical_features = [col for col in columns if not pd.api.types.is_numeric_dtype(df[col])]
            datetime_features = [col for col in columns if "time" in col.lower() or "date" in col.lower()]

            mem_usage_bytes = df.memory_usage(deep=True).sum()
            formatted_mem = format_bytes(mem_usage_bytes)

            target_candidates = [
                col for col in columns if any(
                    k in col.lower() for k in [
                        "stock", "threshold", "occupancy", "quantity", "used",
                        "critical", "low_stock", "health", "risk", "indicator", "target"
                    ]
                )
            ]

            self.results["dataset_quality"] = {
                "total_rows": total_rows,
                "total_columns": total_cols,
                "columns": columns,
                "data_types": dtypes,
                "missing_values_per_column": missing_per_col,
                "duplicate_rows_count": duplicate_rows,
                "numerical_features": numerical_features,
                "numerical_count": len(numerical_features),
                "categorical_features": categorical_features,
                "categorical_count": len(categorical_features),
                "datetime_features": datetime_features,
                "datetime_count": len(datetime_features),
                "memory_usage": formatted_mem,
                "target_candidates": target_candidates
            }

            if total_rows == 0:
                self.results["issues"].append("feature_dataset.csv contains 0 rows.")

        except Exception as e:
            self.results["dataset_quality"] = {"error": str(e)}
            self.results["issues"].append(f"Error auditing dataset quality: {e}")

    def verify_feature_registry(self):
        if not os.path.exists(FEATURE_REGISTRY_JSON) or not os.path.exists(FEATURE_DATASET_CSV):
            self.results["feature_registry"] = {"status": "SKIPPED_MISSING_FILES"}
            return

        try:
            import pandas as pd
            df = pd.read_csv(FEATURE_DATASET_CSV)
            dataset_cols = set(df.columns)

            with open(FEATURE_REGISTRY_JSON, "r", encoding="utf-8") as f:
                registry_data = json.load(f)

            registered_features_list = registry_data.get("features", [])
            registered_names = set(
                f.get("feature_name") for f in registered_features_list if isinstance(f, dict)
            )

            missing_features = list(registered_names - dataset_cols)
            extra_features = list(dataset_cols - registered_names)
            coverage_pct = round((len(dataset_cols.intersection(registered_names)) / max(1, len(dataset_cols))) * 100, 1)

            self.results["feature_registry"] = {
                "registry_name": registry_data.get("registry_name", "RM Monitor Feature Registry"),
                "total_registered_features": len(registered_names),
                "dataset_columns_count": len(dataset_cols),
                "dataset_coverage_percentage": coverage_pct,
                "missing_features_in_dataset": missing_features,
                "unregistered_operational_columns": extra_features,
                "data_type_mismatches": []
            }

        except Exception as e:
            self.results["feature_registry"] = {"error": str(e)}
            self.results["issues"].append(f"Error verifying Feature Registry: {e}")

    def verify_preprocessing_config(self):
        if not os.path.exists(PREPROCESSING_CONFIG_JSON):
            self.results["preprocessing_config"] = {"status": "SKIPPED_MISSING_FILE"}
            return

        try:
            with open(PREPROCESSING_CONFIG_JSON, "r", encoding="utf-8") as f:
                config_data = json.load(f)

            required_sections = [
                "normalization", "missing_value_strategy",
                "encoding", "duplicate_handling", "outlier_handling"
            ]
            missing_sections = [sec for sec in required_sections if sec not in config_data]

            self.results["preprocessing_config"] = {
                "version": config_data.get("version", "v1.0.0"),
                "present_sections": list(config_data.keys()),
                "missing_sections": missing_sections,
                "normalization_details": config_data.get("normalization", {}),
                "encoding_details": config_data.get("encoding", {}),
                "missing_value_strategy": config_data.get("missing_value_strategy", {}),
                "duplicate_handling": config_data.get("duplicate_handling", {}),
                "outlier_handling": config_data.get("outlier_handling", {})
            }

            if missing_sections:
                self.results["issues"].append(
                    f"Preprocessing config missing sections: {missing_sections}"
                )

        except Exception as e:
            self.results["preprocessing_config"] = {"error": str(e)}
            self.results["issues"].append(f"Error verifying Preprocessing Config: {e}")

    def verify_feature_pipeline(self):
        if not os.path.exists(FEATURE_PIPELINE_JSON):
            self.results["feature_pipeline"] = {"status": "SKIPPED_MISSING_FILE"}
            return

        try:
            with open(FEATURE_PIPELINE_JSON, "r", encoding="utf-8") as f:
                pipeline_data = json.load(f)

            steps = pipeline_data.get("pipeline_steps", [])
            execution_order = [
                f"Step {s.get('step')}: {s.get('name')}" for s in steps if isinstance(s, dict)
            ]

            self.results["feature_pipeline"] = {
                "pipeline_name": pipeline_data.get("pipeline_name", "RM Monitor Feature Pipeline"),
                "version": pipeline_data.get("version", "v1.0.0"),
                "total_steps": len(steps),
                "execution_order": execution_order
            }

        except Exception as e:
            self.results["feature_pipeline"] = {"error": str(e)}
            self.results["issues"].append(f"Error verifying Feature Pipeline: {e}")

    def verify_python_environment(self):
        env_status = {
            "python_version": sys.version.split()[0],
            "executable": sys.executable,
            "virtual_environment": "INACTIVE / GLOBAL",
            "packages": {}
        }

        # Check venv
        venv_dir = AI_TRAINING_DIR / "venv"
        if os.path.exists(venv_dir):
            env_status["virtual_environment"] = f"VERIFIED ({venv_dir})"

        packages_to_check = [
            ("pandas", "pd"), ("numpy", "np"), ("sklearn", "scikit-learn"),
            ("joblib", "joblib"), ("matplotlib", "matplotlib"),
            ("xgboost", "xgboost"), ("tensorflow", "tensorflow"),
            ("torch", "torch")
        ]

        for pkg, label in packages_to_check:
            try:
                mod = importlib.import_module(pkg)
                version = getattr(mod, "__version__", "INSTALLED")
                env_status["packages"][label] = version
            except ImportError:
                env_status["packages"][label] = "NOT INSTALLED (Optional Extension)"

        self.results["python_environment"] = env_status

    def verify_model_directory(self):
        exists = os.path.exists(EXPORT_MODEL_DIR)
        if not exists:
            os.makedirs(EXPORT_MODEL_DIR, exist_ok=True)
            exists = os.path.exists(EXPORT_MODEL_DIR)

        self.results["model_directory"] = {
            "exists": exists,
            "path": str(EXPORT_MODEL_DIR)
        }

    def run_all_verifications(self):
        self.verify_project_structure()
        self.verify_dataset_files()
        self.verify_dataset_quality()
        self.verify_feature_registry()
        self.verify_preprocessing_config()
        self.verify_feature_pipeline()
        self.verify_python_environment()
        self.verify_model_directory()

        if len(self.results["issues"]) == 0:
            self.results["overall_status"] = "PASSED"
            self.results["readiness_message"] = "Phase 8B Module 4 Ready"
        else:
            self.results["overall_status"] = "FAILED"
            self.results["readiness_message"] = f"Action Required: {len(self.results['issues'])} issues detected."

        return self.results

    def generate_reports(self):
        # 1. Save JSON Report
        json_report_path = LOGS_DIR / "pre_training_readiness_report.json"
        with open(json_report_path, "w", encoding="utf-8") as f:
            json.dump(self.results, f, indent=2)

        # 2. Save Markdown Report
        md_report_path = LOGS_DIR / "pre_training_readiness_report.md"
        status_symbol = "[OK]" if self.results["overall_status"] == "PASSED" else "[FAIL]"
        
        md_lines = [
            "# RM Monitor Pre-Training Readiness Audit Report",
            "",
            f"**Audit Timestamp**: `{self.results['timestamp']}`",
            f"**Overall Status**: `{self.results['overall_status']}`",
            f"**Readiness Badge**: `{self.results['readiness_message']}`",
            "",
            "---",
            "",
            "## 1. Executive Summary",
            "",
            f"- **Project Structure**: {'Passed' if not self.results['issues'] else 'Issues Detected'}",
            f"- **Dataset Files Verification**: {len(self.results['dataset_files'])} artifacts checked",
            f"- **Dataset Quality**: {self.results['dataset_quality'].get('total_rows', 0)} rows, {self.results['dataset_quality'].get('total_columns', 0)} features ingested",
            f"- **Model Export Directory**: `{self.results['model_directory'].get('path')}`",
            "",
            "---",
            "",
            "## 2. Dataset Quality & Hygiene Audit",
            "",
            f"- **Total Ingested Rows**: `{self.results['dataset_quality'].get('total_rows', 0)}`",
            f"- **Total Ingested Features**: `{self.results['dataset_quality'].get('total_columns', 0)}`",
            f"- **Numerical Features Count**: `{self.results['dataset_quality'].get('numerical_count', 0)}`",
            f"- **Categorical Features Count**: `{self.results['dataset_quality'].get('categorical_count', 0)}`",
            f"- **Duplicate Rows**: `{self.results['dataset_quality'].get('duplicate_rows_count', 0)}`",
            f"- **In-Memory Size**: `{self.results['dataset_quality'].get('memory_usage', '0 KB')}`",
            f"- **Target Candidates**: `{', '.join(self.results['dataset_quality'].get('target_candidates', []))}`",
            "",
            "### Missing Values per Feature",
            "```",
        ]

        missing_dict = self.results['dataset_quality'].get('missing_values_per_column', {})
        for col, count in missing_dict.items():
            md_lines.append(f"{col:<35} : {count} missing")
        md_lines.append("```")
        md_lines.extend([
            "",
            "---",
            "",
            "## 3. Preprocessing & Feature Pipeline",
            "",
            "### Preprocessing Configurations Verified",
            f"- **Normalization**: `{self.results['preprocessing_config'].get('normalization_details', {}).get('method', 'N/A')}`",
            f"- **Encoding**: `{len(self.results['preprocessing_config'].get('encoding_details', {}).get('label_encoding_features', []))} Label Encoded, {len(self.results['preprocessing_config'].get('encoding_details', {}).get('one_hot_encoding_features', []))} One-Hot Encoded`",
            f"- **Duplicate Strategy**: `{self.results['preprocessing_config'].get('duplicate_handling', {}).get('strategy', 'N/A')}`",
            "",
            "### Feature Pipeline Execution Steps",
        ])

        for step_desc in self.results['feature_pipeline'].get('execution_order', []):
            md_lines.append(f"- {step_desc}")

        md_lines.extend([
            "",
            "---",
            "",
            "## 4. Python Environment & Dependencies",
            "",
            f"- **Python Version**: `{self.results['python_environment'].get('python_version')}`",
            f"- **Virtual Environment**: `{self.results['python_environment'].get('virtual_environment')}`",
            "",
            "### Installed Package Versions",
        ])

        for pkg_name, ver in self.results['python_environment'].get('packages', {}).items():
            md_lines.append(f"- **{pkg_name}**: `{ver}`")

        md_lines.extend([
            "",
            "---",
            "",
            "## 5. Issues & Action Items",
            ""
        ])

        if self.results["issues"]:
            for issue in self.results["issues"]:
                md_lines.append(f"- ❌ {issue}")
        else:
            md_lines.append("✅ **No issues detected. All verification checks passed cleanly!**")

        md_lines.extend([
            "",
            "---",
            "",
            "## Final Verification Result",
            "",
            f"# Phase 8B Module 4 Ready" if self.results["overall_status"] == "PASSED" else f"### Readiness Status: FAILED"
        ])

        with open(md_report_path, "w", encoding="utf-8") as f:
            f.write("\n".join(md_lines))

        print(f"[PreTrainingVerifier] Reports written to:")
        print(f"  • JSON : '{json_report_path}'")
        print(f"  • MD   : '{md_report_path}'")
        return md_report_path, json_report_path


def print_cli_summary(results):
    print("=" * 80)
    print("      RM MONITOR PRE-TRAINING VERIFICATION SYSTEM READINESS REPORT")
    print("=" * 80)
    print(f"• Timestamp             : {results['timestamp']}")
    print(f"• Overall Audit Status  : {results['overall_status']}")
    print(f"• Model Export Directory: {results['model_directory'].get('path')}")

    print("\n" + "-" * 80)
    print("1. PROJECT STRUCTURE VERIFICATION (9 DIRECTORIES)")
    print("-" * 80)
    for folder, info in results["project_structure"].items():
        symbol = "[OK]" if info["exists"] else "[FAIL]"
        print(f"  {symbol} ai_training/{folder:<22} : {'VERIFIED' if info['exists'] else 'MISSING'}")

    print("\n" + "-" * 80)
    print("2. RM MONITOR DATASET ARTIFACT VERIFICATION")
    print("-" * 80)
    for name, info in results["dataset_files"].items():
        symbol = "[OK]" if info["exists"] else "[FAIL]"
        size_str = info.get("formatted_size", "N/A")
        print(f"  {symbol} {name:<28} : {size_str:<10} | {info['full_path']}")

    print("\n" + "-" * 80)
    print("3. DATASET QUALITY AUDIT SUMMARY")
    print("-" * 80)
    dq = results.get("dataset_quality", {})
    print(f"  • Ingested Rows       : {dq.get('total_rows', 0)}")
    print(f"  • Total Columns       : {dq.get('total_columns', 0)}")
    print(f"  • Numerical Features  : {dq.get('numerical_count', 0)}")
    print(f"  • Categorical Features: {dq.get('categorical_count', 0)}")
    print(f"  • Duplicate Rows      : {dq.get('duplicate_rows_count', 0)}")
    print(f"  • Memory Usage        : {dq.get('memory_usage', '0 KB')}")
    print(f"  • Target Candidates   : {', '.join(dq.get('target_candidates', []))}")

    print("\n" + "-" * 80)
    print("4. PYTHON ENVIRONMENT & DEPENDENCY MATRIX")
    print("-" * 80)
    pe = results.get("python_environment", {})
    print(f"  • Python Version      : {pe.get('python_version')}")
    print(f"  • Virtual Environment : {pe.get('virtual_environment')}")
    for pkg_name, ver in pe.get("packages", {}).items():
        symbol = "[OK]" if "NOT INSTALLED" not in ver else "[INFO]"
        print(f"  {symbol} {pkg_name:<25} : {ver}")

    print("\n" + "=" * 80)
    if results["overall_status"] == "PASSED":
        print("                   Phase 8B Module 4 Ready")
    else:
        print(f"FAILED: {len(results['issues'])} issues detected.")
    print("=" * 80)


if __name__ == "__main__":
    verifier = PreTrainingVerifier()
    res = verifier.run_all_verifications()
    verifier.generate_reports()
    print_cli_summary(res)
