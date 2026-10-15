"""
PolicyEngine.py
Defines configurable deployment policy rules and manages policy threshold configurations for Module 7A.5.
"""

class PolicyEngine:
    """
    Manages configurable rules and policy thresholds for model deployment evaluation.
    """
    DEFAULT_POLICIES = {
        "higher_r2": {
            "name": "Higher R² Score",
            "description": "Candidate R² score must be strictly greater than or equal to production model R²",
            "enabled": True,
            "metric": "r2_score",
            "operator": "gt"
        },
        "lower_mae": {
            "name": "Lower MAE",
            "description": "Candidate Mean Absolute Error (MAE) must be lower than production model MAE",
            "enabled": True,
            "metric": "mae",
            "operator": "lt"
        },
        "lower_rmse": {
            "name": "Lower RMSE",
            "description": "Candidate Root Mean Square Error (RMSE) must be lower than production model RMSE",
            "enabled": True,
            "metric": "rmse",
            "operator": "lt"
        },
        "cv_score_gte": {
            "name": "CV Score >= Production",
            "description": "Candidate Cross-Validation score must be greater than or equal to production model CV score",
            "enabled": True,
            "metric": "cv_score",
            "operator": "gte"
        },
        "integrity_verified": {
            "name": "Integrity VERIFIED",
            "description": "Candidate model integrity status must be VERIFIED",
            "enabled": True,
            "expected_value": "VERIFIED"
        },
        "artifact_verified": {
            "name": "Artifact VERIFIED",
            "description": "Candidate model artifact file checksum and state must be VERIFIED",
            "enabled": True,
            "expected_value": "VERIFIED"
        },
        "dataset_verified": {
            "name": "Dataset VERIFIED",
            "description": "Training dataset integrity and state must be VERIFIED",
            "enabled": True,
            "expected_value": "VERIFIED"
        },
        "candidate_status": {
            "name": "Status = CANDIDATE",
            "description": "Candidate model status must be in acceptable non-production states (CANDIDATE, STAGING, DEVELOPMENT)",
            "enabled": True,
            "allowed_statuses": ["CANDIDATE", "STAGING", "DEVELOPMENT", "REGISTERED"]
        },
        "promotion_recommendation": {
            "name": "Recommendation = ELIGIBLE_FOR_PROMOTION",
            "description": "Comparison engine recommendation must be ELIGIBLE_FOR_PROMOTION",
            "enabled": True,
            "expected_value": "ELIGIBLE_FOR_PROMOTION"
        }
    }

    def __init__(self, custom_policies=None):
        self.policies = dict(self.DEFAULT_POLICIES)
        if custom_policies and isinstance(custom_policies, dict):
            for k, v in custom_policies.items():
                if k in self.policies and isinstance(v, dict):
                    self.policies[k].update(v)

    def get_policies(self):
        """Returns the current policy configuration."""
        return self.policies

    def update_policy(self, rule_key, settings):
        """Updates settings for a specific rule."""
        if rule_key in self.policies:
            if isinstance(settings, dict):
                self.policies[rule_key].update(settings)
            return True, f"Policy '{rule_key}' updated successfully."
        return False, f"Policy '{rule_key}' does not exist."

    def save_policies(self, new_policies):
        """Overwrites configurable policies with validated settings."""
        if not isinstance(new_policies, dict):
            return False, "Policies payload must be a dictionary."
        for k, v in new_policies.items():
            if isinstance(v, dict):
                if k not in self.policies:
                    self.policies[k] = v
                else:
                    self.policies[k].update(v)
        return True, "Policies updated successfully."
