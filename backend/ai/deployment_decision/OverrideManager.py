"""
OverrideManager.py
Manages manual override (manual approve / manual reject) workflows and audits override rationale.
"""

from datetime import datetime

class OverrideManager:
    """
    Manages manual approval/rejection overrides with audit trailing.
    """
    def apply_override(self, decision_record, override_action, reviewer="MANAGER", reason="Manual override applied by administrator"):
        """
        Applies a manual override on an existing decision record.
        override_action: 'APPROVE' | 'REJECT' | 'CANCEL'
        """
        if not decision_record or not isinstance(decision_record, dict):
            return False, "Invalid decision record", None

        original_decision = decision_record.get("decision")
        action = override_action.upper()

        if action in ["APPROVE", "APPROVED", "MANUAL_APPROVED"]:
            new_decision = "APPROVED"
        elif action in ["REJECT", "REJECTED", "MANUAL_REJECTED"]:
            new_decision = "REJECTED"
        elif action in ["CANCEL", "CANCELLED"]:
            new_decision = "CANCELLED"
        else:
            return False, f"Unsupported override action '{override_action}'", None

        audit_entry = {
            "previous_decision": original_decision,
            "new_decision": new_decision,
            "override_action": action,
            "reviewed_by": reviewer,
            "reason": reason,
            "timestamp": datetime.now().isoformat()
        }

        updated_record = dict(decision_record)
        updated_record["decision"] = new_decision
        updated_record["manual_override"] = True
        updated_record["reviewed_by"] = reviewer
        updated_record["reason"] = f"OVERRIDE [{reviewer}]: {reason} (Previous: {original_decision})"
        updated_record["override_audit"] = audit_entry
        updated_record["updated_at"] = datetime.now().isoformat()

        return True, f"Manual override successfully changed decision to {new_decision}.", updated_record
