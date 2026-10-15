import numpy as np

class DriftDetector:
    """
    Computes Feature Drift (Population Stability Index - PSI) and Model Drift (MAE, RMSE, MAPE).
    """
    def __init__(self, psi_threshold=0.2, mae_threshold=5.0):
        self.psi_threshold = psi_threshold
        self.mae_threshold = mae_threshold
        self.predictions = []
        self.actuals = []

    def calculate_psi(self, baseline, target, num_buckets=10):
        """
        Computes Population Stability Index (PSI) between baseline training data and target inference data.
        PSI < 0.1: No significant change
        0.1 <= PSI < 0.2: Moderate change
        PSI >= 0.2: Significant drift detected
        """
        if len(baseline) == 0 or len(target) == 0:
            return 0.0

        percentiles = np.linspace(0, 100, num_buckets + 1)
        buckets = np.percentile(baseline, percentiles)
        buckets[0] = -np.inf
        buckets[-1] = np.inf

        baseline_counts, _ = np.histogram(baseline, bins=buckets)
        target_counts, _ = np.histogram(target, bins=buckets)

        baseline_pct = np.maximum(baseline_counts / len(baseline), 0.0001)
        target_pct = np.maximum(target_counts / len(target), 0.0001)

        psi_val = np.sum((target_pct - baseline_pct) * np.log(target_pct / baseline_pct))
        return float(round(psi_val, 4))

    def record_actual(self, prediction, actual):
        self.predictions.append(prediction)
        self.actuals.append(actual)

    def compute_model_drift(self):
        if not self.predictions or not self.actuals:
            return {
                "mae": 0.0,
                "rmse": 0.0,
                "mape": 0.0,
                "rolling_accuracy": 100.0,
                "drift_detected": False
            }

        preds = np.array(self.predictions)
        acts = np.array(self.actuals)

        mae = float(np.mean(np.abs(preds - acts)))
        rmse = float(np.sqrt(np.mean((preds - acts) ** 2)))
        nonzero_acts = np.where(acts == 0, 1e-5, acts)
        mape = float(np.mean(np.abs((acts - preds) / nonzero_acts)) * 100)
        rolling_acc = float(max(0.0, 100.0 - mape))

        drift_flag = mae > self.mae_threshold

        return {
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "mape": round(mape, 2),
            "rolling_accuracy": round(rolling_acc, 2),
            "drift_detected": drift_flag
        }
