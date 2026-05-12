"""
Scan job schema - represents a queued CV processing task.
This is the message format sent from Node.js to Python via Redis.
"""
from pydantic import BaseModel, Field


class ScanJob(BaseModel):
    """
    Job specification for CV processing.
    Pushed to Redis queue by Node.js ingress layer.
    """
    scan_id: str = Field(..., description="Unique scan identifier")
    image_path: str = Field(..., description="Path to image file (relative to IMAGE_ROOT)")
    template_id: str = Field(..., description="Template to use for detection", alias="template")

    class Config:
        populate_by_name = True  # Allow both 'template' and 'template_id'
