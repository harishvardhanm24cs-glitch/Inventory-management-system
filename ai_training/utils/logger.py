import os
import logging
from datetime import datetime
from pathlib import Path

try:
    from ai_training.config import LOGS_DIR, LOG_LEVEL
except ImportError:
    LOGS_DIR = Path(__file__).resolve().parent.parent / "reports"
    LOG_LEVEL = "INFO"

os.makedirs(LOGS_DIR, exist_ok=True)


class MLLogger:
    """
    MLLogger
    ────────
    Structured logging for Training, Evaluation, Model Export, Errors, Warnings,
    and Performance. Writes logs to console and `ai_training/reports/ml_execution.log`.
    """

    def __init__(self, name="RM_MONITOR_ML"):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, LOG_LEVEL.upper(), logging.INFO))

        if not self.logger.handlers:
            log_file = LOGS_DIR / "ml_execution.log"
            file_handler = logging.FileHandler(log_file, encoding="utf-8")
            stream_handler = logging.StreamHandler()

            formatter = logging.Formatter(
                "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S"
            )
            file_handler.setFormatter(formatter)
            stream_handler.setFormatter(formatter)

            self.logger.addHandler(file_handler)
            self.logger.addHandler(stream_handler)

    def log_training(self, epoch_or_step, loss, metrics=None):
        msg = f"[TRAINING] Step: {epoch_or_step} | Loss: {loss:.4f}"
        if metrics:
            msg += f" | Metrics: {metrics}"
        self.logger.info(msg)

    def log_evaluation(self, model_name, metrics):
        self.logger.info(f"[EVALUATION] Model: '{model_name}' | Metrics: {metrics}")

    def log_export(self, model_name, path):
        self.logger.info(f"[MODEL EXPORT] Exported model '{model_name}' to '{path}'")

    def log_performance(self, task_name, duration_seconds):
        self.logger.info(f"[PERFORMANCE] Task '{task_name}' executed in {duration_seconds:.3f} seconds.")

    def info(self, msg):
        self.logger.info(msg)

    def warning(self, msg):
        self.logger.warning(f"[WARNING] {msg}")

    def error(self, msg, exc_info=False):
        self.logger.error(f"[ERROR] {msg}", exc_info=exc_info)


logger = MLLogger()
