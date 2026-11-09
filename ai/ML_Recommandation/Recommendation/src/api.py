"""
Service FastAPI du moteur de recommandation AgriDetect.

Se place derrière le backend Laravel, qui relaie déjà le service de
prédiction EfficientNetB0.

    uvicorn src.api:app --host 0.0.0.0 --port 8100

Endpoints
---------
    POST /recommendation           un diagnostic -> un package
    POST /recommendation/batch     plusieurs d'un coup
    GET  /classes                  les 39 classes CNN
    GET  /governorates             les 24 gouvernorats + zone
    GET  /compatibility            la matrice 9 x 24 complète
    GET  /compatibility/{plante}/{gouvernorat}
    GET  /knowledge-base/{id}      package brut (écran expert)
    GET  /health                   sonde de disponibilité
"""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from src import config
from src.compatibility import MATRIX, LEVEL_LABEL_FR, explain
from src.recommender import RecommendationRequest, get_recommender

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("agridetect.reco")


@asynccontextmanager
async def lifespan(_: FastAPI):
    rec = get_recommender()
    logger.info("Moteur prêt — modèle=%s, %d packages", rec.model_name, len(rec.kb))
    yield


app = FastAPI(
    lifespan=lifespan,
    title="AgriDetect — API de recommandation",
    description=(
        "Génère un package de recommandation agronomique à partir de la classe "
        "prédite par EfficientNetB0 et du gouvernorat de l'utilisateur connecté."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # à restreindre à l'hôte Laravel en production
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class RecommendationInput(BaseModel):
    predicted_class: str = Field(
        ..., alias="class",
        description="Classe issue de EfficientNetB0",
        examples=["Tomato__late_blight"],
    )
    governorate: str = Field(
        ..., description="Gouvernorat du profil utilisateur", examples=["Bizerte"]
    )
    confidence: float = Field(0.95, ge=0.0, le=1.0, description="Confiance softmax du CNN")

    model_config = {"populate_by_name": True, "extra": "ignore"}

    @field_validator("predicted_class")
    @classmethod
    def _class_ok(cls, v: str) -> str:
        return config.normalize_class(v)

    @field_validator("governorate")
    @classmethod
    def _gov_ok(cls, v: str) -> str:
        return config.normalize_governorate(v)


class BatchInput(BaseModel):
    items: list[RecommendationInput] = Field(..., max_length=100)


@app.middleware("http")
async def _timing(request: Request, call_next):
    t0 = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time-Ms"] = f"{(time.perf_counter() - t0) * 1000:.1f}"
    return response


@app.post("/recommendation", tags=["recommandation"])
def recommendation(payload: RecommendationInput) -> dict:
    try:
        return get_recommender().recommend(RecommendationRequest(
            predicted_class=payload.predicted_class,
            governorate=payload.governorate,
            confidence=payload.confidence,
        ))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logger.exception("Échec de la recommandation")
        raise HTTPException(status_code=500, detail="Erreur du moteur") from exc


@app.post("/recommendation/batch", tags=["recommandation"])
def recommendation_batch(payload: BatchInput) -> dict:
    rec = get_recommender()
    out, errors = [], []
    for i, item in enumerate(payload.items):
        try:
            out.append(rec.recommend(RecommendationRequest(
                predicted_class=item.predicted_class,
                governorate=item.governorate,
                confidence=item.confidence,
            )))
        except ValueError as exc:
            errors.append({"index": i, "erreur": str(exc)})
    return {"resultats": out, "erreurs": errors, "total": len(out)}


@app.get("/classes", tags=["metadonnees"])
def classes() -> dict:
    return {
        "total": len(config.CLASSES),
        "classes": config.CLASSES,
        "classes_saines": sorted(config.HEALTHY_CLASSES),
        "plantes": config.PLANTS,
        "plantes_fr": config.PLANTS_FR,
    }


@app.get("/governorates", tags=["metadonnees"])
def governorates() -> dict:
    return {
        "total": len(config.GOVERNORATES),
        "gouvernorats": [
            {"nom": g, "zone": config.GOVERNORATE_ZONE[g],
             "description": config.ZONE_DESCRIPTION[config.GOVERNORATE_ZONE[g]]}
            for g in config.GOVERNORATES
        ],
    }


@app.get("/compatibility", tags=["metadonnees"])
def compatibility_matrix() -> dict:
    return {
        "plantes": config.PLANTS,
        "gouvernorats": config.GOVERNORATES,
        "matrice": {
            plant: {gov: LEVEL_LABEL_FR[MATRIX[plant][gov]] for gov in config.GOVERNORATES}
            for plant in config.PLANTS
        },
    }


@app.get("/compatibility/{plante}/{gouvernorat}", tags=["metadonnees"])
def compatibility_one(plante: str, gouvernorat: str) -> dict:
    try:
        gov = config.normalize_governorate(gouvernorat)
        plant = plante.capitalize()
        if plant not in config.PLANTS:
            raise ValueError(f"Plante inconnue : '{plante}'")
        return explain(plant, gov)
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/knowledge-base/{recommendation_id}", tags=["metadonnees"])
def knowledge_base_entry(recommendation_id: str) -> dict:
    try:
        return get_recommender().kb.get(recommendation_id.upper())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/health", tags=["ops"])
def health() -> dict:
    rec = get_recommender()
    return {
        "statut": "ok",
        "modele_charge": rec.model is not None,
        "modele": rec.model_name,
        "version_base_connaissances": rec.kb.version,
        "n_packages": len(rec.kb),
        "n_classes": len(config.CLASSES),
        "n_gouvernorats": len(config.GOVERNORATES),
    }
