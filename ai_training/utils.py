"""
utils.py
────────
Shared utility functions for AI training workspace.
"""

import json
from datetime import datetime


def format_timestamp():
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")


def load_json_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json_file(data, file_path):
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
