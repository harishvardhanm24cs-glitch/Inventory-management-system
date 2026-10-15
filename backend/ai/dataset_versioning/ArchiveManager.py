"""
ArchiveManager.py
Handles archiving of old dataset snapshot versions.
"""

import os
import shutil
from datetime import datetime

class ArchiveManager:
    """
    Archives inactive or older dataset versions while preserving full searchability and integrity.
    """
    def __init__(self, archive_dir=None):
        if archive_dir is None:
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            archive_dir = os.path.join(backend_dir, "ml_datasets", "archive")
        self.archive_dir = archive_dir
        os.makedirs(self.archive_dir, exist_ok=True)

    def archive_snapshot(self, snapshot_path):
        if not os.path.exists(snapshot_path):
            raise FileNotFoundError(f"Snapshot file to archive not found: {snapshot_path}")

        filename = os.path.basename(snapshot_path)
        archive_path = os.path.join(self.archive_dir, filename)

        try:
            os.chmod(snapshot_path, 0o666)
        except Exception:
            pass

        shutil.move(snapshot_path, archive_path)

        try:
            os.chmod(archive_path, 0o444)
        except Exception:
            pass

        return {
            "status": "ARCHIVED",
            "archive_path": archive_path,
            "archive_date": datetime.now().isoformat()
        }
