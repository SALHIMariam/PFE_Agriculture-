# -*- coding: utf-8 -*-
"""
verify_blur.py — Outil de vérification visuelle des rejets "blurry"

Génère une page HTML qui montre :
  - Les images rejetées (sample), triées du moins flou au plus flou
  - Les images acceptées (sample) pour comparaison
  - Score Laplacien + score FFT pour chaque image
  - Couleur visuelle (vert/orange/rouge) selon les seuils

Usage :
    python verify_blur.py --class Apple__apple_scab
"""

import argparse
import base64
import random
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

# --- CHEMINS mis à jour vers le projet PFE ---
PROJECT       = Path(r"C:\Users\user\Desktop\PFE\ai")
REJECTED_BLUR = PROJECT / "rejected" / "blurry"
ACCEPTED      = PROJECT / "dataset_final" / "train"
OUTPUT_HTML   = PROJECT / "reports" / "verify_blur.html"

# Mêmes seuils que prepare_dataset.py
LAPLACIAN_THRESHOLD = 60.0
FFT_THRESHOLD       = 10.0

SAMPLE_SIZE = 12


def compute_leaf_mask(gray, bg_threshold=30):
    mask = gray > bg_threshold
    return mask, mask.sum() / mask.size


def laplacian_score(path: Path) -> float:
    img = cv2.imread(str(path))
    if img is None:
        return 0.0
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mask, ratio = compute_leaf_mask(gray)
    if ratio < 0.05:
        return 0.0
    return float(cv2.Laplacian(gray, cv2.CV_64F)[mask].var())


