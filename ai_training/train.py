import os
import sys
import time
import json
import pandas as pd
from pathlib import Path
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor

# Ensure local imports work relative to ai_training/
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from config import (
        FEATURE_DATASET_CSV, FEATURE_REGISTRY_JSON,
        PREPROCESSING_CONFIG_JSON, FEATURE_PIPELINE_JSON,
        MODEL_REGISTRY_JSON, EXPORT_MODEL_DIR, TARGET_COLUMN,
        RANDOM_STATE, TEST_SPLIT_RATIO, MODEL_NAME_PREFIX
    )
    from dataset_loader import DatasetLoader, DatasetValidationError
    from preprocessing import DataPreprocessor
    from evaluate import ModelEvaluator
    from export_model import ModelExporter
    from model_registry import ModelRegistryManager
    from training_logger import TrainingLogger
except ImportError:
    from ai_training.config import (
        FEATURE_DATASET_CSV, FEATURE_REGISTRY_JSON,
        PREPROCESSING_CONFIG_JSON, FEATURE_PIPELINE_JSON,
        MODEL_REGISTRY_JSON, EXPORT_MODEL_DIR, TARGET_COLUMN,
        RANDOM_STATE, TEST_SPLIT_RATIO, MODEL_NAME_PREFIX
    )
    from ai_training.dataset_loader import DatasetLoader, DatasetValidationError
    from ai_training.preprocessing import DataPreprocessor
    from ai_training.evaluate import ModelEvaluator
    from ai_training.export_model import ModelExporter
    from ai_training.model_registry import ModelRegistryManager
    from ai_training.training_logger import TrainingLogger


