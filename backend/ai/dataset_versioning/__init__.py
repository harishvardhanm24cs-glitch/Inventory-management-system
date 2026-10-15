"""
Dataset Versioning Module (Module 7A.2)
Provides dataset registry, immutable snapshots, integrity verification, metadata management, archiving, restoration, and dataset selection.
"""

from .IntegrityVerifier import IntegrityVerifier
from .SnapshotManager import SnapshotManager
from .MetadataManager import MetadataManager
from .ArchiveManager import ArchiveManager
from .RestoreManager import RestoreManager
from .DatasetSelector import DatasetSelector
from .StatisticsManager import StatisticsManager
from .DatasetRegistry import DatasetRegistry

__all__ = [
    "IntegrityVerifier",
    "SnapshotManager",
    "MetadataManager",
    "ArchiveManager",
    "RestoreManager",
    "DatasetSelector",
    "StatisticsManager",
    "DatasetRegistry"
]
