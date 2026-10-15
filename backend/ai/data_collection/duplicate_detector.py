import os
import csv
import hashlib
from datetime import datetime, timedelta
from .config import DEFAULT_DATASET_CSV

class DuplicateDetector:
    """
    Prevents duplicate transaction records from entering the AI training dataset.
    """
    def __init__(self, time_window_sec=5):
        self.seen_signatures = set()
        self.seen_tx_ids = set()
        self.time_window_sec = time_window_sec
        self._load_existing_signatures()

    def _load_existing_signatures(self):
        try:
            if os.path.exists(DEFAULT_DATASET_CSV):
                with open(DEFAULT_DATASET_CSV, "r", encoding="utf-8") as f:
                    reader = csv.reader(f)
                    header = next(reader, None)
                    if header and "hash_signature" in header:
                        sig_idx = header.index("hash_signature")
                        for row in reader:
                            if len(row) > sig_idx and row[sig_idx]:
                                self.seen_signatures.add(row[sig_idx])
        except Exception:
            pass

    def generate_hash_signature(self, record):
        mat_id = str(record.get("material_id", ""))
        qty = str(record.get("quantity", ""))
        mov = str(record.get("movement_type", "")).upper()
        ts = str(record.get("timestamp", ""))

        raw_str = f"{mat_id}_{qty}_{mov}_{ts}"
        return hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

    def is_duplicate(self, record):
        tx_id = record.get("transaction_id") or record.get("id")
        if tx_id is not None and tx_id in self.seen_tx_ids:
            return True, f"Duplicate Transaction ID detected: {tx_id}"

        sig = self.generate_hash_signature(record)
        if sig in self.seen_signatures:
            return True, f"Duplicate hash signature detected: {sig[:12]}"

        self.seen_signatures.add(sig)
        if tx_id is not None:
            self.seen_tx_ids.add(tx_id)

        return False, "UNIQUE"

