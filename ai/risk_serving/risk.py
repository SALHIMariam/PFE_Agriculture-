"""
Module de serving FastAPI pour le modèle de prédiction de risque de
propagation (AgriDetect). Placé dans ai/risk_serving/risk.py, service
FastAPI dédié tournant indépendamment (port 8006).

Utilisation dans risk_serving/main.py :

    from .risk import router as risk_router
    app.include_router(risk_router)

Endpoint exposé : POST /spread-risk
"""

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

# Résolus relativement à ce fichier : le service peut être lancé avec
# n'importe quel cwd (repo root ou ai/), contrairement à un chemin relatif
# nu qui ne fonctionnerait que si cwd == ai/serving/.
_ARTIFACTS_DIR = Path(__file__).resolve().parent
MODEL_PATH = _ARTIFACTS_DIR / "risk_model.pkl"
ENCODERS_PATH = _ARTIFACTS_DIR / "risk_encoders.pkl"
FEATURE_NAMES_PATH = _ARTIFACTS_DIR / "risk_feature_names.pkl"
SHAP_EXPLAINER_PATH = _ARTIFACTS_DIR / "risk_shap_explainer.pkl"

_model = joblib.load(MODEL_PATH)
_encoders = joblib.load(ENCODERS_PATH)
_feature_cols = joblib.load(FEATURE_NAMES_PATH)
_explainer = joblib.load(SHAP_EXPLAINER_PATH)

CATEGORICAL_COLS = ["disease", "crop", "governorate", "climate_zone", "season"]

SEASON_BY_MONTH = {
    12: "Winter", 1: "Winter", 2: "Winter",
    3: "Spring", 4: "Spring", 5: "Spring",
    6: "Summer", 7: "Summer", 8: "Summer",
    9: "Autumn", 10: "Autumn", 11: "Autumn",
}

FRIENDLY_FACTOR_NAMES = {
    "temperature": "Température",
    "humidity": "Humidité",
    "rainfall": "Précipitations",
    "wind_speed": "Vent",
    "cases_7d": "Cas récents (7j)",
    "cases_14d": "Cas récents (14j)",
    "cases_30d": "Cas récents (30j)",
    "growth_rate": "Tendance des cas",
    "avg_severity": "Sévérité moyenne",
    "nearby_cases": "Pression des gouvernorats voisins",
    "disease_enc": "Type de maladie",
    "crop_enc": "Culture",
    "governorate_enc": "Gouvernorat",
    "climate_zone_enc": "Zone climatique",
    "season_enc": "Saison",
    "month": "Mois",
}


class RiskInput(BaseModel):
    disease: str = Field(..., description="ex: Tomato__early_blight")
    crop: str
    governorate: str
    climate_zone: str
    month: int = Field(..., ge=1, le=12)
    temperature: float
    humidity: float
    rainfall: float
    wind_speed: float
    cases_7d: int = 0
    cases_14d: int = 0
    cases_30d: int = 0
    growth_rate: float = 1.0
    avg_severity: float = Field(0.5, ge=0, le=1)
    nearby_cases: float = 0.0


class RiskFactor(BaseModel):
    factor: str
    contribution: float


class RiskOutput(BaseModel):
    risk_score: int
    risk_level: str
    top_factors: list[RiskFactor]
    confidence: float


def _risk_level(score: float) -> str:
    if score < 35:
        return "low"
    if score < 55:
        return "medium"
    if score < 70:
        return "high"
    return "very_high"


def _encode(payload: RiskInput) -> pd.DataFrame:
    season = SEASON_BY_MONTH[payload.month]
    raw = {
        "disease": payload.disease,
        "crop": payload.crop,
        "governorate": payload.governorate,
        "climate_zone": payload.climate_zone,
        "season": season,
    }

    encoded = {}
    for col in CATEGORICAL_COLS:
        encoder = _encoders[col]
        value = raw[col]
        if value not in encoder.classes_:
            raise HTTPException(
                status_code=422,
                detail=f"Valeur inconnue pour '{col}': '{value}'. "
                       f"Valeurs valides: {list(encoder.classes_)[:5]}...",
            )
        encoded[col + "_enc"] = encoder.transform([value])[0]

    numeric = {
        "month": payload.month,
        "temperature": payload.temperature,
        "humidity": payload.humidity,
        "rainfall": payload.rainfall,
        "wind_speed": payload.wind_speed,
        "cases_7d": payload.cases_7d,
        "cases_14d": payload.cases_14d,
        "cases_30d": payload.cases_30d,
        "growth_rate": payload.growth_rate,
        "avg_severity": payload.avg_severity,
        "nearby_cases": payload.nearby_cases,
    }

    row = {**encoded, **numeric}
    return pd.DataFrame([[row[col] for col in _feature_cols]], columns=_feature_cols)


@router.post("/spread-risk", response_model=RiskOutput)
def predict_risk(payload: RiskInput) -> RiskOutput:
    X = _encode(payload)

    raw_score = float(_model.predict(X)[0])
    score = int(round(np.clip(raw_score, 0, 100)))
    level = _risk_level(score)

    shap_values = _explainer.shap_values(X)[0]
    contributions = sorted(
        zip(_feature_cols, shap_values), key=lambda x: abs(x[1]), reverse=True
    )[:4]
    top_factors = [
        RiskFactor(factor=FRIENDLY_FACTOR_NAMES.get(name, name), contribution=round(float(val), 2))
        for name, val in contributions
    ]

    return RiskOutput(
        risk_score=score,
        risk_level=level,
        top_factors=top_factors,
        confidence=0.91,
    )
