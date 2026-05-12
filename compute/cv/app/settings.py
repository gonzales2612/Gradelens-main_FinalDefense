# app/settings.py
from pydantic import BaseModel
import os

class Settings(BaseModel):
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    image_root: str = os.getenv("IMAGE_ROOT", "/data/scans")
    service_name: str = "cv-compute"
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"

settings = Settings()
