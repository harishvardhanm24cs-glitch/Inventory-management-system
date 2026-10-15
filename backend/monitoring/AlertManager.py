from datetime import datetime

class AlertManager:
    """
    Evaluates system indicators and raises automated alerts for drift, latency spikes, or errors.
    """
    def __init__(self):
        self.alerts = []

    def raise_alert(self, alert_type, severity, message):
        alert_item = {
            "id": f"ALT-{len(self.alerts) + 1:04d}",
            "type": alert_type,
            "severity": severity,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "status": "ACTIVE"
        }
        self.alerts.append(alert_item)
        return alert_item

    def check_conditions(self, health_data, metrics_data, drift_data):
        if not health_data.get("model_loaded", True):
            self.raise_alert("MODEL_UNAVAILABLE", "CRITICAL", "Production AI Model is not loaded!")

        if metrics_data.get("p95_latency_ms", 0.0) > 500.0:
            self.raise_alert("HIGH_LATENCY", "WARNING", f"P95 Latency ({metrics_data['p95_latency_ms']}ms) exceeded 500ms threshold.")

        if drift_data.get("drift_detected", False):
            self.raise_alert("MODEL_DRIFT", "WARNING", f"Model accuracy degraded. Current MAE: {drift_data.get('mae')}")

        if health_data.get("prediction_errors", 0) >= 5:
            self.raise_alert("PREDICTION_FAILURES", "CRITICAL", f"Repeated prediction errors detected: {health_data['prediction_errors']} failures.")

        return self.alerts

    def get_recent_alerts(self, limit=10):
        return self.alerts[-limit:]
