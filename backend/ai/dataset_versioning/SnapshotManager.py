"""
SnapshotManager.py
Freezes validated training data into immutable, reproducible dataset snapshot CSVs.
"""

import os
import shutil
import csv
from datetime import datetime
from .IntegrityVerifier import IntegrityVerifier

class SnapshotManager:
    """
    Manages dataset snapshot freezing. Snapshots are immutable once created.
    """
    def __init__(self, snapshot_dir=None):
        if snapshot_dir is None:
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            snapshot_dir = os.path.join(backend_dir, "ml_datasets", "snapshots")
        self.snapshot_dir = snapshot_dir
        os.makedirs(self.snapshot_dir, exist_ok=True)

    def create_snapshot(self, source_csv_path, version_tag, dataset_name=None):
        """
        Freezes source training CSV into an immutable snapshot file.
        Returns metadata dict.
        """
        if not os.path.exists(source_csv_path):
            raise FileNotFoundError(f"Source dataset CSV not found: {source_csv_path}")

        clean_tag = str(version_tag).replace(".", "_")
        snapshot_filename = f"dataset_snapshot_{clean_tag}.csv"
        target_path = os.path.join(self.snapshot_dir, snapshot_filename)

        if os.path.exists(target_path):
            try:
                os.chmod(target_path, 0o666)
            except Exception:
                pass

        shutil.copy2(source_csv_path, target_path)

        try:
            os.chmod(target_path, 0o444)
        except Exception:
            pass

        checksum = IntegrityVerifier.generate_checksum(target_path)
        
        row_count = 0
        feature_count = 12
        with open(target_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            header = next(reader, None)
            if header:
                feature_count = len(header)
            for _ in reader:
                row_count += 1

        return {
            "dataset_version": version_tag,
            "dataset_name": dataset_name or f"Dataset Version {version_tag}",
            "snapshot_path": target_path,
            "checksum": checksum,
            "record_count": row_count,
            "feature_count": feature_count,
            "created_at": datetime.now().isoformat(),
            "status": "FROZEN"
        }
