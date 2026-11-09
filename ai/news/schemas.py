from typing import Optional

from pydantic import BaseModel, Field

CATEGORIES = ["new_disease", "new_treatment", "trend", "alert", "info"]


class NewsEnrichRequest(BaseModel):
    title: str
    description: str = ""
    link: str


class NewsEnrichResponse(BaseModel):
    summary: str
    category: str = Field(pattern="^(new_disease|new_treatment|trend|alert|info)$")
    crop: Optional[str] = None
    disease_class: Optional[str] = None
    relevance_score: float = Field(ge=0.0, le=1.0)
