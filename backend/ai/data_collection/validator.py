"""
validator.py
Data validation utilities for Continuous Data Collection module.
"""

from datetime import datetime
from .config import SUPPORTED_MOVEMENT_TYPES, MIN_QUANTITY, MAX_QUANTITY

class TransactionValidator:
    """
    Validates warehouse transaction records for data completeness and integrity.
    """
    @staticmethod
    def validate(record):
        if not isinstance(record, dict):
            return False, "Record must be a valid JSON/dict object."

        required_fields = ["material_id", "quantity", "movement_type"]
        for field in required_fields:
            if field not in record or record[field] is None:
                return False, f"Missing Required Field: {field}"

        try:
            mat_id = int(record["material_id"])
            if mat_id <= 0:
                return False, "Invalid Material ID"
        except (ValueError, TypeError):
            return False, "Invalid Material ID"

        try:
            qty = float(record["quantity"])
            if qty < MIN_QUANTITY:
                return False, "Negative Quantity"
            if qty > MAX_QUANTITY:
                return False, "Quantity Exceeds Limit"
        except (ValueError, TypeError):
            return False, "Invalid Quantity Datatype"

        mov_type = str(record["movement_type"]).upper()
        if mov_type not in SUPPORTED_MOVEMENT_TYPES:
            return False, "Invalid Movement Type"

        if "timestamp" in record and record["timestamp"]:
            ts_str = str(record["timestamp"])
            try:
                if "T" in ts_str:
                    datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                else:
                    datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
            except Exception:
                return False, "Invalid Timestamp"

        return True, "VALIDATED"
