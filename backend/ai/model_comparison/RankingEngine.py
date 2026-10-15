"""
RankingEngine.py
Ranks all registered models based on composite performance scores.
"""

from .ScoringEngine import ScoringEngine

class RankingEngine:
    """
    Ranks models and generates leaderboard.
    """
    def __init__(self, scoring_engine=None):
        self.scoring_engine = scoring_engine if scoring_engine else ScoringEngine()

    def rank_models(self, models_list):
        if not models_list:
            return []

        scored_models = []
        for m in models_list:
            s = self.scoring_engine.calculate_model_score(m)
            scored_models.append({
                "model_version": m.get("model_version"),
                "model_name": m.get("model_name"),
                "algorithm": m.get("algorithm"),
                "status": m.get("status"),
                "dataset_version": m.get("dataset_version"),
                "mae": m.get("mae"),
                "rmse": m.get("rmse"),
                "r2_score": m.get("r2_score"),
                "cv_score": m.get("cv_score"),
                "quality_score": s
            })

        scored_models.sort(key=lambda x: x["quality_score"], reverse=True)

        for rank, m in enumerate(scored_models, 1):
            m["rank"] = rank

        return scored_models
