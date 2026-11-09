import io
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from news.router import router as news_router

from . import config
from .model import ModelLoadError, get_model, load_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        load_model()
    except ModelLoadError:
        pass
    yield


app = FastAPI(title="Service d’inférence AgriNova", lifespan=lifespan)
app.include_router(news_router)


@app.get("/health")
def health():
    model = get_model()
    return {
        "status": "ok" if model else "unavailable",
        "model_loaded": model is not None,
        "architecture": model.architecture if model else None,
        "num_classes": model.num_classes if model else None,
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    model = get_model()
    if model is None:
        raise HTTPException(status_code=503, detail="Modèle non disponible.")

    contents = await file.read()

    if not contents:
        raise HTTPException(status_code=422, detail="Fichier vide.")

    if len(contents) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=422, detail="Fichier trop volumineux (max 8 Mo).")

    try:
        image = Image.open(io.BytesIO(contents))
        image.load()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=422, detail="Fichier image invalide ou illisible.")

    try:
        result = model.predict(image)
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur lors de l'inférence.")

    try:
        gradcam_base64, gradcam_ms = model.explain(image, result["predicted_index"])
        result["gradcam_base64"] = gradcam_base64
        result["gradcam_ms"] = gradcam_ms
    except Exception:
        result["gradcam_base64"] = None
        result["gradcam_ms"] = None

    return result