def fft_score(path: Path) -> float:
    img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return 0.0
    h, w = img.shape
    s  = min(256, h, w)
    cy, cx = h // 2, w // 2
    img = img[cy - s // 2:cy + s // 2, cx - s // 2:cx + s // 2]
    f      = np.fft.fft2(img.astype(np.float32))
    fshift = np.fft.fftshift(f)
    rows, cols = img.shape
    cr, cc     = rows // 2, cols // 2
    radius     = min(rows, cols) // 4
    mask       = np.ones_like(img, dtype=bool)
    y, x       = np.ogrid[:rows, :cols]
    inside     = (y - cr) ** 2 + (x - cc) ** 2 <= radius ** 2
    mask[inside] = False
    return float(np.mean(np.abs(fshift[mask])))


def img_to_base64(path: Path, size: int = 220) -> str:
    img = Image.open(path).convert("RGB")
    img.thumbnail((size, size), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def color_for(lap: float, fft: float) -> str:
    lap_blurry = lap < LAPLACIAN_THRESHOLD
    fft_blurry = fft < FFT_THRESHOLD
    if lap_blurry and fft_blurry:
        return "#d32f2f"
    if not lap_blurry and not fft_blurry:
        return "#2e7d32"
    return "#f57c00"


def build_card(path: Path, b64: str, lap: float, fft: float, label: str) -> str:
    color      = color_for(lap, fft)
    lap_status = "FLOU" if lap < LAPLACIAN_THRESHOLD else "NET"
    fft_status = "FLOU" if fft < FFT_THRESHOLD else "NET"
    return f'''
    <div class="card" style="border-left: 6px solid {color};">
      <img src="data:image/jpeg;base64,{b64}" />
      <div class="meta">
        <div class="label">{label}</div>
        <div class="filename">{path.name}</div>
        <div class="score">Laplacien : <b>{lap:.1f}</b>
             <span style="color:{'#d32f2f' if lap<LAPLACIAN_THRESHOLD else '#2e7d32'}">
             [{lap_status}]</span></div>
        <div class="score">FFT       : <b>{fft:.2f}</b>
             <span style="color:{'#d32f2f' if fft<FFT_THRESHOLD else '#2e7d32'}">
             [{fft_status}]</span></div>
      </div>
    </div>'''


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--class", dest="class_name",
                        default="Apple__apple_scab",
                        help="Nom de classe à vérifier")
    parser.add_argument("--n", type=int, default=SAMPLE_SIZE)
    args = parser.parse_args()

    rejected_dir = REJECTED_BLUR / args.class_name
    accepted_dir = ACCEPTED      / args.class_name

    if not rejected_dir.exists():
        print(f"[!] Pas de dossier rejected/blurry/{args.class_name}")
        return
    if not accepted_dir.exists():
        print(f"[!] Pas de dossier dataset_final/train/{args.class_name}")
        return

    rejected_imgs = sorted(rejected_dir.iterdir())
    accepted_imgs = sorted(accepted_dir.iterdir())

    random.seed(42)
    rej_sample = random.sample(rejected_imgs, min(args.n, len(rejected_imgs)))
    acc_sample = random.sample(accepted_imgs, min(args.n, len(accepted_imgs)))

    print(f"Calcul des scores : {len(rej_sample)} rejetées + {len(acc_sample)} acceptées...")

    rej_data = [(p, laplacian_score(p), fft_score(p)) for p in rej_sample]
    acc_data = [(p, laplacian_score(p), fft_score(p)) for p in acc_sample]
    rej_data.sort(key=lambda x: -x[1])

    rej_cards = "\n".join(
        build_card(p, img_to_base64(p), lap, fft, "REJETÉE (blurry)")
        for p, lap, fft in rej_data
    )
    acc_cards = "\n".join(
        build_card(p, img_to_base64(p), lap, fft, "ACCEPTÉE")
        for p, lap, fft in acc_data
    )

    rej_avg_lap = np.mean([x[1] for x in rej_data])
    acc_avg_lap = np.mean([x[1] for x in acc_data])
    rej_avg_fft = np.mean([x[2] for x in rej_data])
    acc_avg_fft = np.mean([x[2] for x in acc_data])

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Vérification flou — {args.class_name}</title>
<style>
body {{ font-family: 'Segoe UI', sans-serif; background:#f5f5f5; padding:20px; }}
h1 {{ color:#1976d2; }}
.summary {{ background:white; padding:15px; border-radius:8px;
            margin-bottom:20px; box-shadow:0 2px 4px rgba(0,0,0,0.1); }}
.legend {{ display:flex; gap:20px; margin:10px 0; }}
.legend-item {{ display:flex; align-items:center; gap:8px; }}
.dot {{ width:18px; height:18px; border-radius:4px; }}
.section {{ margin-top:30px; }}
.grid {{ display:grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap:15px; }}
.card {{ background:white; border-radius:8px; overflow:hidden;
         box-shadow:0 2px 6px rgba(0,0,0,0.1); }}
.card img {{ width:100%; height:220px; object-fit:cover; display:block; }}
.meta {{ padding:10px; }}
.label {{ font-weight:bold; color:#555; font-size:12px; text-transform:uppercase; }}
.filename {{ font-family:monospace; font-size:11px; color:#888;
             margin:4px 0; word-break:break-all; }}
.score {{ font-size:13px; margin:3px 0; }}
</style></head><body>

<h1>Vérification visuelle du flou — {args.class_name}</h1>

<div class="summary">
  <h3>Comment lire cette page</h3>
  <p>Chaque image a <b>2 scores indépendants</b> :</p>
  <ul>
    <li><b>Laplacien</b> : variance des bords. Seuil = {LAPLACIAN_THRESHOLD}</li>
    <li><b>FFT</b> : énergie des hautes fréquences. Seuil = {FFT_THRESHOLD}</li>
  </ul>
  <div class="legend">
    <div class="legend-item"><div class="dot" style="background:#2e7d32"></div>
      2 méthodes disent NET → faux rejet probable</div>
    <div class="legend-item"><div class="dot" style="background:#f57c00"></div>
      Désaccord → cas limite (à juger à l'œil)</div>
    <div class="legend-item"><div class="dot" style="background:#d32f2f"></div>
      2 méthodes disent FLOU → rejet justifié</div>
  </div>
  <h3>Statistiques</h3>
  <p>
    Rejetées : <b>{len(rej_data)}</b> sur {len(rejected_imgs)} images<br>
    Laplacien moyen — Rejetées : <b>{rej_avg_lap:.1f}</b> | Acceptées : <b>{acc_avg_lap:.1f}</b><br>
    FFT moyen       — Rejetées : <b>{rej_avg_fft:.2f}</b> | Acceptées : <b>{acc_avg_fft:.2f}</b>
  </p>
  <p><b>Si les rejetées ont des couleurs majoritairement vertes/oranges
     → baisser BLUR_THRESHOLD dans prepare_dataset.py</b></p>
</div>

<div class="section">
  <h2>Images rejetées (triées du MOINS au PLUS flou)</h2>
  <div class="grid">{rej_cards}</div>
</div>

<div class="section">
  <h2>Images acceptées (référence)</h2>
  <div class="grid">{acc_cards}</div>
</div>

</body></html>"""

    OUTPUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_HTML.write_text(html, encoding="utf-8")
    print(f"\n[OK] Rapport HTML : {OUTPUT_HTML}")
    print("     Ouvre-le dans ton navigateur pour vérifier visuellement.")


if __name__ == "__main__":
    main()
