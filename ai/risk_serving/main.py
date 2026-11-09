"""
Point d'entrée du service FastAPI dédié à la prédiction de risque de
propagation (AgriDetect). Tourne indépendamment du service de détection
EfficientNet (port 8001) — celui-ci sur le port 8006.

Lancement :

    cd ai
    python -m uvicorn risk_serving.main:app --port 8006
"""

from fastapi import FastAPI

from .risk import router as risk_router

app = FastAPI(title="Service de prédiction du risque AgriDetect")
app.include_router(risk_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "risk_prediction"}
