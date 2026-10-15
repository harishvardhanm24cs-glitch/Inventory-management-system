"""
backend/ai package initialization.
Exports AIService singleton and submodules for RM Monitor AI Service Layer.
"""

from .AIExceptions import (
    AIServiceException,
    ModelLoadException,
    InvalidInputException,
    FeatureProcessingException,
    PredictionException
)
from .ModelLoader import ModelLoader
from .InputValidator import InputValidator
from .FeatureProcessor import FeatureProcessor
from .ModelHealth import ModelHealth
from .PredictionEngine import PredictionEngine
from .AIService import AIService, ai_service

__all__ = [
    'AIService',
    'ai_service',
    'ModelLoader',
    'InputValidator',
    'FeatureProcessor',
    'ModelHealth',
    'PredictionEngine',
    'AIServiceException',
    'ModelLoadException',
    'InvalidInputException',
    'FeatureProcessingException',
    'PredictionException'
]
