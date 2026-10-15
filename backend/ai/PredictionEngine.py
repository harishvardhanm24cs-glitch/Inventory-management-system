"""
PredictionEngine.py
Executes model inference for single and batch raw material stock predictions.
"""

import time
from datetime import datetime
import numpy as np
from .AIExceptions import PredictionException, InvalidInputException
from .InputValidator import InputValidator
from .FeatureProcessor import FeatureProcessor

class PredictionEngine:
    def __init__(self, model, feature_columns, training_metadata, model_health):
        self.model = model
        self.feature_columns = feature_columns
        self.training_metadata = training_metadata
        self.model_health = model_health
        self.feature_processor = FeatureProcessor(feature_columns)

    def predict(self, raw_data):
        """Runs inference for a single raw material stock prediction request."""
        InputValidator.validate_single(raw_data)
        
        t0 = time.time()
        try:
            df_features = self.feature_processor.process(raw_data)
            pred_array = self.model.predict(df_features)
            pred_val = max(0.0, float(pred_array[0]))
        except Exception as e:
            raise PredictionException(f"Inference failed for single record: {str(e)}")

        elapsed_ms = (time.time() - t0) * 1000.0
        self.model_health.record_inference(elapsed_ms, count=1)

        movement = str(raw_data.get('movement_type', raw_data.get('transaction_type', 'INWARD'))).upper()
        if movement == 'INWARD':
            pred_val = 0.0

        return {
            "predicted_quantity_used": round(pred_val, 2),
            "unit": "KG",
            "model_version": self.model_health.model_version,
            "prediction_timestamp": datetime.utcnow().isoformat() + "Z",
            "execution_time_ms": round(elapsed_ms, 2),
            "feature_count": len(self.feature_columns),
            "status": "SUCCESS"
        }

    def predict_batch(self, raw_data_list):
        """Runs inference for a batch list of raw material stock prediction requests."""
        InputValidator.validate_batch(raw_data_list)

        t0 = time.time()
        try:
            df_features = self.feature_processor.process(raw_data_list)
            pred_array = self.model.predict(df_features)
        except Exception as e:
            raise PredictionException(f"Inference failed for batch records: {str(e)}")

        elapsed_ms = (time.time() - t0) * 1000.0
        count = len(raw_data_list)
        self.model_health.record_inference(elapsed_ms, count=count)

        results = []
        for idx, raw_item in enumerate(raw_data_list):
            pred_val = max(0.0, float(pred_array[idx]))
            movement = str(raw_item.get('movement_type', raw_item.get('transaction_type', 'INWARD'))).upper()
            if movement == 'INWARD':
                pred_val = 0.0

            results.append({
                "record_index": idx,
                "predicted_quantity_used": round(pred_val, 2),
                "unit": "KG"
            })

        return {
            "batch_size": count,
            "predictions": results,
            "model_version": self.model_health.model_version,
            "prediction_timestamp": datetime.utcnow().isoformat() + "Z",
            "total_execution_time_ms": round(elapsed_ms, 2),
            "feature_count": len(self.feature_columns),
            "status": "SUCCESS"
        }

    def predict_single_material(self, material_id, params=None):
        """Helper to run inference for a specific material_id."""
        payload = params.copy() if params else {}
        payload['material_id'] = material_id
        return self.predict(payload)
