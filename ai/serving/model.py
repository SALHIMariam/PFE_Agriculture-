import json
import time
from pathlib import Path
from typing import Optional

import numpy as np
import torch
from PIL import Image
from torchvision import transforms

try:
    import onnxruntime as ort
except ImportError:  # pragma: no cover - onnxruntime is in requirements.txt
    ort = None

from . import config
from .gradcam import generate_gradcam


def _resolve_model_path(configured_path: str) -> str:
    """AGRINOVA_MODEL_PATH defaults to 'ai/models/best.pt', which is only
    correct when the process cwd is the repo root. The documented startup
    command runs uvicorn from inside ai/, so also try the path relative to
    this package's location before giving up."""
    path = Path(configured_path)
    if path.exists():
        return str(path)

    fallback = Path(__file__).resolve().parent.parent / "models" / "best.pt"
    if fallback.exists():
        return str(fallback)

    return str(path)


def _resolve_onnx_path(torchscript_path: str) -> Optional[Path]:
    """best.onnx lives next to best.pt (see ai/convert_to_onnx.py). Returns
    None if it hasn't been generated yet, so the caller can fall back to
    TorchScript for classification too."""
    candidate = Path(torchscript_path).with_suffix(".onnx")
    return candidate if candidate.exists() else None


class ModelLoadError(RuntimeError):
    pass


def _parse_value(raw):
    """Extra files come back from torch.jit.load as bytes, encoded as either
    plain text or JSON. Decode, try JSON, fall back to the raw string so we
    never hardcode an expected encoding."""
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8")
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return raw


def _parse_float_list(raw) -> list[float]:
    value = _parse_value(raw)
    if isinstance(value, list):
        return [float(v) for v in value]
    return [float(v.strip()) for v in str(value).split(",") if v.strip()]


def _parse_img_size(raw) -> tuple[int, int]:
    """Observed as either a single int (e.g. 224) or a 'H,W' pair
    (e.g. '224,224') depending on how the model was exported."""
    value = _parse_value(raw)
    if isinstance(value, int):
        return (value, value)
    if isinstance(value, list):
        parts = [int(v) for v in value]
    else:
        parts = [int(v.strip()) for v in str(value).split(",") if v.strip()]
    if not parts:
        return (224, 224)
    if len(parts) == 1:
        return (parts[0], parts[0])
    return (parts[0], parts[1])


class AgriDetectModel:
    """
    Classification (predict()) runs on ONNX Runtime when best.onnx is
    available — ~5x faster on CPU than the TorchScript module (measured:
    27ms -> 4.7ms per image, see ai/benchmark_inference.py).

    Grad-CAM (explain()) keeps running on the TorchScript module: it
    backpropagates through scripted_model.backbone / .head separately
    (ai/serving/gradcam.py), which an ONNX Runtime session cannot do — it's
    a frozen forward-only graph with no autograd and no addressable
    submodules. Both models are therefore loaded side by side; this
    "hybrid" is why base RAM is unchanged even as classification gets
    faster (see the phase-3 report for the tradeoff).
    """

    def __init__(self, model_path: str):
        extra_files = {
            "class_names": "",
            "img_size": "",
            "num_classes": "",
            "normalize_mean": "",
            "normalize_std": "",
            "architecture": "",
            "output": "",
        }

        model_path = _resolve_model_path(model_path)

        try:
            self._model = torch.jit.load(model_path, map_location="cpu", _extra_files=extra_files)
        except Exception as exc:
            raise ModelLoadError(f"Impossible de charger le modèle depuis {model_path}: {exc}") from exc

        self._model.eval()
        torch.set_num_threads(1)

        self.class_names: list[str] = _parse_value(extra_files["class_names"])
        self.num_classes: int = int(_parse_value(extra_files["num_classes"]) or len(self.class_names))
        self.img_size: tuple[int, int] = _parse_img_size(extra_files["img_size"])
        self.architecture: str = _parse_value(extra_files["architecture"]) or "unknown"
        self.output: str = _parse_value(extra_files["output"]) or "softmax"

        mean = _parse_float_list(extra_files["normalize_mean"]) or [0.485, 0.456, 0.406]
        std = _parse_float_list(extra_files["normalize_std"]) or [0.229, 0.224, 0.225]

        self._transform = transforms.Compose([
            transforms.Resize(self.img_size),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std),
        ])

        self._onnx_session: Optional["ort.InferenceSession"] = None
        onnx_path = _resolve_onnx_path(model_path) if ort is not None else None
        if onnx_path is not None:
            self._onnx_session = ort.InferenceSession(str(onnx_path))

    def predict(self, image: Image.Image) -> dict:
        tensor = self._transform(image.convert("RGB")).unsqueeze(0)

        start = time.perf_counter()
        if self._onnx_session is not None:
            probabilities = self._onnx_session.run(None, {"image": tensor.numpy()})[0][0]
            top_indices = np.argsort(probabilities)[::-1][: min(config.TOP_K, probabilities.shape[0])]
            top_confidences = probabilities[top_indices]
        else:
            # best.onnx absent (pas encore généré par ai/convert_to_onnx.py) :
            # on retombe sur TorchScript, plus lent mais toujours correct.
            with torch.inference_mode():
                torch_probabilities = self._model(tensor)[0]
            top_conf_t, top_idx_t = torch.topk(torch_probabilities, k=min(config.TOP_K, torch_probabilities.shape[0]))
            top_confidences = top_conf_t.numpy()
            top_indices = top_idx_t.numpy()
        inference_ms = round((time.perf_counter() - start) * 1000)

        top_k = [
            {"class": self.class_names[idx], "confidence": round(float(conf), 4)}
            for conf, idx in zip(top_confidences, top_indices)
        ]

        predicted_index = int(top_indices[0].item())
        confidence = top_k[0]["confidence"]

        return {
            "predicted_class": self.class_names[predicted_index],
            "predicted_index": predicted_index,
            "confidence": confidence,
            "low_confidence": confidence < config.CONFIDENCE_THRESHOLD,
            "top_k": top_k,
            "inference_ms": inference_ms,
        }

    def explain(self, image: Image.Image, predicted_index: int) -> tuple[str, int]:
        """Grad-CAM heatmap (base64 JPEG) for the given prediction, and the
        time it took in ms. Runs with autograd enabled — must not be called
        under torch.inference_mode()."""
        return generate_gradcam(self._model, self._transform, self.img_size, image, predicted_index)


_model_instance: Optional[AgriDetectModel] = None


def load_model() -> AgriDetectModel:
    global _model_instance
    if _model_instance is None:
        _model_instance = AgriDetectModel(config.MODEL_PATH)
    return _model_instance


def get_model() -> Optional[AgriDetectModel]:
    return _model_instance
