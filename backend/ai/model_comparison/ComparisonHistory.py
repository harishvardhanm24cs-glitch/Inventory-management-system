"""
ComparisonHistory.py
Manages persistent comparison history manifest file (backend/models/model_comparison_manifest.json).
"""

import os
import json
from datetime import datetime

class ComparisonHistory:
    """
    Manages persistent JSON history for comparison runs.
    """
    def __init__(self, models_dir=None):
        if models_dir is None:
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            models_dir = os.path.join(backend_dir, "models")
        self.models_dir = models_dir
        os.makedirs(self.models_dir, exist_ok=True)
        self.manifest_file = os.path.join(self.models_dir, "model_comparison_manifest.json")
        self.history = self._load_history()

    def _load_history(self):
        if os.path.exists(self.manifest_file):
            try:
                with open(self.manifest_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return []

    def _save_history(self):
        try:
            with open(self.manifest_file, "w", encoding="utf-8") as f:
                f.write(json.dumps(self.history, indent=2))
        except Exception:
            pass

    def log_comparison(self, comparison_data):
        entry = {
            "comparison_id": comparison_data.get("comparison_id") or f"comp_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "production_model": comparison_data.get("production_model"),
            "candidate_model": comparison_data.get("candidate_model"),
            "comparison_score": comparison_data.get("comparison_score"),
            "winner": comparison_data.get("winner"),
            "recommendation": comparison_data.get("recommendation"),
            "confidence_score": comparison_data.get("confidence_score"),
            "metric_summary": comparison_data.get("metrics_breakdown") or {},
            "created_at": datetime.now().isoformat(),
            "created_by": comparison_data.get("created_by") or "SYSTEM"
        }
        self.history.insert(0, entry)
        self._save_history()
        return entry

    def get_history(self):
        return self.history
