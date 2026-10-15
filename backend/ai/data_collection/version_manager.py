"""
version_manager.py
Dataset Version Manager for Continuous Data Collection module (Module 7A.1.1).
Automatically manages dynamic, unique, non-hardcoded dataset versions (e.g. 2026.07.001).
"""

import threading
from datetime import datetime

class DatasetVersionManager:
    """
    Thread-safe Dataset Version Manager providing dynamic, unique dataset version tags.
    Format: YYYY.MM.XXX (e.g., 2026.07.001)
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(DatasetVersionManager, cls).__new__(cls)
                    cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self._seq = 1
        self._current_year_month = datetime.now().strftime("%Y.%m")
        self._current_version = f"{self._current_year_month}.001"
        self._registered_versions = set([self._current_version])

    def get_current_version(self):
        """Returns the current active dataset version tag."""
        with self._lock:
            ym = datetime.now().strftime("%Y.%m")
            if ym != self._current_year_month:
                self._current_year_month = ym
                self._seq = 1
                self._current_version = f"{ym}.{self._seq:03d}"
                self._registered_versions.add(self._current_version)
            return self._current_version

    def create_new_version(self):
        """Generates and registers a new unique dataset version tag."""
        with self._lock:
            ym = datetime.now().strftime("%Y.%m")
            if ym != self._current_year_month:
                self._current_year_month = ym
                self._seq = 1
            else:
                self._seq += 1

            new_ver = f"{self._current_year_month}.{self._seq:03d}"
            while new_ver in self._registered_versions:
                self._seq += 1
                new_ver = f"{self._current_year_month}.{self._seq:03d}"

            self._current_version = new_ver
            self._registered_versions.add(new_ver)
            return new_ver

    def register_version(self, version_tag):
        """Registers an external version tag to prevent duplication."""
        with self._lock:
            if version_tag:
                self._registered_versions.add(str(version_tag))

    def get_total_versions(self):
        """Returns total number of registered versions."""
        with self._lock:
            return len(self._registered_versions)
