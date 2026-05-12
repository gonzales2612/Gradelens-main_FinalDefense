"""
Answer key schema (for testing purposes only).
Production grading happens in Node.js, not Python.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class Answer(BaseModel):
    """Single question's correct answer."""
    question_id: int = Field(..., ge=1)
    correct: str = Field(..., pattern=r"^[A-Z]$", description="Correct option letter")
    points: float = Field(1.0, ge=0, description="Points for correct answer")


class GradingPolicy(BaseModel):
    """Grading rules for the exam."""
    partial_credit: bool = Field(False, description="Allow partial credit")
    penalty_incorrect: float = Field(0.0, ge=0, description="Penalty for wrong answer")
    require_manual_review_on_ambiguity: bool = Field(
        True,
        description="Flag ambiguous answers for manual review"
    )


class AnswerKeyMetadata(BaseModel):
    """Additional answer key information."""
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None
    total_points: Optional[float] = None


class AnswerKey(BaseModel):
    """
    Correct answers for an exam.
    
    NOTE: This is primarily for testing/validation.
    Production grading uses Node.js business logic with MongoDB-stored answer keys.
    """
    exam_id: str = Field(..., description="Unique exam identifier")
    template_id: str = Field(..., description="Reference to template used")
    name: Optional[str] = Field(None, description="Human-readable exam name")
    answers: List[Answer] = Field(..., min_items=1)
    grading_policy: Optional[GradingPolicy] = None
    metadata: Optional[AnswerKeyMetadata] = None

    class Config:
        json_schema_extra = {
            "example": {
                "exam_id": "math_midterm_2026",
                "template_id": "form_A",
                "name": "Math Midterm - Section A",
                "answers": [
                    {"question_id": 1, "correct": "B", "points": 2},
                    {"question_id": 2, "correct": "D", "points": 2}
                ],
                "grading_policy": {
                    "partial_credit": False,
                    "penalty_incorrect": 0,
                    "require_manual_review_on_ambiguity": True
                }
            }
        }
