"""
Template API endpoint.
Exposes template definitions for frontend use.
"""
from fastapi import APIRouter, HTTPException
from typing import List
from loguru import logger

from app.templates.loader import TemplateLoader
from app.schemas.template import Template

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=List[str])
async def list_templates():
    """List all available template IDs."""
    loader = TemplateLoader()
    return loader.list_templates()


@router.get("/{template_id}", response_model=Template)
async def get_template(template_id: str):
    """Get a specific template definition."""
    loader = TemplateLoader()
    try:
        template = loader.load(template_id)
        return template
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Template '{template_id}' not found"
        )
    except Exception as e:
        logger.error(f"Error loading template: {e}")
        raise HTTPException(status_code=500, detail=str(e))
