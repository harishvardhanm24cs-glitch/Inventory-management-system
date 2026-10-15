"""
InputValidator.py
Validates raw input payloads prior to feature processing and model inference.
"""

import math
from .AIExceptions import InvalidInputException

class InputValidator:
    @staticmethod
    def validate_single(data):
        """Validates a single raw prediction record dictionary."""
        if not isinstance(data, dict):
            raise InvalidInputException("Input payload must be a JSON object / dictionary.")

        errors = []

        if 'current_stock' in data:
            stock = data['current_stock']
            if not isinstance(stock, (int, float)) or math.isnan(stock) or math.isinf(stock):
                errors.append("Field 'current_stock' must be a valid finite number.")
            elif stock < 0:
                errors.append("Field 'current_stock' cannot be negative.")

        if 'quantity' in data:
            qty = data['quantity']
            if not isinstance(qty, (int, float)) or math.isnan(qty) or math.isinf(qty):
                errors.append("Field 'quantity' must be a valid finite number.")
            elif qty < 0:
                errors.append("Field 'quantity' cannot be negative.")

        if 'movement_type' in data:
            mtype = str(data['movement_type']).upper()
            if mtype not in ['INWARD', 'OUTWARD', 'TRANSFER']:
                errors.append(f"Invalid 'movement_type': '{data['movement_type']}'. Must be INWARD, OUTWARD, or TRANSFER.")

        if errors:
            raise InvalidInputException(f"Input validation failed: {'; '.join(errors)}")

        return True

    @staticmethod
    def validate_batch(data_list):
        """Validates a batch list of prediction record dictionaries."""
        if not isinstance(data_list, list) or len(data_list) == 0:
            raise InvalidInputException("Batch input payload must be a non-empty list of objects.")

        for idx, item in enumerate(data_list):
            try:
                InputValidator.validate_single(item)
            except InvalidInputException as e:
                raise InvalidInputException(f"Validation error at item index {idx}: {str(e)}")

        return True
