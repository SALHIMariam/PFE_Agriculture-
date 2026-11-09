"""
Contrats d'entrée/sortie du service Assistant AI (Pydantic v2).
Laravel envoie un CopilotRequest, reçoit un CopilotResponse.
"""
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


# --------------------------- ENTRÉE ---------------------------

class TopClass(BaseModel):
    label: str
    score: float


class Weather(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    rainfall: Optional[float] = None
    wind_speed: Optional[float] = None


class Recommendation(BaseModel):
    id: Optional[str] = None
    treatment: Optional[str] = None
    prevention: Optional[str] = None
    irrigation: Optional[str] = None


class CopilotRequest(BaseModel):
    analysis_id: int
    predicted_class: str                       # ex. "Tomato__early_blight"
    confidence: float                          # top-1, 0..1
    top3: List[TopClass] = Field(default_factory=list)
    governorate: Optional[str] = None
    farmer_name: Optional[str] = None
    recommendation: Optional[Recommendation] = None
    weather: Optional[Weather] = None
    risk_level: Optional[str] = None           # low/medium/high/very_high
    history_count: int = 0                     # analyses précédentes du farmer
    pending_similar_count: int = 0             # cas similaires en attente (région)


# --------------------------- SORTIE ---------------------------

class Safety(BaseModel):
    verdict: str            # ok / uncertain / out_of_domain
    reason: str
    auto_reply_allowed: bool


class Priority(BaseModel):
    score: int              # 0..100
    level: str              # urgent / important / normal
    factors: Dict[str, int]  # détail par composante


class Confidence(BaseModel):
    score: int              # 0..100
    level: str              # high / medium / low
    sources_used: List[str]


class Draft(BaseModel):
    language: str
    subject: str
    body: str


class Knowledge(BaseModel):
    disease_fr: str
    severity: str
    symptoms: List[str]
    treatment: Dict[str, str]
    prevention: List[str]
    warnings: List[str]
    found: bool             # True si la fiche existe, False si fallback générique


class CopilotResponse(BaseModel):
    analysis_id: int
    safety: Safety
    priority: Priority
    confidence: Confidence
    draft: Draft
    knowledge: Knowledge
