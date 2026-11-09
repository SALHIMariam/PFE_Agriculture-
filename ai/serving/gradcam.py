import base64
import io
import time

import numpy as np
import torch
from PIL import Image


def _jet_colormap(gray: np.ndarray) -> np.ndarray:
    """Classic piecewise-linear jet colormap. gray in [0,1] -> RGB uint8 [0,255]."""
    r = np.clip(np.minimum(4 * gray - 1.5, -4 * gray + 4.5), 0, 1)
    g = np.clip(np.minimum(4 * gray - 0.5, -4 * gray + 3.5), 0, 1)
    b = np.clip(np.minimum(4 * gray + 0.5, -4 * gray + 2.5), 0, 1)
    return (np.stack([r, g, b], axis=-1) * 255).astype(np.uint8)


def generate_gradcam(
    scripted_model,
    transform,
    img_size: tuple[int, int],
    image: Image.Image,
    predicted_index: int,
    alpha: float = 0.4,
) -> tuple[str, int]:
    """
    scripted_model : le ScriptModule complet charge par torch.jit.load
                      (expose .backbone et .head, cf. diagnostic de structure)
    transform : le pipeline torchvision (Resize/ToTensor/Normalize) utilise pour la prediction
    img_size : (H, W) — taille d'entree du modele, utilisee aussi comme taille d'affichage
    image : image PIL originale
    predicted_index : index de la classe predite dont on veut expliquer la decision

    Le backbone est purement convolutionnel (pas de pooling: verifie par diagnostic,
    backbone se termine par Conv2dNormActivation) donc backbone(x) donne directement
    les feature maps [1, C, H, W]. Le head applique pooling + classifieur et renvoie
    les logits pre-softmax [1, num_classes] — on retropropage depuis ces logits, pas
    depuis la sortie softmax du forward complet.

    TorchScript ne supporte pas register_forward_hook: on recupere le gradient des
    feature maps via tensor.retain_grad() plutot qu'un hook.

    Retourne (heatmap_base64_jpeg, gradcam_ms).
    """
    start = time.perf_counter()

    rgb_image = image.convert("RGB")
    input_tensor = transform(rgb_image).unsqueeze(0)

    with torch.enable_grad():
        features = scripted_model.backbone(input_tensor)
        features.retain_grad()
        logits = scripted_model.head(features)

        scripted_model.zero_grad()
        logits[0, predicted_index].backward()

        gradients = features.grad
        weights = gradients.mean(dim=(2, 3), keepdim=True)
        cam = torch.relu((weights * features).sum(dim=1))

    cam = cam.detach()[0]
    cam = cam - cam.min()
    max_val = cam.max()
    if max_val > 0:
        cam = cam / max_val

    heatmap_img = Image.fromarray(_jet_colormap(cam.numpy())).resize(img_size, Image.BILINEAR)
    display_image = rgb_image.resize(img_size, Image.BILINEAR)
    overlay = Image.blend(display_image, heatmap_img, alpha=alpha)

    buffer = io.BytesIO()
    overlay.convert("RGB").save(buffer, format="JPEG", quality=90)
    heatmap_b64 = base64.b64encode(buffer.getvalue()).decode("ascii")

    gradcam_ms = round((time.perf_counter() - start) * 1000)
    return heatmap_b64, gradcam_ms
