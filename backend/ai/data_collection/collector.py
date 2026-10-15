"""
collector.py
Main Continuous Data Collection Pipeline Manager.
"""

from .validator import TransactionValidator
from .duplicate_detector import DuplicateDetector
from .feature_extractor import FeatureExtractor
from .dataset_writer import DatasetWriter
from .logger import CollectionLogger
from .version_manager import DatasetVersionManager

class DataCollector:
    """
    Continuous Data Collection Pipeline Orchestrator (Module 7A.1.1).
    Automatically captures, validates, extracts features, deduplicates, and stores warehouse data.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(DataCollector, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self.validator = TransactionValidator()
        self.duplicate_detector = DuplicateDetector()
        self.feature_extractor = FeatureExtractor()
        self.dataset_writer = DatasetWriter()
        self.logger = CollectionLogger()
        self.version_manager = DatasetVersionManager()

    def process_transaction(self, record):
        """
        Processes a raw transaction record through the complete Module 7A.1.1 pipeline.
        Returns: (success: bool, status_msg: str, payload: dict)
        """
        current_version = self.version_manager.get_current_version()

        is_valid, val_reason = self.validator.validate(record)
        if not is_valid:
            self.logger.log_event(
                "VALIDATION_FAILED", 
                "REJECTED", 
                {
                    "reason": val_reason, 
                    "validation_reason": val_reason, 
                    "dataset_version": current_version, 
                    "record": record
                }
            )
            return False, f"Validation Failed: {val_reason}", {"validation_reason": val_reason, "dataset_version": current_version}

        is_dup, dup_msg = self.duplicate_detector.is_duplicate(record)
        if is_dup:
            val_reason = "Duplicate Transaction"
            self.logger.log_event(
                "DUPLICATE_DETECTED", 
                "DUPLICATE", 
                {
                    "reason": val_reason, 
                    "validation_reason": val_reason, 
                    "dataset_version": current_version, 
                    "record": record
                }
            )
            return False, f"Duplicate Blocked: {dup_msg}", {"validation_reason": val_reason, "dataset_version": current_version}

        features = self.feature_extractor.extract_features(record)
        self.logger.log_event("FEATURES_GENERATED", "PASSED", {"material_id": features["material_id"], "dataset_version": current_version})

        hash_sig = self.duplicate_detector.generate_hash_signature(record)
        saved = self.dataset_writer.write_record(hash_sig, features, record, dataset_version=current_version, validation_reason=None)

        if saved:
            self.logger.log_event("RECORD_SAVED", "PASSED", {"hash_signature": hash_sig, "dataset_version": current_version})
            return True, "Record successfully collected and stored for AI training.", {
                "hash_signature": hash_sig,
                "dataset_version": current_version,
                "validation_status": "VALIDATED",
                "validation_reason": None,
                "features": features
            }
        else:
            self.logger.log_event("STORAGE_FAILED", "REJECTED", {"reason": "File write error", "dataset_version": current_version})
            return False, "Storage Write Failed.", None

    def get_status(self):
        stats = self.logger.get_statistics()
        current_version = self.version_manager.get_current_version()
        return {
            "pipeline_status": stats["pipeline_health"],
            "current_dataset_version": current_version,
            "version": current_version,
            "total_versions": self.version_manager.get_total_versions(),
            "statistics": stats
        }
