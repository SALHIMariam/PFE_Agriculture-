import base64
import io
from pathlib import Path

import pytest
import torch
from fastapi.testclient import TestClient
from PIL import Image

from serving import config
from serving.main import app
from serving.model import get_model

AI_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = Path(config.MODEL_PATH)
if not MODEL_PATH.is_absolute() and not MODEL_PATH.exists():
    MODEL_PATH = AI_ROOT / "models" / "best.pt"

pytestmark = pytest.mark.skipif(
    not MODEL_PATH.exists(),
    reason="ai/models/best.pt is not present locally (git-ignored, must be placed manually)",
)


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def _first_sample_image() -> Path:
    test_root = AI_ROOT / "dataset_final" / "test"
    class_dir = next(p for p in sorted(test_root.iterdir()) if p.is_dir())
    return next(p for p in sorted(class_dir.iterdir()) if p.is_file())


def test_health_returns_ok_with_39_classes(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["model_loaded"] is True
    assert body["num_classes"] == 39


def test_predict_returns_valid_prediction(client):
    model = get_model()
    image_path = _first_sample_image()

    with open(image_path, "rb") as f:
        response = client.post("/predict", files={"file": (image_path.name, f, "image/jpeg")})

    assert response.status_code == 200
    body = response.json()
    assert body["predicted_class"] in model.class_names
    assert 0 <= body["confidence"] <= 1
    assert len(body["top_k"]) == 3

    confidences = [item["confidence"] for item in body["top_k"]]
    assert confidences == sorted(confidences, reverse=True)


def test_full_distribution_sums_to_one_no_double_softmax(client):
    model = get_model()
    image = Image.open(_first_sample_image()).convert("RGB")
    tensor = model._transform(image).unsqueeze(0)

    with torch.inference_mode():
        probabilities = model._model(tensor)[0]

    assert abs(probabilities.sum().item() - 1.0) < 1e-3


def test_predict_includes_valid_gradcam_heatmap(client):
    image_path = _first_sample_image()

    with open(image_path, "rb") as f:
        response = client.post("/predict", files={"file": (image_path.name, f, "image/jpeg")})

    assert response.status_code == 200
    body = response.json()

    assert body["gradcam_base64"]
    assert isinstance(body["gradcam_ms"], int)

    decoded = base64.b64decode(body["gradcam_base64"])
    heatmap = Image.open(io.BytesIO(decoded))
    heatmap.load()

    assert heatmap.format == "JPEG"
    assert heatmap.size == (224, 224)


def test_predict_rejects_non_image_file(client):
    response = client.post("/predict", files={"file": ("not_an_image.txt", b"hello world", "text/plain")})
    assert response.status_code == 422


def test_predict_requires_file(client):
    response = client.post("/predict")
    assert response.status_code == 422
