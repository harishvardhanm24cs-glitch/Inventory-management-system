import os
import sys
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from config import MODEL_REGISTRY_JSON
except ImportError:
    from ai_training.config import MODEL_REGISTRY_JSON


from datetime import datetime

try:
    from config import MODEL_REGISTRY_JSON, FEATURE_DATASET_CSV
except ImportError:
    from ai_training.config import MODEL_REGISTRY_JSON, FEATURE_DATASET_CSV


class ModelRegistryManager:
    """
    ModelRegistryManager
    ────────────────────
    Tracks model versions, deployment history, and evaluation metrics in model_registry.json.
    """

    def __init__(self, registry_path=None):
        self.registry_path = Path(registry_path or MODEL_REGISTRY_JSON)

    def get_registry(self) -> dict:
        if not self.registry_path.exists():
            return {
                "platform": "RM Monitor AI Platform",
                "version": "v1.0.0",
                "active_model_id": "RM_MONITOR_RULES_ENGINE_V1",
                "last_updated": datetime.now().isoformat(),
                "registered_models": [],
                "deployment_history": ["RM_MONITOR_RULES_ENGINE_V1"]
            }
        with open(self.registry_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def register_trained_model(
        self,
        model_name: str,
        algorithm: str,
        training_timestamp: str,
        dataset_used: str,
        number_of_features: int,
        training_samples: int,
        testing_samples: int,
        performance_metrics: dict,
        model_version: str,
        model_path: str
    ) -> dict:
        """
        Updates model_registry.json with new trained model entry.
        """
        registry = self.get_registry()

        model_entry = {
            "model_id": f"RM_MODEL_{model_version.upper()}",
            "model_name": model_name,
            "algorithm": algorithm,
            "training_timestamp": training_timestamp,
            "dataset_used": dataset_used,
            "number_of_features": number_of_features,
            "training_samples": training_samples,
            "testing_samples": testing_samples,
            "performance_metrics": performance_metrics,
            "model_version": model_version,
            "model_path": model_path,
            "deployment_status": "READY"
        }

        registry["registered_models"].append(model_entry)
        registry["active_model_id"] = model_entry["model_id"]
        registry["last_updated"] = datetime.now().isoformat()
        if "deployment_history" not in registry:
            registry["deployment_history"] = []
        registry["deployment_history"].append(model_entry["model_id"])

        with open(self.registry_path, "w", encoding="utf-8") as f:
            json.dump(registry, f, indent=2)

        print(f"[ModelRegistryManager] Registered model '{model_entry['model_id']}' in '{self.registry_path}'.")
        return model_entry


if __name__ == "__main__":
    mgr = ModelRegistryManager()
    print("[ModelRegistryManager] Active model ID:", mgr.get_registry().get("active_model_id"))

