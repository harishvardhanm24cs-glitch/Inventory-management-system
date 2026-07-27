import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


class ModelEvaluator:
    """
    ModelEvaluator
    ──────────────
    Evaluates trained regression models on test datasets and computes MAE, RMSE, R²,
    training/testing sample counts, and comprehensive prediction error summary.
    """

    def evaluate_model(
        self, model, X_train, y_train, X_test, y_test
    ) -> dict:
        """
        Calculates performance metrics and prediction error statistics.
        """
        # Predictions
        y_train_pred = model.predict(X_train)
        y_test_pred = model.predict(X_test)

        # Performance Metrics
        mae = float(mean_absolute_error(y_test, y_test_pred))
        mse = float(mean_squared_error(y_test, y_test_pred))
        rmse = float(np.sqrt(mse))
        r2 = float(r2_score(y_test, y_test_pred))

        train_mae = float(mean_absolute_error(y_train, y_train_pred))
        train_rmse = float(np.sqrt(mean_squared_error(y_train, y_train_pred)))
        train_r2 = float(r2_score(y_train, y_train_pred))

        # Prediction Residual Error Summary (Residuals = y_test - y_test_pred)
        residuals = y_test.values - y_test_pred
        abs_errors = np.abs(residuals)

        error_summary = {
            "mean_error": float(np.mean(residuals)),
            "std_error": float(np.std(residuals)),
            "min_error": float(np.min(residuals)),
            "max_error": float(np.max(residuals)),
            "median_absolute_error": float(np.median(abs_errors)),
            "max_absolute_error": float(np.max(abs_errors)),
            "p25_absolute_error": float(np.percentile(abs_errors, 25)),
            "p75_absolute_error": float(np.percentile(abs_errors, 75))
        }

        evaluation_results = {
            "training_samples": len(X_train),
            "testing_samples": len(X_test),
            "test_metrics": {
                "mae": round(mae, 4),
                "rmse": round(rmse, 4),
                "r2_score": round(r2, 4)
            },
            "training_metrics": {
                "mae": round(train_mae, 4),
                "rmse": round(train_rmse, 4),
                "r2_score": round(train_r2, 4)
            },
            "prediction_error_summary": {
                k: round(v, 4) for k, v in error_summary.items()
            }
        }

        print(
            f"[ModelEvaluator] Evaluation Results -> MAE: {mae:.4f}, RMSE: {rmse:.4f}, R² Score: {r2:.4f}"
        )
        return evaluation_results


if __name__ == "__main__":
    print("[ModelEvaluator] Evaluation framework loaded.")

