"""
ModelLoader.py
Responsible for safely loading the production Gradient Boosting model,
feature column schema, and training metadata during backend initialization.
"""

import os
import json
import joblib
from .AIExceptions import ModelLoadException

class ModelLoader:
    def __init__(self, models_dir=None):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.models_dir = models_dir or os.path.join(base_dir, "ml_models")
        
        self.model_path = os.path.join(self.models_dir, "gradient_boosting.pkl")
        if not os.path.exists(self.model_path):
            self.model_path = os.path.join(self.models_dir, "comparison", "gradient_boosting.pkl")
            
        self.columns_path = os.path.join(self.models_dir, "feature_columns.json")
        self.metadata_path = os.path.join(self.models_dir, "training_metadata.json")

    def load_artifacts(self):
        """Loads and returns (model, feature_columns, training_metadata)."""
        if not os.path.exists(self.model_path):
            raise ModelLoadException(f"Production model binary missing at {self.model_path}")
        if not os.path.exists(self.columns_path):
            raise ModelLoadException(f"Feature schema JSON missing at {self.columns_path}")
        if not os.path.exists(self.metadata_path):
            raise ModelLoadException(f"Training metadata JSON missing at {self.metadata_path}")

        try:
            model = joblib.load(self.model_path)
        except Exception as e:
            raise ModelLoadException(f"Failed to deserialize model binary: {str(e)}")

        try:
            with open(self.columns_path, 'r', encoding='utf-8') as f:
                feature_columns = json.load(f)
        except Exception as e:
            raise ModelLoadException(f"Failed to parse feature columns schema: {str(e)}")

        try:
            with open(self.metadata_path, 'r', encoding='utf-8') as f:
                training_metadata = json.load(f)
        except Exception as e:
            raise ModelLoadException(f"Failed to parse training metadata: {str(e)}")

        if not isinstance(feature_columns, list) or len(feature_columns) == 0:
            raise ModelLoadException("Invalid feature columns schema: expected non-empty list.")

        return model, feature_columns, training_metadata