def run_training_pipeline() -> dict:
    """
    Executes Phase 8B Module 4 - Machine Learning Model Training Pipeline.
    """
    logger = TrainingLogger()
    logger.log("=" * 80)
    logger.log("   RM MONITOR - PHASE 8B MODULE 4 ML MODEL TRAINING PIPELINE")
    logger.log("=" * 80)

    # 1. Dataset Ingestion & Validation
    logger.log(f"1. Loading & Validating Dataset from '{FEATURE_DATASET_CSV}'...")
    loader = DatasetLoader()
    try:
        raw_df, validation_summary = loader.load_and_validate_feature_dataset()
    except (FileNotFoundError, DatasetValidationError) as ve:
        logger.log(f"❌ DATASET VALIDATION ERROR: {ve}")
        # Generate error report
        err_report_path = logger.reports_dir / "training_error_report.json"
        with open(err_report_path, "w", encoding="utf-8") as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "status": "FAILED",
                "error": str(ve)
            }, f, indent=2)
        logger.log(f"Error report written to '{err_report_path}'. Training stopped.")
        sys.exit(1)

    logger.log(f"   • Raw rows: {validation_summary['raw_rows']}")
    logger.log(f"   • Removed duplicate rows: {validation_summary['duplicate_rows_removed']}")
    logger.log(f"   • Final training rows: {validation_summary['final_rows']}")
    logger.log(f"   • Target column target: '{TARGET_COLUMN}' (Verified Present)")

    # 2. Feature Selection & Preprocessing
    logger.log("\n2. Preprocessing & Feature Encoding...")
    preprocessor = DataPreprocessor(target_column=TARGET_COLUMN)
    X, y, feature_names = preprocessor.preprocess_dataset(raw_df)
    logger.log(f"   • Total Input Features Selected: {len(feature_names)}")

    # 3. Train / Test Split
    logger.log("\n3. Performing 80/20 Train/Test Split (random_state=42)...")
    X_train, X_test, y_train, y_test = preprocessor.split_data(
        X, y, test_size=TEST_SPLIT_RATIO, random_state=RANDOM_STATE
    )

    # 4. Model Training (RandomForestRegressor)
    logger.log("\n4. Training RandomForestRegressor Model...")
    rf_params = {
        "n_estimators": 100,
        "random_state": RANDOM_STATE,
        "n_jobs": -1,
        "criterion": "squared_error"
    }
    rf_model = RandomForestRegressor(**rf_params)

    start_time = time.time()
    rf_model.fit(X_train, y_train)
    training_duration_sec = time.time() - start_time
    logger.log(f"   • Training Duration: {training_duration_sec:.4f} seconds")

    # 5. Model Evaluation
    logger.log("\n5. Calculating Model Evaluation Metrics...")
    evaluator = ModelEvaluator()
    eval_results = evaluator.evaluate_model(rf_model, X_train, y_train, X_test, y_test)
    test_metrics = eval_results["test_metrics"]

    logger.log(f"   • MAE       : {test_metrics['mae']}")
    logger.log(f"   • RMSE      : {test_metrics['rmse']}")
    logger.log(f"   • R² Score  : {test_metrics['r2_score']}")

    # 6. Feature Importance Calculation & Ranking
    logger.log("\n6. Computing Feature Importance Ranking...")
    importances = rf_model.feature_importances_
    fi_df = pd.DataFrame({
        "feature_name": feature_names,
        "importance": importances
    }).sort_values(by="importance", ascending=False).reset_index(drop=True)
    fi_df["rank"] = fi_df.index + 1

    top_10_df = fi_df.head(10)
    logger.log("\nTop 10 Most Important Features:")
    logger.log("-" * 60)
    logger.log(f"{'Rank':<6} | {'Feature Name':<35} | {'Importance':<12}")
    logger.log("-" * 60)
    for _, row in top_10_df.iterrows():
        logger.log(f"{int(row['rank']):<6} | {row['feature_name']:<35} | {row['importance']:.6f}")
    logger.log("-" * 60)

    # 7. Model Export (Joblib + Versioning Safeguards)
    logger.log("\n7. Exporting Trained Model Artifact (Joblib)...")
    exporter = ModelExporter()
    export_info = exporter.export(rf_model, model_prefix=MODEL_NAME_PREFIX)
    model_version = export_info["model_version"]

    # 8. Model Registry Update
    logger.log("\n8. Updating Model Registry ('model_registry.json')...")
    registry_mgr = ModelRegistryManager()
    registry_entry = registry_mgr.register_trained_model(
        model_name="RM Monitor Material Usage Regressor",
        algorithm="RandomForestRegressor",
        training_timestamp=datetime.now().isoformat(),
        dataset_used=str(FEATURE_DATASET_CSV),
        number_of_features=len(feature_names),
        training_samples=len(X_train),
        testing_samples=len(X_test),
        performance_metrics=test_metrics,
        model_version=model_version,
        model_path=export_info["export_path"]
    )

    # 9. Generate Reports
    logger.log("\n9. Generating Output Reports...")
    reports = logger.save_reports(
        validation_summary=validation_summary,
        model_config=rf_params,
        evaluation_results=eval_results,
        feature_importance_df=fi_df,
        export_info=export_info,
        training_duration_sec=training_duration_sec
    )

    # 10. Success Summary
    logger.log("\n" + "=" * 80)
    logger.log("                     TRAINING SUCCESS SUMMARY")
    logger.log("=" * 80)
    logger.log("Training completed successfully")
    logger.log("Model saved successfully")
    logger.log(f"Model version: {model_version}")
    logger.log(f"Training metrics: MAE={test_metrics['mae']}, RMSE={test_metrics['rmse']}, R²={test_metrics['r2_score']}")
    logger.log(f"Top 10 important features: {list(top_10_df['feature_name'])}")
    logger.log(f"Generated reports: {list(reports.keys())}")
    logger.log(f"Model registry updated: {MODEL_REGISTRY_JSON}")
    logger.log("=" * 80)

    return {
        "status": "SUCCESS",
        "model_version": model_version,
        "export_info": export_info,
        "metrics": test_metrics,
        "top_features": list(top_10_df["feature_name"]),
        "reports": reports,
        "registry_entry": registry_entry
    }


if __name__ == "__main__":
    run_training_pipeline()

