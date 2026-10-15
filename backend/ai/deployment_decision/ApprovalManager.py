"""
ApprovalManager.py
Generates formal APPROVED or REJECTED decision outputs for candidate models.
"""

from datetime import datetime
import uuid

class ApprovalManager:
    """
    Manages candidate approval & rejection decision payload creation based on policy evaluation.
    """
    def generate_decision(self, prod_version, cand_version, eval_result, reviewer="SYSTEM", comparison_id=None):
        """
        Generates structured deployment evaluation decision.
        """
        all_passed = eval_result.get("all_passed", False)
        passed_rules = eval_result.get("passed_rules", [])
        failed_rules = eval_result.get("failed_rules", [])
        triggered_rules = eval_result.get("triggered_rules", [])
        confidence = eval_result.get("confidence", 0.0)

        decision = "APPROVED" if all_passed else "REJECTED"

        if all_passed:
            reason = f"Candidate model {cand_version} passed all {len(passed_rules)} policy rules with {confidence:.1f}% confidence."
        else:
            failed_names = [f["name"] for f in failed_rules]
            reason = f"Candidate model {cand_version} rejected due to {len(failed_rules)} policy failure(s): {', '.join(failed_names)}."

        now_str = datetime.now().strftime("%Y%m%d")
        rand_hex = uuid.uuid4().hex[:6].upper()
        decision_id = f"DEC-{now_str}-{rand_hex}"

        return {
            "decision_id": decision_id,
            "production_model": prod_version,
            "candidate_model": cand_version,
            "comparison_id": comparison_id,
            "decision": decision,
            "reason": reason,
            "confidence": confidence,
            "passed_rules": passed_rules,
            "failed_rules": failed_rules,
            "triggered_rules": triggered_rules,
            "manual_override": False,
            "reviewed_by": reviewer,
            "created_at": datetime.now().isoformat()
        }
