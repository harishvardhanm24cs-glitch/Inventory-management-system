"""
ScoringEngine.py
Calculates weighted composite comparison scores using customizable metric weights.
Default Weights: MAE 25%, RMSE 20%, R2 25%, CV Score 15%, Latency 10%, Model Size 5%.
"""

class ScoringEngine:
    """
    Computes weighted comparison scores between 0.0 and 100.0.
    """
    DEFAULT_WEIGHTS = {
        "mae": 0.25,
        "rmse": 0.20,
        "r2_score": 0.25,
        "cv_score": 0.15,
        "latency": 0.10,
        "size": 0.05
    }

    def __init__(self, weights=None):
        self.weights = weights if weights else self.DEFAULT_WEIGHTS

    def calculate_model_score(self, model):
        """
        Calculates an absolute quality score for a single model (0-100).
        """
        r2 = float(model.get("r2_score", 0.94))
        cv = float(model.get("cv_score", 0.92))
        mae = float(model.get("mae", 0.85))
        rmse = float(model.get("rmse", 1.12))
        lat = float(model.get("latency_ms", 4.5))

        r2_sub = min(100.0, max(0.0, r2 * 100))
        cv_sub = min(100.0, max(0.0, cv * 100))
        mae_sub = min(100.0, max(0.0, 100.0 - (mae * 20.0)))
        rmse_sub = min(100.0, max(0.0, 100.0 - (rmse * 15.0)))
        lat_sub = min(100.0, max(0.0, 100.0 - (lat * 2.0)))
        size_sub = 95.0

        w = self.weights
        total_score = (
            r2_sub * w.get("r2_score", 0.25) +
            cv_sub * w.get("cv_score", 0.15) +
            mae_sub * w.get("mae", 0.25) +
            rmse_sub * w.get("rmse", 0.20) +
            lat_sub * w.get("latency", 0.10) +
            size_sub * w.get("size", 0.05)
        )
        return round(total_score, 2)

    def calculate_relative_comparison_score(self, baseline_model, candidate_model):
        """
        Computes composite relative score comparing Candidate to Baseline (Production).
        """
        score_base = self.calculate_model_score(baseline_model)
        score_cand = self.calculate_model_score(candidate_model)

        diff = score_cand - score_base
        composite_score = round(min(100.0, max(0.0, 50.0 + (diff * 2.5))), 2)

        return {
            "baseline_score": score_base,
            "candidate_score": score_cand,
            "score_diff": round(diff, 2),
            "composite_comparison_score": composite_score
        }
