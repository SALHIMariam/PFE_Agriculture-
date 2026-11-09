"""
Service FastAPI Assistant AI.
Lancement :
    python -m uvicorn main:app --port 8007

Endpoints :
    GET  /health
    POST /copilot/prepare   -> CopilotResponse
"""
from fastapi import FastAPI

from schemas import CopilotRequest, CopilotResponse
from engine import CopilotEngine

app = FastAPI(title="AgriDetect Assistant AI", version="1.0.0")
engine = CopilotEngine()


@app.get("/health")
def health():
    return {"status": "ok", "service": "expert-copilot", "version": "1.0.0"}


@app.post("/copilot/prepare", response_model=CopilotResponse)
def prepare(req: CopilotRequest):
    """
    Reçoit le contexte agrégé d'une analyse (envoyé par Laravel) et renvoie
    la préparation complète : safety, priorité, confiance, brouillon, fiche.
    """
    return engine.build(req)
