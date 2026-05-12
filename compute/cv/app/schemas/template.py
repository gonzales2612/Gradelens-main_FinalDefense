"""
Template schema for OMR forms.
Defines bubble positions and layout configuration.
"""
from pydantic import BaseModel, Field
from typing import Dict, List, Literal, Optional, Tuple
from datetime import datetime


class Position(BaseModel):
    """2D coordinate in template space."""
    x: int = Field(..., description="X coordinate in pixels")
    y: int = Field(..., description="Y coordinate in pixels")


class RegistrationMark(BaseModel):
    """Alignment marker for perspective fine-tuning."""
    id: str = Field(..., description="Mark identifier (e.g., 'top_left')")
    position: Position
    type: Literal["circle", "square"]
    size: int = Field(20, description="Radius or side length in pixels")


class CanonicalSize(BaseModel):
    """Expected image dimensions after perspective correction."""
    width: int = Field(..., description="Width in pixels (e.g., 2100 for A4@300dpi)")
    height: int = Field(..., description="Height in pixels (e.g., 2970 for A4@300dpi)")


class BubbleConfig(BaseModel):
    """Global bubble appearance and threshold settings."""
    radius: int = Field(..., ge=5, le=50, description="Expected bubble radius in pixels")
    fill_threshold: float = Field(
        0.30,
        ge=0.1,
        le=0.9,
        description="Minimum fill ratio to consider bubble marked"
    )
    ambiguous_threshold: float = Field(
        0.65,
        ge=0.1,
        le=1.0,
        description="Multiple bubbles above this = ambiguous"
    )

class Question(BaseModel):
    """Question definition with bubble coordinates."""
    question_id: int = Field(..., ge=1, description="Sequential question number (1-based)")
    options: Dict[str, Position] = Field(
        ...,
        description="Map of option letter to bubble center coordinates"
    )


class HeaderField(BaseModel):
    """Header field definition for student information."""
    field_id: str = Field(..., description="Field identifier (e.g., 'name', 'student_number')")
    label: str = Field(..., description="Display label (e.g., 'Name:', 'Student Number:')")
    type: Literal["title", "subtitle", "text_field"] = Field(
        ...,
        description="Field type: title (large centered), subtitle (small centered), text_field (input box)"
    )
    position: Position = Field(..., description="Field position (center for title/subtitle, top-left for text_field)")
    width: Optional[int] = Field(None, description="Field width in pixels (for text_field only)")
    height: Optional[int] = Field(None, description="Field height in pixels (for text_field only)")
    font_size: Optional[float] = Field(None, description="Font size multiplier (for title/subtitle)")
    font_weight: Optional[Literal["normal", "bold"]] = Field("normal", description="Font weight")


class TemplateMetadata(BaseModel):
    """Additional template information."""
    created_at: Optional[datetime] = None
    author: Optional[str] = None
    notes: Optional[str] = None


class Template(BaseModel):
    """
    Complete template definition for an exam form.
    
    Loaded by Python CV pipeline to know where bubbles are located.
    Coordinates are in canonical space (after perspective correction).
    """
    template_id: str = Field(..., description="Unique template identifier")
    name: str = Field(..., description="Human-readable template name")
    version: str = Field("1.0.0", description="Template version")
    canonical_size: CanonicalSize
    registration_marks: List[RegistrationMark] = Field(
        ...,
        min_items=3,
        max_items=4,
        description="Alignment markers for perspective correction"
    )
    header_fields: Optional[List[HeaderField]] = Field(
        None,
        description="Optional header fields for student information (name, student number, etc.)"
    )
    bubble_config: BubbleConfig
    bubble_y_adjust: int = Field(
        200,
        description=(
            "Calibration: added to every bubble center Y for ROI sampling and overlays. "
            "Positive moves circles down (use when marks sit below template circles); "
            "negative moves up."
        ),
    )
    questions: List[Question] = Field(..., min_items=1)
    metadata: Optional[TemplateMetadata] = None

    def adjusted_bubble_xy(self, pos: Position) -> Tuple[int, int]:
        """Bubble center (x, y) in canonical space including vertical calibration."""
        return (pos.x, pos.y + self.bubble_y_adjust)

    class Config:
        json_schema_extra = {
            "example": {
                "template_id": "form_A",
                "name": "Standard Form A",
                "version": "1.0.0",
                "canonical_size": {"width": 2100, "height": 2970},
                "registration_marks": [
                    {"id": "top_left", "position": {"x": 100, "y": 100}, "type": "circle", "size": 20}
                ],
                "bubble_config": {
                    "radius": 12,
                    "fill_threshold": 0.30,
                    "ambiguous_threshold": 0.65
                },
                "questions": [
                    {
                        "question_id": 1,
                        "options": {
                            "A": {"x": 300, "y": 400},
                            "B": {"x": 380, "y": 400},
                            "C": {"x": 460, "y": 400},
                            "D": {"x": 540, "y": 400}
                        }
                    }
                ]
            }
        }
