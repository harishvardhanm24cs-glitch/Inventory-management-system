import os
import sys
import re
import joblib
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from config import EXPORT_MODEL_DIR, LOCAL_STAGING_MODEL_DIR, MODEL_NAME_PREFIX
except ImportError:
    from ai_training.config import EXPORT_MODEL_DIR, LOCAL_STAGING_MODEL_DIR, MODEL_NAME_PREFIX


class ModelExporter:
    """
    ModelExporter
    ─────────────
    Exports trained models to primary directory (ai/models/) and local staging
    with automatic versioning safeguards (never overwriting existing models).
    """

    def __init__(self, export_dir=None, staging_dir=None):
        self.export_dir = Path(export_dir or EXPORT_MODEL_DIR)
        self.staging_dir = Path(staging_dir or LOCAL_STAGING_MODEL_DIR)
        os.makedirs(self.export_dir, exist_ok=True)
        os.makedirs(self.staging_dir, exist_ok=True)

    def _determine_next_version(self, model_prefix=MODEL_NAME_PREFIX) -> tuple[str, int]:
        """
        Scans export directory for existing model files like rm_model_v1.joblib,
        rm_model_v2.joblib, etc., and calculates the next increment version.
        """
        existing_versions = []
        if self.export_dir.exists():
            for f in self.export_dir.iterdir():
                if f.is_file() and f.name.startswith(model_prefix) and f.suffix in [".joblib", ".pkl"]:
                    match = re.search(r"_v(\d+)\.", f.name)
                    if match:
                        existing_versions.append(int(match.group(1)))

        next_ver_num = max(existing_versions) + 1 if existing_versions else 1
        version_str = f"v{next_ver_num}"
        return version_str, next_ver_num

    def export(self, model_object, model_prefix=MODEL_NAME_PREFIX, format_ext="joblib") -> dict:
        """
        Exports model using Joblib into ai/models/ and ai_training/models/.
        """
        version_str, ver_num = self._determine_next_version(model_prefix)
        filename = f"{model_prefix}_{version_str}.{format_ext}"

        target_path = self.export_dir / filename
        staging_path = self.staging_dir / filename

        # Safeguard against accidental overwrite
        counter = ver_num
        while target_path.exists():
            counter += 1
            version_str = f"v{counter}"
            filename = f"{model_prefix}_{version_str}.{format_ext}"
            target_path = self.export_dir / filename
            staging_path = self.staging_dir / filename

        # Save model using joblib
        joblib.dump(model_object, target_path)
        joblib.dump(model_object, staging_path)

        print(f"[ModelExporter] Model saved successfully.")
        print(f"[ModelExporter] Version : {version_str}")
        print(f"[ModelExporter] Exported to: '{target_path}'")

        return {
            "model_version": version_str,
            "version_number": counter,
            "filename": filename,
            "export_path": str(target_path),
            "staging_path": str(staging_path)
        }


if __name__ == "__main__":
    exporter = ModelExporter()
    v_str, v_num = exporter._determine_next_version()
    print(f"[ModelExporter] Next calculated version: {v_str}")

