"""
RollbackHistory.py
Module 7A.6 Rollback Manager – Audit History Tracker.
Persists rollback events to a local JSON audit log.
Tracks: REQUESTED, SIMULATION_STARTED, SIMULATION_PASSED, SIMULATION_FAILED,
        APPROVED, REJECTED, CANCELLED, MANUAL_OVERRIDE events.
"""

import os
import json
from datetime import datetime

class RollbackHistory:
    """
    Lightweight JSON-backed audit log for rollback lifecycle events.
    """

    def __init__(self):
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        data_dir = os.path.join(backend_dir, "ai_data", "rollback_manager")
        os.makedirs(data_dir, exist_ok=True)
        self.history_file = os.path.join(data_dir, "rollback_history.json")
        self._log = self._load()

    def _load(self) -> list:
        if os.path.exists(self.history_file):
            try:
                with open(self.history_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data if isinstance(data, list) else []
            except Exception:
                pass
        return []

    def _save(self):
        try:
            with open(self.history_file, "w", encoding="utf-8") as f:
                json.dump(self._log, f, indent=2, default=str)
        except Exception:
            pass

    def log_event(self, rollback_id: str, event_type: str, actor: str, reason: str,
                  current_model: str = "", target_model: str = "",
                  simulation_result: str = "", decision: str = "",
                  manual_override: bool = False, extra: dict = None):
        """
        Logs a rollback lifecycle event.
        event_type: REQUESTED | SIMULATION_STARTED | SIMULATION_PASSED | SIMULATION_FAILED |
                    APPROVED | REJECTED | CANCELLED | MANUAL_OVERRIDE
        """
        entry = {
            "rollback_id": rollback_id,
            "event_type": event_type,
            "current_model": current_model,
            "target_model": target_model,
            "decision": decision or event_type,
            "simulation_result": simulation_result,
            "reason": reason,
            "reviewed_by": actor,
            "manual_override": manual_override,
            "timestamp": datetime.now().isoformat(),
            **(extra or {})
        }
        self._log.insert(0, entry)
        self._log = self._log[:500]
        self._save()
        return entry

    def get_history(self, filter_type: str = None, limit: int = 100) -> list:
        """
        Returns history entries, optionally filtered by event_type or decision.
        """
        result = self._log
        if filter_type:
            ft = filter_type.upper()
            result = [
                e for e in result
                if e.get("event_type", "").upper() == ft or
                   e.get("decision", "").upper() == ft
            ]
        return result[:limit]

    def get_by_rollback_id(self, rollback_id: str) -> list:
        """Returns all events for a specific rollback_id."""
        return [e for e in self._log if e.get("rollback_id") == rollback_id]

    def get_latest(self) -> dict:
        """Returns the most recent rollback record."""
        return self._log[0] if self._log else {}
