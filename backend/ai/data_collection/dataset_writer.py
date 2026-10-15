"""
dataset_writer.py
Storage writer for versioned training dataset CSV & JSON records.
"""

import os
import csv
import json
from datetime import datetime
from .config import DEFAULT_DATASET_CSV, DATASET_VERSION

class DatasetWriter:
    """
    Appends validated feature vectors to the continuous training dataset CSV & JSON audit files.
    """
    def __init__(self, csv_filepath=None):
        if csv_filepath is None:
            csv_filepath = DEFAULT_DATASET_CSV
        self.csv_filepath = csv_filepath
        os.makedirs(os.path.dirname(self.csv_filepath), exist_ok=True)
        self._ensure_header()

    def _ensure_header(self):
        if not os.path.exists(self.csv_filepath):
            with open(self.csv_filepath, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "hash_signature", "collection_time", "material_id", "quantity", 
                    "movement_type", "inventory_health_score", "stock_ratio", 
                    "validation_status", "validation_reason", "dataset_version", "features_json"
                ])

    def write_record(self, hash_sig, features, raw_record, dataset_version=None, validation_reason=None):
        collection_time = datetime.now().isoformat()
        if not dataset_version:
            from .version_manager import DatasetVersionManager
            dataset_version = DatasetVersionManager().get_current_version()

        row = [
            hash_sig,
            collection_time,
            features.get("material_id"),
            features.get("quantity"),
            features.get("movement_type"),
            features.get("inventory_health_score"),
            features.get("stock_ratio"),
            "VALIDATED",
            validation_reason or "NULL",
            dataset_version,
            json.dumps(features)
        ]

        try:
            with open(self.csv_filepath, "a", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(row)
            return True
        except Exception as e:
            return False
