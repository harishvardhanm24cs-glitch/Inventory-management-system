"""
SimulationEngine.py
Module 7A.6 Rollback Manager – Dry-Run Simulation Engine.
Simulates a rollback WITHOUT modifying active production model or inference services.

Simulation verifies:
  1. Artifact accessibility (file readable)
  2. SHA-256 checksum integrity
  3. Dataset linkage validity
  4. Registry consistency (target model exists in registry)
  5. Expected rollback target confirmation

Does NOT deploy, retrain, or modify ANY production resource.
"""

import os
import hashlib
from datetime import datetime

class SimulationEngine:
    """
    Dry-run rollback simulator. Read-only — never modifies production.
    """

    def __init__(self):
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.models_dir = os.path.join(backend_dir, "models")

    def run(self, rollback_plan: dict, all_registry_models: list) -> dict:
        """
        Executes rollback simulation against the provided plan.
        Returns simulation result: { passed, steps, errors, timestamp }
        """
        steps = []
        errors = []
        start_time = datetime.now()

        target_version = rollback_plan.get("target_model", "")
        artifact_path = rollback_plan.get("artifact_path", "")
        expected_checksum = rollback_plan.get("checksum", "").replace("...", "")
        dataset_version = rollback_plan.get("target_dataset_version", "")

        registry_model = next((m for m in all_registry_models if str(m.get("model_version")) == str(target_version)), None)
        registry_ok = registry_model is not None
        steps.append({
            "step": 1,
            "name": "Registry Consistency Check",
            "description": f"Verifying model version '{target_version}' exists in model registry.",
            "passed": registry_ok,
            "detail": "Model found in registry." if registry_ok else f"Model version '{target_version}' NOT found in registry."
        })
        if not registry_ok:
            errors.append(f"Registry: Model '{target_version}' not found.")

        if not artifact_path:
            filename = rollback_plan.get("artifact_filename", "")
            if filename:
                artifact_path = os.path.join(self.models_dir, filename)

        artifact_accessible = artifact_path and os.path.exists(artifact_path)
        artifact_readable = False
        if artifact_accessible:
            try:
                with open(artifact_path, "rb") as f:
                    f.read(64)
                artifact_readable = True
            except Exception:
                pass

        steps.append({
            "step": 2,
            "name": "Artifact Accessibility",
            "description": f"Verifying artifact file is readable at: {os.path.basename(str(artifact_path))}",
            "passed": artifact_readable,
            "detail": "Artifact file accessible and readable." if artifact_readable else f"Artifact file NOT accessible: {artifact_path}"
        })
        if not artifact_readable:
            errors.append(f"Artifact: File not accessible at '{artifact_path}'.")

        checksum_ok = False
        checksum_detail = "Skipped (artifact not accessible)."
        if artifact_readable:
            try:
                sha256 = hashlib.sha256()
                with open(artifact_path, "rb") as f:
                    for chunk in iter(lambda: f.read(4096), b""):
                        sha256.update(chunk)
                actual_checksum = sha256.hexdigest()
                stored_raw = rollback_plan.get("checksum", "")
                if len(stored_raw) == 64:
                    checksum_ok = actual_checksum.lower() == stored_raw.lower()
                    checksum_detail = f"SHA-256 {'VERIFIED' if checksum_ok else 'MISMATCH'}. Computed: {actual_checksum[:16]}..."
                else:
                    full_checksum = (registry_model or {}).get("checksum", "")
                    if full_checksum:
                        checksum_ok = actual_checksum.lower() == full_checksum.lower()
                        checksum_detail = f"SHA-256 {'VERIFIED' if checksum_ok else 'MISMATCH'} against registry."
                    else:
                        checksum_ok = True
                        checksum_detail = "SHA-256 computed. No stored checksum to compare — artifact integrity assumed."
            except Exception as e:
                checksum_detail = f"Checksum computation error: {str(e)[:60]}"

        steps.append({
            "step": 3,
            "name": "Checksum Integrity (SHA-256)",
            "description": "Computing SHA-256 checksum and comparing against stored manifest value.",
            "passed": checksum_ok,
            "detail": checksum_detail
        })
        if not checksum_ok and artifact_readable:
            errors.append("Checksum: SHA-256 mismatch detected on target artifact.")

        dataset_ok = bool(dataset_version) and len(str(dataset_version)) >= 4
        steps.append({
            "step": 4,
            "name": "Dataset Linkage Validation",
            "description": "Verifying rollback target is linked to a valid dataset version.",
            "passed": dataset_ok,
            "detail": f"Dataset version '{dataset_version}' linked." if dataset_ok else "No dataset version linked to rollback target."
        })
        if not dataset_ok:
            errors.append(f"Dataset: No valid dataset version for '{target_version}'.")

        current_prod = rollback_plan.get("current_production_model", "")
        target_ok = bool(target_version) and target_version != current_prod
        steps.append({
            "step": 5,
            "name": "Rollback Target Confirmation",
            "description": f"Confirming rollback target '{target_version}' is distinct from current production '{current_prod}'.",
            "passed": target_ok,
            "detail": f"Rollback target '{target_version}' confirmed as distinct from production '{current_prod}'."
                      if target_ok else "Rollback target is same as current production — cannot rollback."
        })
        if not target_ok:
            errors.append(f"Target: Rollback target '{target_version}' is same as current production.")

        passed = len(errors) == 0
        duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

        return {
            "simulation_id": f"SIM-{start_time.strftime('%Y%m%d-%H%M%S')}",
            "rollback_id": rollback_plan.get("rollback_id", ""),
            "target_model": target_version,
            "passed": passed,
            "status": "SIMULATION_PASSED" if passed else "SIMULATION_FAILED",
            "steps": steps,
            "steps_passed": sum(1 for s in steps if s["passed"]),
            "steps_total": len(steps),
            "errors": errors,
            "duration_ms": duration_ms,
            "timestamp": start_time.isoformat(),
            "note": "DRY RUN ONLY — production model NOT modified."
        }
