"""
HistoryManager.py
Logs lifecycle audit events for registered models.
"""

from datetime import datetime

class HistoryManager:
    """
    Logs model lifecycle audit entries (REGISTERED, STATUS_CHANGED, PROMOTED, ARCHIVED, CHECKSUM_VERIFIED).
    """
    def __init__(self):
        self.events = []

    def log_action(self, model_version, action, actor="SYSTEM", details=""):
        entry = {
            "model_version": model_version,
            "action": action,
            "actor": actor,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.events.append(entry)
        return entry

    def get_history(self):
        return self.events
