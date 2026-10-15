"""
StatusManager.py
Manages model lifecycle statuses (DEVELOPMENT, CANDIDATE, PRODUCTION, ARCHIVED)
and enforces single PRODUCTION model rule.
"""

class StatusManager:
    """
    Handles model lifecycle status transitions.
    """
    VALID_STATUSES = ["DEVELOPMENT", "CANDIDATE", "PRODUCTION", "ARCHIVED"]

    @staticmethod
    def validate_status(status):
        upper_status = str(status).upper()
        if upper_status not in StatusManager.VALID_STATUSES:
            raise ValueError(f"Invalid model status '{status}'. Must be one of {StatusManager.VALID_STATUSES}")
        return upper_status

    @staticmethod
    def promote_to_production(model_version, registry_items):
        """
        Promotes specified model version to PRODUCTION status and sets all other models' status to CANDIDATE or DEVELOPMENT.
        """
        promoted = None
        for item in registry_items:
            if str(item.get("model_version")) == str(model_version):
                if item.get("status") == "ARCHIVED":
                    raise ValueError(f"Cannot promote archived model {model_version}. Restore/un-archive it first.")
                item["status"] = "PRODUCTION"
                item["is_production"] = True
                promoted = item
            else:
                if item.get("status") == "PRODUCTION":
                    item["status"] = "CANDIDATE"
                item["is_production"] = False

        if not promoted:
            raise ValueError(f"Model version {model_version} not found in registry.")

        return promoted
