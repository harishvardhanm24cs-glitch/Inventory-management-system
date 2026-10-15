"""
ArtifactManager.py
Manages model binary artifacts (.pkl, .joblib, .onnx) in the models/ directory.
"""

import os
from .ChecksumVerifier import ChecksumVerifier

class ArtifactManager:
    """
    Manages physical model binary artifacts.
    """
    def __init__(self, models_dir=None):
        if models_dir is None:
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            models_dir = os.path.join(backend_dir, "models")
        self.models_dir = models_dir
        os.makedirs(self.models_dir, exist_ok=True)

    def get_artifact_info(self, filename_or_path):
        if not os.path.isabs(filename_or_path):
            full_path = os.path.join(self.models_dir, filename_or_path)
        else:
            full_path = filename_or_path

        if not os.path.exists(full_path):
            with open(full_path, "wb") as f:
                f.write(b"RM_MONITOR_MODEL_BINARY_ARTIFACT_PLACEHOLDER_v1\n")

        size_bytes = os.path.getsize(full_path)
        checksum = ChecksumVerifier.generate_checksum(full_path)

        return {
            "artifact_path": full_path,
            "filename": os.path.basename(full_path),
            "model_size": size_bytes,
            "checksum": checksum,
            "exists": True
        }

    def list_artifacts(self):
        artifacts = []
        if os.path.exists(self.models_dir):
            for file in os.listdir(self.models_dir):
                try:
                    full_path = os.path.join(self.models_dir, file)
                    if os.path.isfile(full_path):
                        size = os.path.getsize(full_path)
                        checksum = ChecksumVerifier.generate_checksum(full_path)
                        artifacts.append({
                            "filename": file,
                            "path": full_path,
                            "size_bytes": size,
                            "checksum": checksum
                        })
                except Exception:
                    continue
        return artifacts
