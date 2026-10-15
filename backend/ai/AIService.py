"""
AIService.py
Production Singleton Service managing the AI prediction engine, model loading, logging, and health checks.
"""

import os
import logging
from datetime import datetime
from .AIExceptions import AIServiceException, ModelLoadException
from .ModelLoader import ModelLoader
from .InputValidator import InputValidator
from .PredictionEngine import PredictionEngine
from .ModelHealth import ModelHealth

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
logs_dir = os.path.join(base_dir, "logs")
os.makedirs(logs_dir, exist_ok=True)

logger = logging.getLogger("AIService")
logger.setLevel(logging.INFO)

if not logger.handlers:
    fh = logging.FileHandler(os.path.join(logs_dir, "ai_service.log"), encoding='utf-8')
    formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s')
    fh.setFormatter(formatter)
    logger.addHandler(fh)

class AIService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(AIService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, models_dir=None):
        if self._initialized:
            return

        self.models_dir = models_dir
        self.model = None
        self.feature_columns = None
        self.training_metadata = None
        self.model_health = ModelHealth()
        self.prediction_engine = None
        self._initialized = True
        
        self.initialize()

    def initialize(self):
        """Initializes AI service, loads model binary, schema, and metadata."""
        logger.info("Initializing AIService singleton...")
        try:
            loader = ModelLoader(self.models_dir)
            self.model, self.feature_columns, self.training_metadata = loader.load_artifacts()
            
            self.model_health.is_loaded = True
            self.model_health.feature_count = len(self.feature_columns)
            self.prediction_engine = PredictionEngine(
                self.model, self.feature_columns, self.training_metadata, self.model_health
            )
            logger.info(f"AI Service Started successfully! Feature Count: {len(self.feature_columns)}")
            return True
        except Exception as e:
            self.model_health.is_loaded = False
            self.model_health.health_status = "FAILED_TO_LOAD"
            logger.error(f"AIService Initialization Error: {str(e)}")
            raise ModelLoadException(f"AIService initialization failed: {str(e)}")

    def reloadModel(self):
        """Reloads model artifacts into memory."""
        logger.info("Reloading AI Model artifacts...")
        self._initialized = False
        return self.initialize()

    def predict(self, raw_data):
        if not self.model_health.is_loaded or not self.prediction_engine:
            raise AIServiceException("AI Service is not initialized or model failed to load.")
        return self.prediction_engine.predict(raw_data)

    def predictBatch(self, raw_data_list):
        if not self.model_health.is_loaded or not self.prediction_engine:
            raise AIServiceException("AI Service is not initialized or model failed to load.")
        return self.prediction_engine.predict_batch(raw_data_list)

    def validateInput(self, raw_data):
        if isinstance(raw_data, list):
            return InputValidator.validate_batch(raw_data)
        return InputValidator.validate_single(raw_data)

    def getModelStatus(self):
        return self.model_health.get_status()

ai_service = AIService()
