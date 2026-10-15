"""
ModelRegistry.py
Main Model Registry Orchestrator for Module 7A.3 Model Registry System.
Manages trained model registration, artifacts, performance metrics, dataset linkages, status transitions, and audit history.
"""

import os
import json
from datetime import datetime
from .ChecksumVerifier import ChecksumVerifier
from .ArtifactManager import ArtifactManager
from .MetadataManager import MetadataManager
from .DatasetLinkManager import DatasetLinkManager
from .StatusManager import StatusManager
from .HistoryManager import HistoryManager

class ModelRegistry:
    """
    Production-ready Model Registry Orchestrator.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(ModelRegistry, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.models_dir = os.path.join(backend_dir, "models")
        self.manifest_file = os.path.join(self.models_dir, "model_registry_manifest.json")

        self.artifact_manager = ArtifactManager(self.models_dir)
        self.checksum_verifier = ChecksumVerifier()
        self.metadata_manager = MetadataManager()
        self.dataset_link_manager = DatasetLinkManager()
        self.status_manager = StatusManager()
        self.history_manager = HistoryManager()

        self.registry = self._load_manifest()

    def _load_manifest(self):
        if os.path.exists(self.manifest_file):
            try:
                with open(self.manifest_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return []

    def _save_manifest(self):
        try:
            with open(self.manifest_file, "w", encoding="utf-8") as f:
                f.write(json.dumps(self.registry, indent=2))
        except Exception:
            pass

    def list_models(self):
        return self.registry

    def get_current_production_model(self):
        prod = next((item for item in self.registry if item.get("status") == "PRODUCTION" or item.get("is_production")), None)
        if not prod and self.registry:
            prod = self.registry[0]
        return prod

    def get_model_by_version(self, model_version):
        for item in self.registry:
            if str(item.get("model_version")) == str(model_version):
                return item
        return None

    def register_model(self, payload):
        model_version = payload.get("model_version")
        if not model_version:
            now = datetime.now()
            seq = len(self.registry) + 1
            model_version = f"v{now.year}.{now.month:02d}.{seq}"

        model_name = payload.get("model_name") or f"Model {model_version}"
        algorithm = payload.get("algorithm") or "GradientBoostingRegressor"
        dataset_version = payload.get("dataset_version") or "2026.08.001"
        status = payload.get("status") or "DEVELOPMENT"
        status = self.status_manager.validate_status(status)

        artifact_filename = payload.get("artifact_filename") or f"{algorithm.lower()}_{model_version.replace('.', '_')}.pkl"
        artifact_info = self.artifact_manager.get_artifact_info(artifact_filename)

        meta = self.metadata_manager.format_metadata(payload)

        model_id = payload.get("model_id") or f"mod_{algorithm.lower()[:5]}_{model_version.replace('.', '_')}"

        entry = {
            "model_id": model_id,
            "model_name": model_name,
            "model_version": model_version,
            "algorithm": algorithm,
            "dataset_version": dataset_version,
            "status": status,
            "is_production": (status == "PRODUCTION"),
            "artifact_path": artifact_info["artifact_path"],
            "artifact_filename": artifact_info["filename"],
            "checksum": artifact_info["checksum"],
            "training_date": payload.get("training_date") or datetime.now().isoformat(),
            "mae": meta["mae"],
            "rmse": meta["rmse"],
            "r2_score": meta["r2_score"],
            "cv_score": meta["cv_score"],
            "feature_count": meta["feature_count"],
            "features_json": meta["features_json"],
            "sample_count": meta["sample_count"],
            "training_duration": meta["training_duration"],
            "model_size": artifact_info["model_size"],
            "created_by": payload.get("created_by") or "SYSTEM",
            "description": payload.get("description") or f"Trained {algorithm} model on dataset {dataset_version}",
            "tags": payload.get("tags") or "production-candidate",
            "created_at": datetime.now().isoformat()
        }

        if status == "PRODUCTION":
            for item in self.registry:
                if item.get("status") == "PRODUCTION":
                    item["status"] = "CANDIDATE"
                    item["is_production"] = False

        self.registry = [r for r in self.registry if r.get("model_version") != model_version]
        self.registry.insert(0, entry)
        self._save_manifest()

        self.history_manager.log_action(model_version, "REGISTERED", entry["created_by"], f"Registered model {model_version} with dataset {dataset_version}")
        return entry

    def promote_model(self, model_version, actor="SYSTEM"):
        promoted = self.status_manager.promote_to_production(model_version, self.registry)
        self._save_manifest()
        self.history_manager.log_action(model_version, "PROMOTED", actor, f"Promoted model version {model_version} to PRODUCTION.")
        return promoted

    def archive_model(self, model_version, actor="SYSTEM"):
        model = self.get_model_by_version(model_version)
        if not model:
            raise ValueError(f"Model version {model_version} not found.")

        if model.get("status") == "PRODUCTION":
            raise ValueError(f"Cannot archive active PRODUCTION model {model_version}. Promote another model first.")

        model["status"] = "ARCHIVED"
        model["is_production"] = False
        self._save_manifest()
        self.history_manager.log_action(model_version, "ARCHIVED", actor, f"Archived model version {model_version}.")
        return model

    def update_status(self, model_version, status, actor="SYSTEM"):
        clean_status = self.status_manager.validate_status(status)
        if clean_status == "PRODUCTION":
            return self.promote_model(model_version, actor)

        model = self.get_model_by_version(model_version)
        if not model:
            raise ValueError(f"Model version {model_version} not found.")

        model["status"] = clean_status
        model["is_production"] = False
        self._save_manifest()
        self.history_manager.log_action(model_version, "STATUS_CHANGED", actor, f"Updated status to {clean_status}")
        return model

    def verify_artifact(self, model_version):
        model = self.get_model_by_version(model_version)
        if not model:
            return False, f"Model version {model_version} not found.", None

        artifact_path = model.get("artifact_path")
        expected_checksum = model.get("checksum")

        is_valid, current_checksum, msg = self.checksum_verifier.verify_artifact(artifact_path, expected_checksum)
        self.history_manager.log_action(model_version, "CHECKSUM_VERIFIED", "SYSTEM", msg)
        return is_valid, msg, {
            "model_version": model_version,
            "expected_checksum": expected_checksum,
            "current_checksum": current_checksum,
            "is_valid": is_valid
        }
