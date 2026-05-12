"""
DEPRECATED: Use detection_result.py instead.
This module is kept for backward compatibility during migration.
"""
from pydantic import BaseModel
from typing import Dict, Any

# Legacy schema - will be replaced by DetectionResult
class ScanResult(BaseModel):
    scan_id: str
    success: bool
    confidence: float
    answers: Dict[str, Any]
    errors: list[str] = []

# Re-export new schema for gradual migration
from .detection_result import DetectionResult

__all__ = ["ScanResult", "DetectionResult"]
