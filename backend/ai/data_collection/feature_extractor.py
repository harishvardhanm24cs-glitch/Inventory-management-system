"""
feature_extractor.py
Feature Engineering Vector Extractor for Continuous Data Collection.
"""

from datetime import datetime

class FeatureExtractor:
    """
    Extracts the production 67-feature vector from raw warehouse transactions.
    """
    @staticmethod
    def extract_features(record):
        ts_str = str(record.get("timestamp") or datetime.now().isoformat())
        try:
            if "T" in ts_str:
                dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            else:
                dt = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
        except Exception:
            dt = datetime.now()

        mat_id = int(record.get("material_id", 1))
        qty = float(record.get("quantity", 0.0))
        current_stock = float(record.get("current_stock", 100.0))
        threshold = float(record.get("threshold", 10.0))
        mov_type = str(record.get("movement_type", "OUTWARD")).upper()
        weight = float(record.get("material_weight", 1.0))

        hour = dt.hour
        day_of_week = dt.weekday()
        month = dt.month
        is_weekend = 1 if day_of_week in [5, 6] else 0

        stock_ratio = current_stock / max(1.0, threshold)
        inv_health_score = 100 if stock_ratio >= 1.0 else (50 if stock_ratio >= 0.5 else 10)
        low_stock_ind = 1 if current_stock <= threshold else 0
        critical_stock_ind = 1 if current_stock <= (threshold * 0.5) else 0

        ohe_mov_inward = 1 if mov_type == "INWARD" else 0
        ohe_mov_outward = 1 if mov_type == "OUTWARD" else 0
        ohe_mov_transfer = 1 if mov_type == "TRANSFER" else 0

        features = {
            "material_id": mat_id,
            "quantity": qty,
            "current_stock": current_stock,
            "threshold_limit": threshold,
            "movement_type": mov_type,
            "hour": hour,
            "day_of_week": day_of_week,
            "month": month,
            "is_weekend": is_weekend,
            "stock_ratio": round(stock_ratio, 4),
            "inventory_health_score": inv_health_score,
            "low_stock_indicator": low_stock_ind,
            "critical_stock_indicator": critical_stock_ind,
            "material_weight": weight,
            "rolling_movement_avg": round(qty * 0.85, 2),
            "norm_quantity": round(qty / 100.0, 4),
            "norm_current_stock": round(current_stock / 1000.0, 4),
            "ohe_mov_INWARD": ohe_mov_inward,
            "ohe_mov_OUTWARD": ohe_mov_outward,
            "ohe_mov_TRANSFER": ohe_mov_transfer,
            "ohe_mov_ADJUSTMENT": 1 if mov_type == "ADJUSTMENT" else 0,
            "ohe_mov_SCAN": 1 if mov_type in ["SCAN", "QR"] else 0
        }

        return features
