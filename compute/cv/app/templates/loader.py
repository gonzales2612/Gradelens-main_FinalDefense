"""
Template loader utility.
Loads and validates template definitions from JSON files.
"""
import json
from pathlib import Path
from typing import Dict, Optional
from loguru import logger

from app.schemas.template import Template
from app.settings import settings


class TemplateLoader:
    """
    Singleton template loader with caching.
    Loads templates from app/templates/ directory.
    """
    
    _instance: Optional["TemplateLoader"] = None
    _cache: Dict[str, Template] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        self.templates_dir = Path(__file__).parent / "templates"
        if not self.templates_dir.exists():
            logger.warning(f"Templates directory not found: {self.templates_dir}")
            self.templates_dir.mkdir(parents=True, exist_ok=True)
    
    def load(self, template_id: str, force_reload: bool = False) -> Template:
        """
        Load a template by ID.
        
        Args:
            template_id: Template identifier (e.g., 'form_A')
            force_reload: If True, bypass cache and reload from disk
            
        Returns:
            Validated Template object
            
        Raises:
            FileNotFoundError: Template file not found
            ValueError: Template validation failed
        """
        # Check cache
        if not force_reload and template_id in self._cache:
            logger.debug(f"Template '{template_id}' loaded from cache")
            return self._cache[template_id]
        
        # Load from file
        template_path = self.templates_dir / f"{template_id}.json"
        
        if not template_path.exists():
            raise FileNotFoundError(
                f"Template '{template_id}' not found at {template_path}"
            )
        
        logger.info(f"Loading template '{template_id}' from {template_path}")
        
        with open(template_path, "r") as f:
            data = json.load(f)
        
        # Validate with Pydantic
        try:
            template = Template(**data)
        except Exception as e:
            raise ValueError(f"Template validation failed: {e}")
        
        # Verify template_id matches
        if template.template_id != template_id:
            logger.warning(
                f"Template ID mismatch: filename='{template_id}', "
                f"content='{template.template_id}'"
            )
        
        # Cache and return
        self._cache[template_id] = template
        logger.success(
            f"Template '{template_id}' loaded: "
            f"{len(template.questions)} questions, "
            f"{len(template.registration_marks)} marks"
        )
        
        return template
    
    def list_available(self) -> list[str]:
        """List all available template IDs."""
        if not self.templates_dir.exists():
            return []
        
        return [
            p.stem 
            for p in self.templates_dir.glob("*.json")
        ]
    
    def list_templates(self) -> list[str]:
        """Alias for list_available for API consistency."""
        return self.list_available()
    
    def clear_cache(self):
        """Clear template cache (useful for hot-reloading during development)."""
        self._cache.clear()
        logger.info("Template cache cleared")


# Global instance
template_loader = TemplateLoader()


def load_template(template_id: str) -> Template:
    """
    Convenience function to load a template.
    
    Usage:
        template = load_template("form_A")
    """
    return template_loader.load(template_id)
