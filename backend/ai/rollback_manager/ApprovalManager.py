"""
ApprovalManager.py
Module 7A.6 Rollback Manager – Approval Workflow Manager.
Handles approve, reject, and manual override for rollback plans.
Does NOT deploy models — only updates plan approval_status field.
"""

from datetime import datetime

class ApprovalManager:
    """
    Manages rollback approval workflow: approve, reject, manual override.
    All operations return updated plan dicts — nothing is deployed.
    """

    VALID_ACTIONS = {"APPROVE", "REJECT", "CANCEL", "OVERRIDE_APPROVE", "OVERRIDE_REJECT"}

    def approve(self, plan: dict, reviewer: str = "MANAGER", reason: str = "") -> tuple:
        """
        Approves a rollback plan.
        Returns: (success: bool, message: str, updated_plan: dict)
        """
        if plan.get("approval_status") == "APPROVED":
            return False, "Plan is already APPROVED.", plan

        if plan.get("validation_result") == "FAIL":
            return False, "Cannot approve a plan that failed eligibility validation.", plan

        updated = {**plan,
            "approval_status": "APPROVED",
            "decision": "APPROVED",
            "reviewed_by": reviewer,
            "approved_at": datetime.now().isoformat(),
            "approval_reason": reason or "Rollback plan approved after eligibility verification.",
            "manual_override": False
        }
        return True, f"Rollback plan '{plan.get('rollback_id')}' APPROVED by {reviewer}.", updated

    def reject(self, plan: dict, reviewer: str = "MANAGER", reason: str = "") -> tuple:
        """
        Rejects a rollback plan.
        Returns: (success: bool, message: str, updated_plan: dict)
        """
        if plan.get("approval_status") in {"APPROVED", "REJECTED"}:
            return False, f"Plan is already {plan['approval_status']}.", plan

        updated = {**plan,
            "approval_status": "REJECTED",
            "decision": "REJECTED",
            "reviewed_by": reviewer,
            "approved_at": datetime.now().isoformat(),
            "approval_reason": reason or "Rollback plan rejected.",
            "manual_override": False
        }
        return True, f"Rollback plan '{plan.get('rollback_id')}' REJECTED by {reviewer}.", updated

    def manual_override(self, plan: dict, override_action: str, reviewer: str = "ADMIN", reason: str = "") -> tuple:
        """
        Applies manual override regardless of validation state.
        override_action: APPROVE | REJECT
        Returns: (success: bool, message: str, updated_plan: dict)
        """
        action = override_action.upper().replace("OVERRIDE_", "")
        if action not in {"APPROVE", "REJECT"}:
            return False, f"Invalid override action: '{override_action}'. Must be APPROVE or REJECT.", plan

        new_status = "APPROVED" if action == "APPROVE" else "REJECTED"
        updated = {**plan,
            "approval_status": new_status,
            "decision": new_status,
            "reviewed_by": reviewer,
            "approved_at": datetime.now().isoformat(),
            "approval_reason": reason or f"Manual override: {new_status} by {reviewer}.",
            "manual_override": True
        }
        return True, f"Manual override applied: '{new_status}' for plan '{plan.get('rollback_id')}' by {reviewer}.", updated
