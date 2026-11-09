#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
 audit_dataset.py
 -----------------------------------------------------------------------------
 Projet PFE  : Détection intelligente des maladies foliaires (Deep Learning)
 Objectif    : ÉTAPE 1 — Audit complet du dataset AVANT tout nettoyage
               Comprendre ce qu'on a avant de toucher aux images

 Auteur      : Mariem Salhi
 Usage       : python audit_dataset.py
================================================================================
"""

# =============================================================================
#                          PARAMÈTRE CONFIGURABLE
# =============================================================================

RAW_DATASET_DIR = r"C:\Users\user\Desktop\New_Dataset"
REPORTS_DIR     = r"C:\Users\user\Desktop\PFE\ai\reports"

# =============================================================================

import os
import sys
import json
import random
from pathlib import Path
from collections import defaultdict

import numpy as np
import cv2
from tqdm import tqdm

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    HAS_MPL = True
except ImportError:
    HAS_MPL = False

VALID_EXTS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")


def list_images(folder: Path):
    return [p for p in folder.rglob("*")
            if p.is_file() and p.suffix.lower() in VALID_EXTS]


def get_image_size(path: Path):
    try:
        img = cv2.imread(str(path))
        if img is not None:
            h, w = img.shape[:2]
            return w, h
    except Exception:
        pass
    return None, None


def main():
    raw_dir     = Path(RAW_DATASET_DIR)
    reports_dir = Path(REPORTS_DIR)
    reports_dir.mkdir(parents=True, exist_ok=True)

    if not raw_dir.exists():
        print(f"[ERREUR] Dossier introuvable : {raw_dir}")
        sys.exit(1)

    print("=" * 70)
    print(" ÉTAPE 1 — AUDIT DU DATASET BRUT")
    print("=" * 70)
    print(f"Dossier analysé : {raw_dir}\n")

    # -------------------------------------------------------------------------
    # 1. Indexation : plante -> maladie -> images
    # -------------------------------------------------------------------------
    classes      = defaultdict(list)
    plants_found = []
    total_images = 0

    for plant_dir in sorted(p for p in raw_dir.iterdir() if p.is_dir()):
        plants_found.append(plant_dir.name)
        for dis_dir in sorted(d for d in plant_dir.iterdir() if d.is_dir()):
            class_name = f"{plant_dir.name}__{dis_dir.name}"
            imgs = list_images(dis_dir)
            classes[class_name] = imgs
            total_images += len(imgs)

    num_classes = len(classes)
    num_plants  = len(plants_found)

    print(f"Plantes detectees   : {num_plants}")
    print(f"  -> {', '.join(plants_found)}")
    print(f"Classes totales     : {num_classes}")
    print(f"Images totales      : {total_images}\n")

    # -------------------------------------------------------------------------
    # 2. Distribution par classe
    # -------------------------------------------------------------------------
    counts        = {c: len(imgs) for c, imgs in classes.items()}
    sorted_counts = sorted(counts.items(), key=lambda x: x[1])

    print("-" * 70)
    print(f"  {'Classe':<50} {'Images':>8}")
    print("-" * 70)
    for c, n in sorted_counts:
        flag = "  << FAIBLE" if n < 100 else ("  < MOYEN" if n < 300 else "")
        print(f"  {c:<50} {n:>8}{flag}")

    # -------------------------------------------------------------------------
    # 3. Statistiques globales
    # -------------------------------------------------------------------------
    counts_vals = list(counts.values())
    print("\n" + "-" * 70)
    print(" STATISTIQUES DE DISTRIBUTION")
    print("-" * 70)
    print(f"  Minimum   : {min(counts_vals):>6}  ({sorted_counts[0][0]})")
    print(f"  Maximum   : {max(counts_vals):>6}  ({sorted_counts[-1][0]})")
    print(f"  Moyenne   : {np.mean(counts_vals):>6.0f} images / classe")
    print(f"  Mediane   : {np.median(counts_vals):>6.0f} images / classe")
    print(f"  Ecart-type: {np.std(counts_vals):>6.0f}")

    classes_faibles  = [c for c, n in counts.items() if n < 100]
    classes_moyennes = [c for c, n in counts.items() if 100 <= n < 300]
    classes_ok       = [c for c, n in counts.items() if n >= 300]

    print(f"\n  Classes faibles   (< 100 images) : {len(classes_faibles)}")
    for c in classes_faibles:
        print(f"       - {c}  ({counts[c]} images)")
    print(f"  Classes moyennes (100-299 images): {len(classes_moyennes)}")
    print(f"  Classes correctes(>= 300 images) : {len(classes_ok)}")

    # -------------------------------------------------------------------------
    # 4. Analyse des tailles d'images (echantillon de 200 images)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 70)
    print(" ANALYSE DES TAILLES D'IMAGES (echantillon 200 images)")
    print("-" * 70)

    all_paths = [p for paths in classes.values() for p in paths]
    sample    = random.sample(all_paths, min(200, len(all_paths)))

    widths, heights = [], []
    for path in tqdm(sample, desc="Lecture tailles"):
        w, h = get_image_size(path)
        if w and h:
            widths.append(w)
            heights.append(h)

    if widths:
        print(f"  Largeur  -- min:{min(widths)}  max:{max(widths)}  moy:{np.mean(widths):.0f}")
        print(f"  Hauteur  -- min:{min(heights)} max:{max(heights)} moy:{np.mean(heights):.0f}")
        unique_sizes = set(zip(widths, heights))
        print(f"  Tailles uniques detectees : {len(unique_sizes)}")
        for s in sorted(unique_sizes)[:10]:
            print(f"    -> {s[0]}x{s[1]}")

    # -------------------------------------------------------------------------
    # 5. Recommandations automatiques
    # -------------------------------------------------------------------------
    print("\n" + "=" * 70)
    print(" RECOMMANDATIONS")
    print("=" * 70)

    if classes_faibles:
        print(f"  ATTENTION : {len(classes_faibles)} classe(s) ont moins de 100 images.")
        print("      -> Utiliser Data Augmentation aggressive pour ces classes.")
        print("      -> Ou appliquer class_weight dans le training.")

    ratio = max(counts_vals) / max(min(counts_vals), 1)
    if ratio > 10:
        print(f"  ATTENTION : Desequilibre fort — ratio max/min = {ratio:.1f}x")
        print("      -> Utiliser class_weight ou oversampling.")
    elif ratio > 3:
        print(f"  INFO : Desequilibre modere — ratio max/min = {ratio:.1f}x")
        print("      -> Surveiller les metriques par classe (F1-score).")
    else:
        print(f"  OK : Dataset relativement equilibre (ratio = {ratio:.1f}x)")

    print(f"\n  Prochaine etape : lancer prepare_dataset.py pour le nettoyage")

    # -------------------------------------------------------------------------
    # 6. Sauvegarde JSON
    # -------------------------------------------------------------------------
    report = {
        "raw_dataset_dir" : str(raw_dir),
        "num_plants"      : num_plants,
        "plants"          : plants_found,
        "num_classes"     : num_classes,
        "total_images"    : total_images,
        "class_counts"    : counts,
        "stats": {
            "min"    : int(min(counts_vals)),
            "max"    : int(max(counts_vals)),
            "mean"   : float(np.mean(counts_vals)),
            "median" : float(np.median(counts_vals)),
            "std"    : float(np.std(counts_vals)),
        },
        "weak_classes"   : classes_faibles,
        "medium_classes" : classes_moyennes,
    }
    out_json = reports_dir / "audit_report.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n[OK] Rapport JSON : {out_json}")

    # -------------------------------------------------------------------------
    # 7. Graphique
    # -------------------------------------------------------------------------
    if HAS_MPL:
        fig, ax = plt.subplots(figsize=(12, max(6, num_classes * 0.35)))
        colors   = ["#d32f2f" if n < 100 else "#f57c00" if n < 300 else "#2e7d32"
                    for n in [counts[c] for c in sorted(counts.keys())]]
        y_labels = sorted(counts.keys())
        x_vals   = [counts[c] for c in y_labels]
        ax.barh(y_labels, x_vals, color=colors)
        ax.axvline(x=100, color="red",    linestyle="--", alpha=0.7, label="Seuil faible (100)")
        ax.axvline(x=300, color="orange", linestyle="--", alpha=0.7, label="Seuil moyen (300)")
        ax.set_xlabel("Nombre d'images")
        ax.set_title("Distribution du dataset par classe")
        ax.legend()
        plt.tight_layout()
        plot_path = reports_dir / "audit_distribution.png"
        plt.savefig(plot_path, dpi=120)
        plt.close(fig)
        print(f"[OK] Graphique     : {plot_path}")

    print("\n[AUDIT TERMINE]\n")


if __name__ == "__main__":
    main()
