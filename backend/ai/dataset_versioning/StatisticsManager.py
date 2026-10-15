"""
StatisticsManager.py
Generates overall statistics, dataset volume metrics, and growth trends across dataset registry versions.
"""

class StatisticsManager:
    """
    Computes aggregated dataset metrics across all dataset versions.
    """
    @staticmethod
    def compute_statistics(registry_items):
        total_datasets = len(registry_items)
        archived_datasets = sum(1 for item in registry_items if item.get("status") == "ARCHIVED")
        active_datasets = sum(1 for item in registry_items if item.get("status") in ["ACTIVE", "FROZEN", "SELECTED"])

        selected_dataset = next((item for item in registry_items if item.get("is_selected") or item.get("status") == "SELECTED"), None)
        if not selected_dataset and registry_items:
            selected_dataset = registry_items[0]

        current_version = selected_dataset.get("dataset_version") if selected_dataset else "NONE"

        largest_dataset = max(registry_items, key=lambda x: x.get("record_count", 0)) if registry_items else None
        largest_records = largest_dataset.get("record_count", 0) if largest_dataset else 0
        largest_version = largest_dataset.get("dataset_version") if largest_dataset else "N/A"

        total_records = sum(item.get("record_count", 0) for item in registry_items)
        avg_feature_count = round(sum(item.get("feature_count", 12) for item in registry_items) / total_datasets, 1) if total_datasets > 0 else 12.0
        avg_validation_rate = round(sum(float(item.get("validation_rate", 100.0)) for item in registry_items) / total_datasets, 2) if total_datasets > 0 else 100.00

        growth_trend = []
        for item in sorted(registry_items, key=lambda x: str(x.get("created_at", ""))):
            growth_trend.append({
                "version": item.get("dataset_version"),
                "records": item.get("record_count", 0),
                "date": str(item.get("created_at", "")).split("T")[0]
            })

        return {
            "total_datasets": total_datasets,
            "active_datasets": active_datasets,
            "archived_datasets": archived_datasets,
            "current_dataset_version": current_version,
            "selected_dataset": selected_dataset,
            "largest_dataset": {
                "version": largest_version,
                "records": largest_records
            },
            "total_records_managed": total_records,
            "average_feature_count": avg_feature_count,
            "average_validation_rate": avg_validation_rate,
            "dataset_growth_trend": growth_trend
        }
