"""
DecisionHistory.py
Manages persistent decision history manifest file (backend/models/deployment_decisions_manifest.json).
"""

import os
import json
from datetime import datetime

class DecisionHistory:
    """
    Manages persistent JSON history for model deployment decisions.
    """
    def __init__(self, models_dir=None):
        if models_dir is None:
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            models_dir = os.path.join(backend_dir, "models")
        self.models_dir = models_dir
        os.makedirs(self.models_dir, exist_ok=True)
        self.manifest_file = os.path.join(self.models_dir, "deployment_decisions_manifest.json")
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

    def log_decision(self, decision_data):
        """
        Logs a new decision record to history.
        """
        decision_id = decision_data.get("decision_id")
        for idx, item in enumerate(self.history):
            if item.get("decision_id") == decision_id:
                self.history[idx] = decision_data
                self._save_history()
                return decision_data

        self.history.insert(0, decision_data)
        self._save_history()
        return decision_data

    def get_decision_by_id(self, decision_id):
        for item in self.history:
            if item.get("decision_id") == decision_id:
                return item
        return None

    def get_latest_decision(self):
        return self.history[0] if self.history else None

    def get_history(self, filter_type=None):
        """
        Returns decision history, optionally filtered by state (APPROVED, REJECTED, OVERRIDDEN, CANCELLED).
        """
        if not filter_type:
            return self.history
        ft = filter_type.upper()
        if ft == "OVERRIDDEN":
            return [item for item in self.history if item.get("manual_override")]
        return [item for item in self.history if str(item.get("decision")).upper() == ft]
