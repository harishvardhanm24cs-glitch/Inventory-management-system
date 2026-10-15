"""
logger.py
Logging system for Continuous Data Collection module.
"""

import json
import os
from datetime import datetime

class CollectionLogger:
    def __init__(self, log_file=None):
        if log_file is None:
            log_file = os.path.join(os.path.dirname(__file__), "collection_events.jsonl")
        self.log_file = log_file
        self.stats = {
            "total_transactions": 0,
            "accepted_records": 0,
            "rejected_records": 0,
            "duplicate_records": 0,
            "features_generated": 0,
            "last_collection_time": None
        }

    def log_event(self, event_type, status, details=None):
        timestamp = datetime.now().isoformat()
        self.stats["last_collection_time"] = timestamp
        self.stats["total_transactions"] += 1

        if status == "PASSED":
            self.stats["accepted_records"] += 1
            if event_type == "FEATURES_GENERATED":
                self.stats["features_generated"] += 1
        elif status == "REJECTED":
            self.stats["rejected_records"] += 1
        elif status == "DUPLICATE":
            self.stats["duplicate_records"] += 1

        entry = {
            "timestamp": timestamp,
            "event_type": event_type,
            "status": status,
            "details": details or {}
        }

        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry) + "\n")
        except Exception:
            pass

        return entry

    def get_statistics(self):
        total = self.stats["total_transactions"]
        accepted = self.stats["accepted_records"]
        rejected = self.stats["rejected_records"]
        duplicates = self.stats["duplicate_records"]
        features_gen = self.stats["features_generated"]
        last_time = self.stats["last_collection_time"]

        if os.path.exists(self.log_file):
            try:
                p_total, p_accepted, p_rejected, p_duplicates, p_features = 0, 0, 0, 0, 0
                with open(self.log_file, "r", encoding="utf-8") as f:
                    for line in f:
                        if not line.strip():
                            continue
                        entry = json.loads(line)
                        p_total += 1
                        st = entry.get("status")
                        et = entry.get("event_type")
                        if st == "PASSED":
                            p_accepted += 1
                            if et == "FEATURES_GENERATED":
                                p_features += 1
                        elif st == "REJECTED":
                            p_rejected += 1
                        elif st == "DUPLICATE":
                            p_duplicates += 1
                        if entry.get("timestamp"):
                            last_time = entry.get("timestamp")
                total = max(total, p_total)
                accepted = max(accepted, p_accepted)
                rejected = max(rejected, p_rejected)
                duplicates = max(duplicates, p_duplicates)
                features_gen = max(features_gen, p_features)
            except Exception:
                pass

        success_rate = round((accepted / total) * 100, 2) if total > 0 else 100.0

        return {
            "total_transactions": total,
            "accepted_records": accepted,
            "rejected_records": rejected,
            "duplicate_records": duplicates,
            "features_generated": features_gen,
            "success_rate": success_rate,
            "last_collection_time": last_time or datetime.now().isoformat(),
            "pipeline_health": "HEALTHY" if rejected < 10 else "ATTENTION_REQUIRED"
        }
