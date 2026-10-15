"""
config.py
Configuration parameters for Module 7A.1 - Continuous Data Collection.
"""

import os

DATASET_VERSION = "v2026.07"
DEFAULT_DATASET_CSV = os.path.join(os.path.dirname(__file__), "..", "..", "ml_datasets", "continuous_training_dataset.csv")

SUPPORTED_MOVEMENT_TYPES = ["INWARD", "OUTWARD", "TRANSFER", "ADJUSTMENT", "SCAN", "UPDATE"]
MIN_QUANTITY = 0.0
MAX_QUANTITY = 1000000000.0

DUPLICATE_TIME_WINDOW_SEC = 5

SUPPORTED_EVENTS = [
    "Inventory Addition",
    "Inventory Removal",
    "Stock Adjustment",
    "Material Transfer",
    "QR/Barcode Scan",
    "Inventory Update",
    "Threshold Alert"
]
