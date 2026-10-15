class DashboardMetrics:
    """
    Aggregates MLOps health, performance, drift, and alert metrics into unified JSON payloads.
    """
    def __init__(self, health_monitor, model_metrics, drift_detector, alert_manager):
        self.health_monitor = health_monitor
        self.model_metrics = model_metrics
        self.drift_detector = drift_detector
        self.alert_manager = alert_manager

    def get_dashboard_summary(self):
        health = self.health_monitor.get_health_status()
        metrics = self.model_metrics.get_metrics()
        drift = self.drift_detector.compute_model_drift()
        alerts = self.alert_manager.get_recent_alerts(5)

        return {
            "health": health,
            "metrics": metrics,
            "drift_status": drift,
            "recent_alerts": alerts,
            "overall_status": "HEALTHY" if health["status"] == "PASS" else "DEGRADED"
        }
