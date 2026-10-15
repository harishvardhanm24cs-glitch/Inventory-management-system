"""
RecommendationEngine.py
Generates comparison evaluation analysis, winner determination, advantages, disadvantages, confidence scores, and recommendation tags.
"""

from .MetricComparator import MetricComparator
from .ScoringEngine import ScoringEngine

class RecommendationEngine:
    """
    Generates structured comparison analysis and recommendation logic.
    """
    @staticmethod
    def generate_recommendation(model_a, model_b, weights=None):
        """
        Model A = Production / Baseline
        Model B = Candidate
        """
        metrics_comp = MetricComparator.compare_metrics(model_a, model_b)
        scoring = ScoringEngine(weights).calculate_relative_comparison_score(model_a, model_b)

        score_diff = scoring["score_diff"]
        composite_score = scoring["composite_comparison_score"]

        advantages = []
        disadvantages = []

        if metrics_comp["mae"]["better"] == "b":
            advantages.append(f"Lower MAE error ({model_b.get('mae')} vs {model_a.get('mae')}, {abs(metrics_comp['mae']['pct_change'])}% improvement)")
        elif metrics_comp["mae"]["better"] == "a":
            disadvantages.append(f"Higher MAE error ({model_b.get('mae')} vs {model_a.get('mae')})")

        if metrics_comp["rmse"]["better"] == "b":
            advantages.append(f"Lower RMSE error ({model_b.get('rmse')} vs {model_a.get('rmse')})")
        elif metrics_comp["rmse"]["better"] == "a":
            disadvantages.append(f"Higher RMSE error ({model_b.get('rmse')} vs {model_a.get('rmse')})")

        if metrics_comp["r2_score"]["better"] == "b":
            advantages.append(f"Higher R² accuracy score ({model_b.get('r2_score')} vs {model_a.get('r2_score')})")
        elif metrics_comp["r2_score"]["better"] == "a":
            disadvantages.append(f"Lower R² accuracy score ({model_b.get('r2_score')} vs {model_a.get('r2_score')})")

        if metrics_comp["cv_score"]["better"] == "b":
            advantages.append(f"Higher Cross Validation Score ({model_b.get('cv_score')} vs {model_a.get('cv_score')})")

        if metrics_comp["latency_ms"]["better"] == "b":
            advantages.append(f"Lower inference latency ({model_b.get('latency_ms', 4.5)}ms vs {model_a.get('latency_ms', 4.5)}ms)")

        if score_diff > 1.0:
            winner = model_b.get("model_version")
            winner_name = model_b.get("model_name")
            recommendation = "ELIGIBLE_FOR_PROMOTION"
            confidence = min(99.0, max(85.0, 88.0 + (score_diff * 2.0)))
            reason = f"Candidate model {model_b.get('model_version')} outperforms Production model {model_a.get('model_version')} by {score_diff} quality score points."
        elif abs(score_diff) <= 1.0:
            winner = model_a.get("model_version")
            winner_name = model_a.get("model_name")
            recommendation = "PARITY_MAINTAINED"
            confidence = 90.0
            reason = f"Candidate model {model_b.get('model_version')} exhibits parity with active Production model {model_a.get('model_version')}."
        else:
            winner = model_a.get("model_version")
            winner_name = model_a.get("model_name")
            recommendation = "NEEDS_IMPROVEMENT" if score_diff > -5.0 else "REJECTED"
            confidence = min(99.0, max(80.0, 85.0 + abs(score_diff)))
            reason = f"Candidate model {model_b.get('model_version')} underperforms active Production model {model_a.get('model_version')} by {abs(score_diff)} quality score points."

        return {
            "production_model": model_a.get("model_version"),
            "candidate_model": model_b.get("model_version"),
            "winner": winner,
            "winner_name": winner_name,
            "comparison_score": composite_score,
            "score_diff": score_diff,
            "recommendation": recommendation,
            "confidence_score": round(confidence, 1),
            "reason": reason,
            "advantages": advantages,
            "disadvantages": disadvantages,
            "metrics_breakdown": metrics_comp
        }
