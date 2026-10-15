"""
MetricComparator.py
Compares model evaluation metrics (MAE, RMSE, R2, CV, Latency, Size, Features).
"""

class MetricComparator:
    """
    Computes metric-by-metric differences and relative percentage improvements between two models.
    """
    @staticmethod
    def compare_metrics(model_a, model_b):
        """
        Compares Model A (e.g. Production) vs Model B (e.g. Candidate).
        Returns detailed metric breakdown.
        """
        mae_a = float(model_a.get("mae", 0.85))
        mae_b = float(model_b.get("mae", 0.85))
        mae_diff = mae_a - mae_b
        mae_pct = ((mae_a - mae_b) / mae_a * 100) if mae_a > 0 else 0

        rmse_a = float(model_a.get("rmse", 1.12))
        rmse_b = float(model_b.get("rmse", 1.12))
        rmse_diff = rmse_a - rmse_b
        rmse_pct = ((rmse_a - rmse_b) / rmse_a * 100) if rmse_a > 0 else 0

        r2_a = float(model_a.get("r2_score", 0.94))
        r2_b = float(model_b.get("r2_score", 0.94))
        r2_diff = r2_b - r2_a
        r2_pct = ((r2_b - r2_a) / (1 - r2_a) * 100) if (1 - r2_a) > 0 else 0

        cv_a = float(model_a.get("cv_score", 0.92))
        cv_b = float(model_b.get("cv_score", 0.92))
        cv_diff = cv_b - cv_a
        cv_pct = ((cv_b - cv_a) / cv_a * 100) if cv_a > 0 else 0

        lat_a = float(model_a.get("latency_ms", 4.5))
        lat_b = float(model_b.get("latency_ms", 4.5))
        lat_diff = lat_a - lat_b
        lat_pct = ((lat_a - lat_b) / lat_a * 100) if lat_a > 0 else 0

        size_a = float(model_a.get("model_size", 1024))
        size_b = float(model_b.get("model_size", 1024))
        size_diff = size_a - size_b

        return {
            "mae": {"model_a": mae_a, "model_b": mae_b, "diff": round(mae_diff, 4), "pct_change": round(mae_pct, 2), "better": "b" if mae_b < mae_a else ("a" if mae_a < mae_b else "equal")},
            "rmse": {"model_a": rmse_a, "model_b": rmse_b, "diff": round(rmse_diff, 4), "pct_change": round(rmse_pct, 2), "better": "b" if rmse_b < rmse_a else ("a" if rmse_a < rmse_b else "equal")},
            "r2_score": {"model_a": r2_a, "model_b": r2_b, "diff": round(r2_diff, 4), "pct_change": round(r2_pct, 2), "better": "b" if r2_b > r2_a else ("a" if r2_a > r2_b else "equal")},
            "cv_score": {"model_a": cv_a, "model_b": cv_b, "diff": round(cv_diff, 4), "pct_change": round(cv_pct, 2), "better": "b" if cv_b > cv_a else ("a" if cv_a > cv_b else "equal")},
            "latency_ms": {"model_a": lat_a, "model_b": lat_b, "diff": round(lat_diff, 2), "pct_change": round(lat_pct, 2), "better": "b" if lat_b <= lat_a else "a"},
            "model_size": {"model_a": size_a, "model_b": size_b, "diff": round(size_diff, 2), "better": "b" if size_b <= size_a else "a"},
            "dataset_version": {"model_a": model_a.get("dataset_version"), "model_b": model_b.get("dataset_version")},
            "feature_count": {"model_a": model_a.get("feature_count", 12), "model_b": model_b.get("feature_count", 12)}
        }
