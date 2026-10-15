"""
AIExceptions.py
Custom exception classes for the RM Monitor AI Service Layer.
"""

class AIServiceException(Exception):
    """Base exception for all AI Service errors."""
    pass

class ModelLoadException(AIServiceException):
    """Raised when loading the ML model, feature schema, or metadata fails."""
    pass

class InvalidInputException(AIServiceException):
    """Raised when input payload fails validation checks."""
    pass

class FeatureProcessingException(AIServiceException):
    """Raised when transforming raw data into model features fails."""
    pass

class PredictionException(AIServiceException):
    """Raised when model inference execution encounters an error."""
    pass
