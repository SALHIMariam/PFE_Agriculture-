"""
Convertit best.pt (TorchScript EfficientNetB0) en best.onnx pour ONNX Runtime.

Ne réexporte QUE le chemin de classification (softmax) : le Grad-CAM
(ai/serving/gradcam.py) fait de la rétropropagation sur scripted_model.backbone
et .head séparément, ce qu'un graphe ONNX figé ne peut pas fournir (pas
d'autograd, pas de sous-modules adressables). model.py continue donc de
charger best.pt en parallèle, uniquement pour le Grad-CAM — voir le
commentaire en tête de ai/serving/model.py.

Usage : python ai/convert_to_onnx.py
"""
import os

import torch

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "models", "best.pt")
OUTPUT_PATH = os.path.join(BASE_DIR, "models", "best.onnx")

# Charger le modèle TorchScript
model = torch.jit.load(MODEL_PATH, map_location="cpu")
model.eval()

# Créer un input dummy (batch=1, 3 channels, 224x224)
dummy_input = torch.randn(1, 3, 224, 224)

# Exporter en ONNX
torch.onnx.export(
    model,
    dummy_input,
    OUTPUT_PATH,
    input_names=["image"],
    output_names=["probabilities"],
    dynamic_axes={"image": {0: "batch"}, "probabilities": {0: "batch"}},
    opset_version=17,
    # torch 2.x default to the new "dynamo" exporter (needs onnxscript, and
    # expects an eager/fx-traceable model). Our model is a raw ScriptModule
    # loaded via torch.jit.load — the legacy TorchScript-based exporter
    # handles that directly, no extra dependency required.
    dynamo=False,
)

# Vérifier la taille du fichier généré
size_mb = os.path.getsize(OUTPUT_PATH) / (1024 * 1024)
print(f"Exporté : {OUTPUT_PATH} ({size_mb:.1f} Mo)")

# Valider avec ONNX Runtime
import numpy as np
import onnxruntime as ort

session = ort.InferenceSession(OUTPUT_PATH)
result = session.run(None, {"image": dummy_input.numpy()})
print(f"Validation ONNX Runtime OK — output shape: {result[0].shape}")

# Comparer les sorties TorchScript vs ONNX
with torch.no_grad():
    torch_out = model(dummy_input).numpy()
max_diff = np.max(np.abs(torch_out - result[0]))
print(f"Écart max TorchScript vs ONNX : {max_diff:.6f} (doit être < 0.001)")

if max_diff >= 0.001:
    raise SystemExit(
        f"Écart trop élevé ({max_diff:.6f}) — ne pas activer ONNX en "
        "production sans investiguer (opérateur mal converti ?)."
    )
