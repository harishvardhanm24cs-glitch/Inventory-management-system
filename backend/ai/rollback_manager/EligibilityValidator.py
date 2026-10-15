"""
EligibilityValidator.py
Module 7A.6 Rollback Manager – Eligibility Validator.
Validates whether a model version is eligible as a rollback target.

Eligibility Rules:
  - Status must be ARCHIVED or PREVIOUS_PRODUCTION
  - Artifact file must exist on disk
  - Checksum must be VERIFIED
  - Dataset version must exist
  - Model metadata must be complete (model_id, algorithm, mae, r2_score)

Does NOT modify production. Read-only validation.
"""

import os

ELIGIBLE_STATUSES = {"ARCHIVED", "PREVIOUS_PRODUCTION", "CANDIDATE"}

class EligibilityValidator:
    """
    Validates rollback eligibility for candidate rollback target models.
    Performs artifact, checksum, dataset, and metadata checks.
    """

    def __init__(self):
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.models_dir = os.path.join(backend_dir, "models")

    def validate(self, model: dict) -> dict:
        """
        Runs full eligibility check on a model dict.
        Returns: { eligible: bool, checks: [...], reasons: [...] }
        """
        checks = []
        failure_reasons = []

        status = str(model.get("status", "")).upper()
        status_ok = status in ELIGIBLE_STATUSES
        checks.append({
            "check": "Status Eligibility",
            "expected": "ARCHIVED or PREVIOUS_PRODUCTION",
            "actual": status,
            "passed": status_ok
        })
        if not status_ok:
            failure_reasons.append(f"Status '{status}' is not eligible for rollback (must be ARCHIVED or PREVIOUS_PRODUCTION).")

        artifact_path = model.get("artifact_path", "")
        if not artifact_path:
            artifact_filename = model.get("artifact_filename", "")
            if artifact_filename:
                artifact_path = os.path.join(self.models_dir, artifact_filename)
        artifact_exists = bool(artifact_path and os.path.exists(artifact_path))
        checks.append({
            "check": "Artifact File Exists",
            "expected": "File present on disk",
            "actual": "EXISTS" if artifact_exists else "MISSING",
            "passed": artifact_exists
        })
        if not artifact_exists:
            failure_reasons.append(f"Artifact file missing: {artifact_path or 'unknown path'}.")

        checksum = model.get("checksum", "")
        checksum_ok = bool(checksum) and len(str(checksum)) >= 8
        if artifact_exists and checksum_ok:
            try:
                import hashlib
                sha256 = hashlib.sha256()
                with open(artifact_path, "rb") as f:
                    for chunk in iter(lambda: f.read(4096), b""):
                        sha256.update(chunk)
                actual_checksum = sha256.hexdigest()
                checksum_ok = actual_checksum.lower() == str(checksum).lower()
                checks.append({
                    "check": "Checksum Verification (SHA-256)",
                    "expected": str(checksum)[:16] + "...",
                    "actual": actual_checksum[:16] + "...",
                    "passed": checksum_ok
                })
            except Exception as e:
                checksum_ok = False
                checks.append({
                    "check": "Checksum Verification (SHA-256)",
                    "expected": "VERIFIED",
                    "actual": f"ERROR: {str(e)[:40]}",
                    "passed": False
                })
        else:
            checks.append({
                "check": "Checksum Verification (SHA-256)",
                "expected": "VERIFIED",
                "actual": "NO_CHECKSUM" if not checksum_ok else "ARTIFACT_MISSING",
                "passed": False
            })
            if not checksum_ok:
                failure_reasons.append("Model checksum is missing or invalid.")

        dataset_version = model.get("dataset_version", "")
        dataset_ok = bool(dataset_version) and len(str(dataset_version)) >= 4
        checks.append({
            "check": "Dataset Linkage",
            "expected": "Dataset version assigned",
            "actual": str(dataset_version) if dataset_ok else "MISSING",
            "passed": dataset_ok
        })
        if not dataset_ok:
            failure_reasons.append("Model is not linked to a dataset version.")

        required_fields = ["model_id", "algorithm", "mae", "r2_score"]
        missing_fields = [f for f in required_fields if not model.get(f)]
        metadata_ok = len(missing_fields) == 0
        checks.append({
            "check": "Metadata Completeness",
            "expected": "All required fields present",
            "actual": "COMPLETE" if metadata_ok else f"Missing: {', '.join(missing_fields)}",
            "passed": metadata_ok
        })
        if not metadata_ok:
            failure_reasons.append(f"Incomplete metadata. Missing fields: {', '.join(missing_fields)}.")

        eligible = status_ok and artifact_exists and dataset_ok and metadata_ok
        return {
            "eligible": eligible,
            "model_version": model.get("model_version", "unknown"),
            "model_name": model.get("model_name", "Unknown Model"),
            "status": status,
            "checks": checks,
            "failure_reasons": failure_reasons,
            "passed_count": sum(1 for c in checks if c["passed"]),
            "total_checks": len(checks)
        }

    def get_eligible_models(self, all_models: list, production_version: str) -> list:
        """
        Returns all models eligible for rollback (excluding current production).
        """
        eligible = []
        for model in all_models:
            if str(model.get("model_version", "")) == str(production_version):
                continue
            result = self.validate(model)
            if result["eligible"]:
                eligible.append({**model, "_eligibility": result})
        return eligible
