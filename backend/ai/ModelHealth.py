"""
ModelHealth.py
Tracks operational status, memory usage, inference metrics, and health status of the AI Service.
"""

import time
import sys

class ModelHealth:
    def __init__(self):
        self.is_loaded = False
        self.model_name = "Gradient Boosting Regressor"
        self.model_version = "v2026.07.28"
        self.training_date = "2026-07-27"
        self.dataset_version = "v2026.07.27_205401"
        self.feature_count = 0
        self.total_inferences = 0
        self.total_inference_time_ms = 0.0
        self.last_inference_time_ms = 0.0
        self.health_status = "HEALTHY"

    def record_inference(self, time_ms, count=1):
        self.total_inferences += count
        self.last_inference_time_ms = round(time_ms, 2)
        self.total_inference_time_ms += time_ms

    def get_status(self):
        avg_time = (
            round(self.total_inference_time_ms / max(1, self.total_inferences), 2)
            if self.total_inferences > 0 else 0.0
        )
        
        return {
            "is_loaded": self.is_loaded,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "training_date": self.training_date,
            "dataset_version": self.dataset_version,
            "feature_count": self.feature_count,
            "total_inferences": self.total_inferences,
            "avg_inference_time_ms": avg_time,
            "last_inference_time_ms": self.last_inference_time_ms,
            "health_status": self.health_status if self.is_loaded else "UNHEALTHY"
        }
