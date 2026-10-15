"""
ChecksumVerifier.py
SHA-256 generation and verification for trained model artifacts.
"""

import hashlib
import os

class ChecksumVerifier:
    """
    Computes and verifies SHA-256 checksums for model binary files.
    """
    @staticmethod
    def generate_checksum(file_path):
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Model artifact file not found: {file_path}")

        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    @staticmethod
    def verify_artifact(file_path, expected_checksum):
        if not os.path.exists(file_path):
            return False, "", f"Artifact missing: {file_path}"

        current = ChecksumVerifier.generate_checksum(file_path)
        if current.lower() == str(expected_checksum).lower():
            return True, current, "Model artifact SHA-256 checksum VERIFIED."
        else:
            return False, current, f"Artifact checksum MISMATCH! Expected: {expected_checksum[:12]}, Got: {current[:12]}"
