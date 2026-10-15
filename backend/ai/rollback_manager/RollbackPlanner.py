"""
RollbackPlanner.py
Module 7A.6 Rollback Manager – Rollback Plan Generator.
Generates structured rollback plans for approved rollback targets.
Does NOT deploy or modify active production model.
"""

import os
from datetime import datetime
from .EligibilityValidator import EligibilityValidator

class RollbackPlanner:
    """
    Generates complete rollback plans with eligibility verification.
    A rollback plan is a structured, validated document — NOT an execution.
    """

    def __init__(self):
        self.validator = EligibilityValidator()
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.models_dir = os.path.join(backend_dir, "models")

    def generate_plan(self, current_model: dict, target_model: dict, reason: str = "", requested_by: str = "SYSTEM") -> dict:
        """
        Generates a rollback plan object.
        Returns a fully structured plan with eligibility checks embedded.
        """
        rollback_id = f"RB-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{str(target_model.get('model_version', 'UNK')).replace('.', '')}"

        eligibility = self.validator.validate(target_model)

        artifact_path = target_model.get("artifact_path", "")
        if not artifact_path:
            artifact_filename = target_model.get("artifact_filename", "")
            if artifact_filename:
                artifact_path = os.path.join(self.models_dir, artifact_filename)

        artifact_status = "VERIFIED" if (artifact_path and os.path.exists(artifact_path)) else "MISSING"
        artifact_size = 0
        if artifact_status == "VERIFIED":
            try:
                artifact_size = os.path.getsize(artifact_path)
            except Exception:
                pass

        expected_checksum = target_model.get("checksum", "")
        checksum_status = "UNVERIFIED"
        if artifact_status == "VERIFIED" and expected_checksum:
            try:
                import hashlib
                sha256 = hashlib.sha256()
                with open(artifact_path, "rb") as f:
                    for chunk in iter(lambda: f.read(4096), b""):
                        sha256.update(chunk)
                actual = sha256.hexdigest()
                checksum_status = "VERIFIED" if actual.lower() == expected_checksum.lower() else "MISMATCH"
            except Exception:
                checksum_status = "ERROR"

        dataset_version = target_model.get("dataset_version", "")
        dataset_status = "VERIFIED" if dataset_version else "MISSING"

        plan = {
            "rollback_id": rollback_id,
            "status": "PENDING",
            "current_production_model": str(current_model.get("model_version", "unknown")),
            "current_model_name": str(current_model.get("model_name", "Production Model")),
            "current_model_algorithm": str(current_model.get("algorithm", "Unknown")),
            "target_model": str(target_model.get("model_version", "unknown")),
            "target_model_name": str(target_model.get("model_name", "Rollback Target")),
            "target_model_algorithm": str(target_model.get("algorithm", "Unknown")),
            "target_model_status": str(target_model.get("status", "UNKNOWN")),
            "target_dataset_version": str(dataset_version),
            "reason": reason or "Rollback requested by system.",
            "requested_by": requested_by,
            "artifact_path": str(artifact_path),
            "artifact_status": artifact_status,
            "artifact_size_bytes": artifact_size,
            "checksum": str(expected_checksum)[:16] + "..." if expected_checksum else "N/A",
            "checksum_status": checksum_status,
            "dataset_status": dataset_status,
            "eligibility_result": eligibility,
            "validation_result": "PASS" if eligibility["eligible"] else "FAIL",
            "validation_failure_reasons": eligibility.get("failure_reasons", []),
            "performance_delta": {
                "mae_delta": round(float(current_model.get("mae", 0.85)) - float(target_model.get("mae", 0.85)), 4),
                "r2_delta": round(float(target_model.get("r2_score", 0.94)) - float(current_model.get("r2_score", 0.94)), 4),
                "rmse_delta": round(float(current_model.get("rmse", 1.12)) - float(target_model.get("rmse", 1.12)), 4),
            },
            "target_metrics": {
                "mae": float(target_model.get("mae", 0.85)),
                "rmse": float(target_model.get("rmse", 1.12)),
                "r2_score": float(target_model.get("r2_score", 0.94)),
                "cv_score": float(target_model.get("cv_score", 0.92)),
            },
            "current_metrics": {
                "mae": float(current_model.get("mae", 0.85)),
                "rmse": float(current_model.get("rmse", 1.12)),
                "r2_score": float(current_model.get("r2_score", 0.94)),
                "cv_score": float(current_model.get("cv_score", 0.92)),
            },
            "created_at": datetime.now().isoformat(),
            "simulation_result": None,
            "approval_status": "PENDING",
            "reviewed_by": None,
            "approved_at": None,
        }
        return plan
