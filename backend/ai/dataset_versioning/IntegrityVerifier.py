"""
IntegrityVerifier.py
Generates SHA-256 checksums and verifies file integrity for dataset snapshots.
"""

import hashlib
import os

class IntegrityVerifier:
    """
    Verifies dataset file checksums to detect file corruption or unauthorized mutations.
    """
    @staticmethod
    def generate_checksum(file_path):
        """Generates SHA-256 checksum for the given file path."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found for checksum calculation: {file_path}")

        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    @staticmethod
    def verify_integrity(file_path, expected_checksum):
        """
        Verifies that current file checksum matches expected SHA-256 checksum.
        Returns: (is_valid: bool, current_checksum: str, message: str)
        """
        if not os.path.exists(file_path):
            return False, "", f"File missing: {file_path}"

        current_checksum = IntegrityVerifier.generate_checksum(file_path)
        if current_checksum.lower() == str(expected_checksum).lower():
            return True, current_checksum, "Checksum verification PASSED. Dataset integrity intact."
        else:
            return False, current_checksum, f"Checksum MISMATCH! Expected: {expected_checksum[:12]}, Got: {current_checksum[:12]}"
