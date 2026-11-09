"""
Benchmark TorchScript (best.pt) vs ONNX Runtime (best.onnx) pour l'inférence
de classification EfficientNetB0 (sans Grad-CAM, qui reste sur TorchScript —
voir le commentaire en tête de ai/serving/model.py).

Usage : python ai/benchmark_inference.py [chemin_image]
"""
import glob
import os
import sys
import time

import numpy as np
import onnxruntime as ort
import torch
from PIL import Image
from torchvision import transforms

BASE_DIR = os.path.dirname(__file__)
TORCH_MODEL_PATH = os.path.join(BASE_DIR, "models", "best.pt")
ONNX_MODEL_PATH = os.path.join(BASE_DIR, "models", "best.onnx")
N_RUNS = 50

IMAGE_SIZE = (224, 224)
NORMALIZE_MEAN = [0.485, 0.456, 0.406]
NORMALIZE_STD = [0.229, 0.224, 0.225]


def find_sample_image() -> str:
    matches = glob.glob(os.path.join(BASE_DIR, "dataset_final", "test", "*", "*.jpg"))
    if not matches:
        raise SystemExit("Aucune image de test trouvée sous ai/dataset_final/test/.")
    return matches[0]


def load_tensor(image_path: str) -> torch.Tensor:
    transform = transforms.Compose([
        transforms.Resize(IMAGE_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=NORMALIZE_MEAN, std=NORMALIZE_STD),
    ])
    image = Image.open(image_path).convert("RGB")
    return transform(image).unsqueeze(0)


def bench_torchscript(tensor: torch.Tensor) -> float:
    model = torch.jit.load(TORCH_MODEL_PATH, map_location="cpu")
    model.eval()
    torch.set_num_threads(1)

    with torch.inference_mode():
        model(tensor)  # warm-up

        start = time.perf_counter()
        for _ in range(N_RUNS):
            model(tensor)
        elapsed = time.perf_counter() - start

    return (elapsed / N_RUNS) * 1000


def bench_onnx(tensor: torch.Tensor) -> float:
    session = ort.InferenceSession(ONNX_MODEL_PATH)
    numpy_input = tensor.numpy()

    session.run(None, {"image": numpy_input})  # warm-up

    start = time.perf_counter()
    for _ in range(N_RUNS):
        session.run(None, {"image": numpy_input})
    elapsed = time.perf_counter() - start

    return (elapsed / N_RUNS) * 1000


def main():
    image_path = sys.argv[1] if len(sys.argv) > 1 else find_sample_image()
    print(f"Image de test : {image_path}")

    tensor = load_tensor(image_path)

    torch_ms = bench_torchscript(tensor)
    print(f"TorchScript : {torch_ms:.1f} ms/inférence (moyenne sur {N_RUNS} runs)")

    onnx_ms = bench_onnx(tensor)
    print(f"ONNX Runtime : {onnx_ms:.1f} ms/inférence (moyenne sur {N_RUNS} runs)")

    speedup = torch_ms / onnx_ms if onnx_ms > 0 else float("inf")
    print(f"ONNX Runtime : {onnx_ms:.0f}ms -> TorchScript : {torch_ms:.0f}ms -> speedup {speedup:.1f}x")


if __name__ == "__main__":
    main()
