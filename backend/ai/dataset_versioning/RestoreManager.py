"""
RestoreManager.py
Restores archived dataset versions to active status.
"""

import os
import shutil
from datetime import datetime

class RestoreManager:
    """
    Restores archived datasets back into the active dataset snapshots directory.
    """
    def __init__(self, snapshot_dir=None):
        if snapshot_dir is None:
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            snapshot_dir = os.path.join(backend_dir, "ml_datasets", "snapshots")
        self.snapshot_dir = snapshot_dir
        os.makedirs(self.snapshot_dir, exist_ok=True)

    def restore_snapshot(self, archive_path):
        if not os.path.exists(archive_path):
            raise FileNotFoundError(f"Archived file not found: {archive_path}")

        filename = os.path.basename(archive_path)
        restored_path = os.path.join(self.snapshot_dir, filename)

        try:
            os.chmod(archive_path, 0o666)
        except Exception:
            pass

        shutil.move(archive_path, restored_path)

        try:
            os.chmod(restored_path, 0o444)
        except Exception:
            pass

        return {
            "status": "ACTIVE",
            "restored_path": restored_path,
            "restore_date": datetime.now().isoformat()
        }
