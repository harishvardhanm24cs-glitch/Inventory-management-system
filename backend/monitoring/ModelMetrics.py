import time
import numpy as np
from datetime import datetime, timedelta

class ModelMetrics:
    """
    Tracks prediction throughput, inference execution times, and latency percentiles.
    """
    def __init__(self):
        self.latencies = []
        self.timestamps = []
        self.successful = 0
        self.failed = 0

    def record_prediction(self, latency_ms, success=True):
        self.latencies.append(latency_ms)
        self.timestamps.append(datetime.now())
        if success:
            self.successful += 1
        else:
            self.failed += 1

    def get_metrics(self):
        total = self.successful + self.failed
        if not self.latencies:
            return {
                "total_predictions": 0,
                "successful_predictions": 0,
                "failed_predictions": 0,
                "avg_inference_time_ms": 0.0,
                "p95_latency_ms": 0.0,
                "max_latency_ms": 0.0,
                "predictions_per_hour": 0.0
            }

        avg_lat = round(float(np.mean(self.latencies)), 2)
        p95_lat = round(float(np.percentile(self.latencies, 95)), 2)
        max_lat = round(float(np.max(self.latencies)), 2)

        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_count = sum(1 for ts in self.timestamps if ts >= one_hour_ago)

        return {
            "total_predictions": total,
            "successful_predictions": self.successful,
            "failed_predictions": self.failed,
            "avg_inference_time_ms": avg_lat,
            "p95_latency_ms": p95_lat,
            "max_latency_ms": max_lat,
            "predictions_per_hour": float(recent_count)
        }
