#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
 visualize_augmentations.py
 -----------------------------------------------------------------------------
 Projet PFE  : Détection des maladies foliaires
 Rôle        : Génère une page HTML qui montre des exemples d'images
               augmentées (AUG_*) côte à côte avec leur original.

               PERMET DE VALIDER VISUELLEMENT la qualité des augmentations
               AVANT de lancer un training long.

 Pour chaque classe augmentée :
   - 1 image originale (référence)
   - 5 images AUG_ tirées au hasard

 Usage      : python visualize_augmentations.py
              python visualize_augmentations.py --class Potato__virus
================================================================================
"""

import argparse
import base64
import random
from io import BytesIO
from pathlib import Path

from PIL import Image

# --- CHEMINS ---
TRAIN_DIR    = Path(r"C:\Users\user\Desktop\PFE\ai\dataset_final\train")
OUTPUT_HTML  = Path(r"C:\Users\user\Desktop\PFE\ai\reports\augmentations_preview.html")
N_SAMPLES    = 5         # nombre d'exemples augmentés par classe
THUMB_SIZE   = 200


def img_to_base64(path: Path, size: int = THUMB_SIZE) -> str:
    """Convertit une image en base64 pour l'intégrer dans le HTML."""
    img = Image.open(path).convert("RGB")
    img.thumbnail((size, size), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def build_class_section(class_name: str, n_samples: int = N_SAMPLES) -> str:
    """Construit la section HTML pour une classe (1 original + N augmentées)."""
    cls_dir = TRAIN_DIR / class_name
    if not cls_dir.exists():
        return ""

    # Séparer originales et augmentées
    originals = [p for p in cls_dir.glob("*.jpg") if not p.name.startswith("AUG_")]
    augmented = list(cls_dir.glob("AUG_*.jpg"))

    if not augmented:
        return ""  # rien à montrer pour cette classe

    # Tirage aléatoire
    random.seed(42 + hash(class_name) % 1000)
    sample_orig = random.choice(originals) if originals else None
    sample_aug  = random.sample(augmented, min(n_samples, len(augmented)))

    # Construction HTML
    cards = ""
    if sample_orig:
        b64 = img_to_base64(sample_orig)
        cards += f'''
        <div class="card original">
          <img src="data:image/jpeg;base64,{b64}" />
          <div class="label">ORIGINAL</div>
          <div class="filename">{sample_orig.name}</div>
        </div>
        '''

    for aug_path in sample_aug:
        b64 = img_to_base64(aug_path)
        cards += f'''
        <div class="card augmented">
          <img src="data:image/jpeg;base64,{b64}" />
          <div class="label">AUGMENTÉE</div>
          <div class="filename">{aug_path.name}</div>
        </div>
        '''

    return f'''
    <div class="class-section">
      <h2>{class_name}
        <span class="stats">
          ({len(originals)} originales + {len(augmented)} augmentées
           = {len(originals) + len(augmented)} total)
        </span>
      </h2>
      <div class="grid">{cards}</div>
    </div>
    '''


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--class", dest="class_name", default=None,
                        help="Vérifier UNE classe spécifique (ex: Potato__virus)")
    parser.add_argument("--n", type=int, default=N_SAMPLES,
                        help="Nombre d'exemples augmentés par classe")
    parser.add_argument("--all", action="store_true",
                        help="Afficher TOUTES les classes augmentées (long)")
    args = parser.parse_args()

    if not TRAIN_DIR.exists():
        print(f"[ERREUR] Dossier introuvable : {TRAIN_DIR}")
        return

    OUTPUT_HTML.parent.mkdir(parents=True, exist_ok=True)

    # Choix des classes à afficher
    if args.class_name:
        classes_to_show = [args.class_name]
    else:
        # Par défaut : afficher les classes qui ont des AUG_, triées par criticité
        all_dirs = sorted([d for d in TRAIN_DIR.iterdir() if d.is_dir()])
        classes_with_aug = []
        for d in all_dirs:
            n_aug = sum(1 for _ in d.glob("AUG_*.jpg"))
            if n_aug > 0:
                n_orig = sum(1 for p in d.glob("*.jpg") if not p.name.startswith("AUG_"))
                classes_with_aug.append((d.name, n_orig, n_aug))

        # Trier par nombre d'originales (les + critiques en premier)
        classes_with_aug.sort(key=lambda x: x[1])
        classes_to_show = [c[0] for c in classes_with_aug]

        if not args.all:
            # Limiter aux 10 classes les plus critiques par défaut
            classes_to_show = classes_to_show[:10]

    print(f"\n[INFO] Génération du visualiseur pour {len(classes_to_show)} classe(s)...")

    # Construction HTML
    sections = ""
    for cls in classes_to_show:
        print(f"  - {cls}")
        sections += build_class_section(cls, n_samples=args.n)

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Vérification des augmentations — PFE</title>
<style>
  body {{
    font-family: 'Segoe UI', Arial, sans-serif;
    background: #f0f2f5;
    margin: 0;
    padding: 20px;
  }}
  h1 {{
    color: #1976d2;
    border-bottom: 3px solid #1976d2;
    padding-bottom: 10px;
  }}
  .intro {{
    background: white;
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }}
  .intro ul {{ margin: 10px 0; }}
  .checklist {{ background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; }}
  .class-section {{
    background: white;
    padding: 20px;
    margin-bottom: 25px;
    border-radius: 10px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  }}
  h2 {{
    color: #2e7d32;
    margin-top: 0;
    border-bottom: 2px solid #e0e0e0;
    padding-bottom: 8px;
  }}
  .stats {{
    font-size: 14px;
    color: #666;
    font-weight: normal;
  }}
  .grid {{
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 15px;
  }}
  .card {{
    background: #fafafa;
    border-radius: 8px;
    overflow: hidden;
    text-align: center;
    transition: transform 0.2s;
  }}
  .card:hover {{ transform: scale(1.03); }}
  .card.original {{ border: 3px solid #2e7d32; }}
  .card.augmented {{ border: 3px solid #1976d2; }}
  .card img {{
    width: 100%;
    height: 200px;
    object-fit: cover;
    display: block;
  }}
  .label {{
    padding: 6px;
    font-weight: bold;
    font-size: 12px;
    color: white;
  }}
  .original .label {{ background: #2e7d32; }}
  .augmented .label {{ background: #1976d2; }}
  .filename {{
    font-family: monospace;
    font-size: 10px;
    padding: 4px;
    color: #555;
    word-break: break-all;
  }}
</style>
</head>
<body>

<h1>🔍 Vérification visuelle des augmentations</h1>

<div class="intro">
  <h3>Comment lire cette page :</h3>
  <ul>
    <li><span style="color:#2e7d32;font-weight:bold">Cadre VERT</span> = image originale (référence)</li>
    <li><span style="color:#1976d2;font-weight:bold">Cadre BLEU</span> = image générée par augmentation</li>
  </ul>

  <div class="checklist">
    <h3 style="margin-top:0">✅ Checklist qualité — Pour chaque image augmentée, vérifier :</h3>
    <ul>
      <li>La feuille est <b>reconnaissable</b> (pas de mosaïque/kaléidoscope)</li>
      <li>Pas de motifs répétés en miroir</li>
      <li>Les zones vides sont en <b>noir</b> (pas en motif reflété)</li>
      <li>L'image reste <b>botaniquement réaliste</b></li>
      <li>La maladie (taches, décolorations) reste visible si présente</li>
    </ul>
    <p><b>Si tu vois des problèmes :</b><br>
    1. Note les classes problématiques<br>
    2. Lance <code>python augment_weak_classes_v2.py --rollback</code><br>
    3. Ajuste les paramètres dans le script et regénère
    </p>
  </div>
</div>

{sections}

</body>
</html>
"""

    OUTPUT_HTML.write_text(html, encoding="utf-8")
    print(f"\n[OK] Visualiseur généré : {OUTPUT_HTML}")
    print(f"     Ouvre-le dans ton navigateur pour vérifier la qualité.")

    # Tentative d'ouverture automatique
    import webbrowser
    try:
        webbrowser.open(str(OUTPUT_HTML))
        print("[OK] Page ouverte dans ton navigateur.")
    except Exception:
        pass


if __name__ == "__main__":
    main()
