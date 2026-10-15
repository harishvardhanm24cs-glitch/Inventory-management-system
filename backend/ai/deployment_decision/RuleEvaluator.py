"""
RuleEvaluator.py
Evaluates candidate model attributes and comparison metrics against configured policies in PolicyEngine.
"""

class RuleEvaluator:
    """
    Evaluates policy rules against candidate model, production model, and comparison engine findings.
    """
    def __init__(self, policy_engine=None):
        from .PolicyEngine import PolicyEngine
        self.policy_engine = policy_engine or PolicyEngine()

    def evaluate(self, candidate_model, production_model, comparison_result=None):
        """
        Evaluates candidate model against production model and returns passed/failed/triggered rules.
        """
        policies = self.policy_engine.get_policies()
        
        passed_rules = []
        failed_rules = []
        triggered_rules = []

        cand_mae = float(candidate_model.get("mae", 999.0))
        prod_mae = float(production_model.get("mae", 999.0))

        cand_rmse = float(candidate_model.get("rmse", 999.0))
        prod_rmse = float(production_model.get("rmse", 999.0))

        cand_r2 = float(candidate_model.get("r2_score", 0.0))
        prod_r2 = float(production_model.get("r2_score", 0.0))

        cand_cv = float(candidate_model.get("cv_score", 0.0))
        prod_cv = float(production_model.get("cv_score", 0.0))

        cand_status = str(candidate_model.get("status", "CANDIDATE")).upper()
        cand_integrity = str(candidate_model.get("integrity_status", candidate_model.get("integrity", "VERIFIED"))).upper()
        cand_artifact = str(candidate_model.get("artifact_status", candidate_model.get("artifact", "VERIFIED"))).upper()
        dataset_integrity = str(candidate_model.get("dataset_integrity", "VERIFIED")).upper()

        rec = "ELIGIBLE_FOR_PROMOTION"
        if comparison_result and isinstance(comparison_result, dict):
            rec = comparison_result.get("recommendation", rec)

        if policies.get("higher_r2", {}).get("enabled", True):
            passed = cand_r2 > prod_r2 or (abs(cand_r2 - prod_r2) < 1e-6 and cand_r2 > 0)
            detail = f"Candidate R² ({cand_r2:.4f}) vs Production R² ({prod_r2:.4f})"
            rule_entry = {"key": "higher_r2", "name": "Higher R² Score", "detail": detail, "passed": passed}
            triggered_rules.append(rule_entry)
            (passed_rules if passed else failed_rules).append(rule_entry)

        if policies.get("lower_mae", {}).get("enabled", True):
            passed = cand_mae < prod_mae or (abs(cand_mae - prod_mae) < 1e-6)
            detail = f"Candidate MAE ({cand_mae:.4f}) vs Production MAE ({prod_mae:.4f})"
            rule_entry = {"key": "lower_mae", "name": "Lower MAE", "detail": detail, "passed": passed}
            triggered_rules.append(rule_entry)
            (passed_rules if passed else failed_rules).append(rule_entry)

        if policies.get("lower_rmse", {}).get("enabled", True):
            passed = cand_rmse < prod_rmse or (abs(cand_rmse - prod_rmse) < 1e-6)
            detail = f"Candidate RMSE ({cand_rmse:.4f}) vs Production RMSE ({prod_rmse:.4f})"
            rule_entry = {"key": "lower_rmse", "name": "Lower RMSE", "detail": detail, "passed": passed}
            triggered_rules.append(rule_entry)
            (passed_rules if passed else failed_rules).append(rule_entry)

        if policies.get("cv_score_gte", {}).get("enabled", True):
            passed = cand_cv >= prod_cv - 1e-6
            detail = f"Candidate CV ({cand_cv:.4f}) vs Production CV ({prod_cv:.4f})"
            rule_entry = {"key": "cv_score_gte", "name": "CV Score >= Production", "detail": detail, "passed": passed}
            triggered_rules.append(rule_entry)
            (passed_rules if passed else failed_rules).append(rule_entry)

        if policies.get("integrity_verified", {}).get("enabled", True):
            expected = policies["integrity_verified"].get("expected_value", "VERIFIED")
            passed = (cand_integrity == expected)
            detail = f"Candidate Integrity Status is '{cand_integrity}' (Expected: {expected})"
            rule_entry = {"key": "integrity_verified", "name": "Integrity VERIFIED", "detail": detail, "passed": passed}
            triggered_rules.append(rule_entry)
            (passed_rules if passed else failed_rules).append(rule_entry)

        if policies.get("artifact_verified", {}).get("enabled", True):
            expected = policies["artifact_verified"].get("expected_value", "VERIFIED")
            passed = (cand_artifact == expected)
            detail = f"Candidate Artifact Status is '{cand_artifact}' (Expected: {expected})"
            rule_entry = {"key": "artifact_verified", "name": "Artifact VERIFIED", "detail": detail, "passed": passed}
            triggered_rules.append(rule_entry)
            (passed_rules if passed else failed_rules).append(rule_entry)

        if policies.get("dataset_verified", {}).get("enabled", True):
            expected = policies["dataset_verified"].get("expected_value", "VERIFIED")
            passed = (dataset_integrity == expected)
            detail = f"Dataset Integrity Status is '{dataset_integrity}' (Expected: {expected})"
            rule_entry = {"key": "dataset_verified", "name": "Dataset VERIFIED", "detail": detail, "passed": passed}
            triggered_rules.append(rule_entry)
            (passed_rules if passed else failed_rules).append(rule_entry)

        if policies.get("candidate_status", {}).get("enabled", True):
            allowed = policies["candidate_status"].get("allowed_statuses", ["CANDIDATE", "STAGING", "DEVELOPMENT", "REGISTERED"])
            passed = cand_status in [s.upper() for s in allowed]
            detail = f"Candidate Status is '{cand_status}' (Allowed: {', '.join(allowed)})"
            rule_entry = {"key": "candidate_status", "name": "Status = CANDIDATE", "detail": detail, "passed": passed}
            triggered_rules.append(rule_entry)
            (passed_rules if passed else failed_rules).append(rule_entry)

        if policies.get("promotion_recommendation", {}).get("enabled", True):
            expected = policies["promotion_recommendation"].get("expected_value", "ELIGIBLE_FOR_PROMOTION")
            passed = (rec == expected)
            detail = f"Comparison Engine Recommendation is '{rec}' (Expected: {expected})"
            rule_entry = {"key": "promotion_recommendation", "name": "Recommendation = ELIGIBLE_FOR_PROMOTION", "detail": detail, "passed": passed}
            triggered_rules.append(rule_entry)
            (passed_rules if passed else failed_rules).append(rule_entry)

        total = len(triggered_rules)
        passed_count = len(passed_rules)
        confidence = round((passed_count / total * 100.0), 2) if total > 0 else 0.0

        return {
            "all_passed": len(failed_rules) == 0,
            "confidence": confidence,
            "passed_rules": passed_rules,
            "failed_rules": failed_rules,
            "triggered_rules": triggered_rules
        }
