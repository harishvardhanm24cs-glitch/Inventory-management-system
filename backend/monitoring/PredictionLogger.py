import json
import uuid
from datetime import datetime

class PredictionLogger:
    """
    Logs structured prediction payloads and actual outcomes to audit logs.
    """
    def __init__(self, log_filepath="backend/monitoring/prediction_history.jsonl"):
        self.log_filepath = log_filepath

    def log_prediction(self, material_id, input_features, prediction, actual_value=None, model_version="v2026.07.28", schema_version="v1.0", inference_time_ms=12.5):
        prediction_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()

        record = {
            "prediction_id": prediction_id,
            "timestamp": timestamp,
            "material_id": material_id,
            "input_features": input_features,
            "prediction": prediction,
            "actual_value": actual_value,
            "model_version": model_version,
            "schema_version": schema_version,
            "inference_time_ms": inference_time_ms
        }

        try:
            with open(self.log_filepath, "a", encoding="utf-8") as f:
                f.write(json.dumps(record) + "\n")
        except Exception:
            pass

        return record
