"""
DatasetSelector.py
Selects and designates dataset versions as active targets for future AI model retraining cycles.
"""

from datetime import datetime

class DatasetSelector:
    """
    Manages selection of active dataset versions for future AI retraining pipelines.
    """
    @staticmethod
    def select_version(version_tag, dataset_registry_items):
        selected_item = None
        for item in dataset_registry_items:
            if str(item.get("dataset_version")) == str(version_tag):
                item["is_selected"] = True
                item["selected_at"] = datetime.now().isoformat()
                selected_item = item
            else:
                item["is_selected"] = False

        if not selected_item:
            raise ValueError(f"Dataset version {version_tag} not found in registry.")

        return selected_item
