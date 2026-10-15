"""
Model Comparison Module (Module 7A.4)
Evaluates registered ML models, computes weighted performance scores, ranks candidates, and generates promotion eligibility recommendations.
"""

from .MetricComparator import MetricComparator
from .ScoringEngine import ScoringEngine
from .RankingEngine import RankingEngine
from .RecommendationEngine import RecommendationEngine
from .ComparisonHistory import ComparisonHistory
from .ComparisonEngine import ComparisonEngine

__all__ = [
    "MetricComparator",
    "ScoringEngine",
    "RankingEngine",
    "RecommendationEngine",
    "ComparisonHistory",
    "ComparisonEngine"
]
