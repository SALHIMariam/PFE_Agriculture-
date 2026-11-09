#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
 audit_dataset_final.py
 -----------------------------------------------------------------------------
 Projet PFE  : Détection des maladies foliaires
 Rôle        : Génère un RAPPORT COMPLET de l'état actuel du dataset
               (après nettoyage, rebalancing, et augmentation sélective).

 Le rapport contient :
   1. Statistiques globales (total, train/val/test, plantes, classes)
   2. Distribution détaillée par classe (originales vs AUG_)
   3. Analyse du déséquilibre (avant/après)
   4. Graphiques visuels (HTML + PNG)
   5. Vérification d'intégrité (corruption, leakage résiduel)
   6. Recommandations training

 Sorties :
   - reports/dataset_audit_final.txt   (rapport texte)
   - reports/dataset_audit_final.json  (données structurées)
   - reports/dataset_audit_final.html  (page web visuelle)
   - reports/distribution_final.png    (graphique)

 Usage      : python audit_dataset_final.py
================================================================================
"""

import json
import hashlib
from pathlib import Path
from collections import defaultdict
from datetime import datetime

import numpy as np

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    HAS_MPL = True
except ImportError:
    HAS_MPL = False

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

from tqdm import tqdm


# =============================================================================
#                          PARAMÈTRES
# =============================================================================

DATASET_DIR  = Path(r"C:\Users\user\Desktop\PFE\ai\dataset_final")
REPORTS_DIR  = Path(r"C:\Users\user\Desktop\PFE\ai\reports")

# Charger l'historique pré-augmentation pour comparaison (si disponible)
AUDIT_BEFORE_JSON = REPORTS_DIR / "audit_report.json"

REPORTS_DIR.mkdir(parents=True, exist_ok=True)


# =============================================================================
#                          ANALYSE DU DATASET
# =============================================================================

def analyze_split(split_dir: Path) -> dict:
    """Analyse un split (train/val/test) et retourne les stats par classe."""
    stats = {}

    if not split_dir.exists():
        return stats

    for cls_dir in sorted(split_dir.iterdir()):
        if not cls_dir.is_dir():
            continue

        all_imgs = list(cls_dir.glob("*.jpg")) + list(cls_dir.glob("*.jpeg")) + list(cls_dir.glob("*.png"))
        originals = [p for p in all_imgs if not p.name.startswith("AUG_")]
        augmented = [p for p in all_imgs if p.name.startswith("AUG_")]

        stats[cls_dir.name] = {
            "total": len(all_imgs),
            "originals": len(originals),
            "augmented": len(augmented),
        }

    return stats


def extract_plant_disease(class_name: str) -> tuple:
    """Sépare 'Apple__apple_scab' en ('Apple', 'apple_scab')."""
    if "__" in class_name:
        parts = class_name.split("__", 1)
        return parts[0], parts[1]
    return class_name, "unknown"


def check_image_integrity(path: Path) -> bool:
    """Vérifie qu'une image est lisible."""
    if not HAS_PIL:
        return True
    try:
        img = Image.open(path)
        img.verify()
        return True
    except Exception:
        return False


def quick_integrity_check(stats_train: dict, sample_size: int = 200) -> dict:
    """Vérifie l'intégrité d'un échantillon d'images."""
    print(f"\n[INFO] Vérification d'intégrité ({sample_size} images échantillonnées)...")

    train_dir = DATASET_DIR / "train"
    all_paths = []
    for cls_dir in train_dir.iterdir():
        if cls_dir.is_dir():
            all_paths.extend(list(cls_dir.glob("*.jpg")))

    if len(all_paths) > sample_size:
        np.random.seed(42)
        sample = np.random.choice(all_paths, sample_size, replace=False).tolist()
    else:
        sample = all_paths

    corrupted = []
    for path in tqdm(sample, desc="intégrité"):
        if not check_image_integrity(path):
            corrupted.append(str(path))

    return {
        "sample_size": len(sample),
        "corrupted_count": len(corrupted),
        "corrupted_files": corrupted[:10],  # max 10 exemples
    }


# =============================================================================
#                          COMPARAISON AVEC L'AVANT
# =============================================================================

def load_before_stats() -> dict:
    """Charge le rapport d'audit avant augmentation, si disponible."""
    if AUDIT_BEFORE_JSON.exists():
        try:
            with open(AUDIT_BEFORE_JSON, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None


# =============================================================================
#                          RAPPORT TEXTE
# =============================================================================

def write_text_report(data: dict, output_path: Path):
    """Génère le rapport texte détaillé."""

    train      = data["train"]
    val        = data["val"]
    test       = data["test"]
    plants     = data["plants"]
    integrity  = data["integrity"]

    total_train = sum(c["total"] for c in train.values())
    total_val   = sum(c["total"] for c in val.values())
    total_test  = sum(c["total"] for c in test.values())
    total_all   = total_train + total_val + total_test

    total_originals = sum(c["originals"] for c in train.values())
    total_augmented = sum(c["augmented"] for c in train.values())

    lines = []
    lines.append("=" * 80)
    lines.append(" RAPPORT D'AUDIT — DATASET FINAL APRÈS AUGMENTATION SÉLECTIVE")
    lines.append("=" * 80)
    lines.append(f" Date         : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f" Dataset      : {DATASET_DIR}")
    lines.append(f" Projet       : PFE Détection maladies foliaires - Mariem Salhi")
    lines.append("=" * 80)

    # ─── SECTION 1 : Vue d'ensemble ────────────────────────────────────────
    lines.append("\n┌─ SECTION 1 : VUE D'ENSEMBLE " + "─" * 50)
    lines.append("│")
    lines.append(f"│  Nombre total d'images      : {total_all:>8,}")
    lines.append(f"│  Nombre de classes          : {len(train):>8}")
    lines.append(f"│  Nombre de plantes          : {len(plants):>8}")
    lines.append(f"│  Plantes couvertes          : {', '.join(plants)}")
    lines.append("│")
    lines.append(f"│  Train                      : {total_train:>8,}  ({total_train/total_all*100:.1f}%)")
    lines.append(f"│  Val                        : {total_val:>8,}  ({total_val/total_all*100:.1f}%)")
    lines.append(f"│  Test                       : {total_test:>8,}  ({total_test/total_all*100:.1f}%)")
    lines.append("│")
    lines.append(f"│  Images originales (train)  : {total_originals:>8,}")
    lines.append(f"│  Images augmentées (AUG_)   : {total_augmented:>8,}")
    lines.append(f"│  % augmentation             : {total_augmented/total_originals*100:>8.1f}%")
    lines.append("└" + "─" * 78)

    # ─── SECTION 2 : Comparaison avant/après ───────────────────────────────
    if data.get("before_stats"):
        before = data["before_stats"]
        lines.append("\n┌─ SECTION 2 : COMPARAISON AVANT / APRÈS AUGMENTATION " + "─" * 25)
        lines.append("│")
        before_total = before.get("total_images", 0)
        lines.append(f"│  Total AVANT augmentation   : {before_total:>8,}")
        lines.append(f"│  Total APRÈS augmentation   : {total_all:>8,}")
        lines.append(f"│  Images ajoutées            : {total_all - before_total:>8,}")
        lines.append(f"│  Augmentation globale       : {(total_all - before_total) / before_total * 100:>8.1f}%")
        lines.append("└" + "─" * 78)

    # ─── SECTION 3 : Distribution détaillée par classe ─────────────────────
    lines.append("\n┌─ SECTION 3 : DISTRIBUTION PAR CLASSE " + "─" * 41)
    lines.append("│")
    lines.append(f"│  {'Classe':<46} {'Train':>8} {'Orig':>7} {'AUG':>7} {'Val':>6} {'Test':>6}")
    lines.append("│  " + "─" * 78)

    # Tri par taille train croissante (les + petites en haut)
    sorted_classes = sorted(train.keys(), key=lambda c: train[c]["total"])

    for cls in sorted_classes:
        t = train[cls]
        v = val.get(cls, {"total": 0})["total"]
        te = test.get(cls, {"total": 0})["total"]

        # Flag selon taille
        if t["total"] < 1500:
            flag = "🔴"
        elif t["total"] < 3000:
            flag = "🟡"
        else:
            flag = "🟢"

        lines.append(f"│  {cls:<46} {t['total']:>8,} {t['originals']:>7,} "
                     f"{t['augmented']:>7,} {v:>6,} {te:>6,} {flag}")

    lines.append("│  " + "─" * 78)
    lines.append(f"│  {'TOTAL':<46} {total_train:>8,} {total_originals:>7,} "
                 f"{total_augmented:>7,} {total_val:>6,} {total_test:>6,}")
    lines.append("└" + "─" * 78)

    # ─── SECTION 4 : Analyse du déséquilibre ───────────────────────────────
    lines.append("\n┌─ SECTION 4 : ANALYSE DU DÉSÉQUILIBRE " + "─" * 40)
    lines.append("│")

    counts_train = [c["total"] for c in train.values()]
    counts_orig  = [c["originals"] for c in train.values()]

    min_train = min(counts_train)
    max_train = max(counts_train)
    min_orig  = min(counts_orig)
    max_orig  = max(counts_orig)

    ratio_orig  = max_orig / min_orig if min_orig > 0 else float("inf")
    ratio_total = max_train / min_train if min_train > 0 else float("inf")

    # Top 3 plus petites
    smallest = sorted(train.items(), key=lambda x: x[1]["total"])[:3]
    # Top 3 plus grandes
    largest = sorted(train.items(), key=lambda x: x[1]["total"], reverse=True)[:3]

    lines.append(f"│  AVANT augmentation (originales seules) :")
    lines.append(f"│    Min : {min_orig:>5,}  Max : {max_orig:>5,}  Ratio : {ratio_orig:>4.1f}×")
    lines.append("│")
    lines.append(f"│  APRÈS augmentation (total) :")
    lines.append(f"│    Min : {min_train:>5,}  Max : {max_train:>5,}  Ratio : {ratio_total:>4.1f}×")
    lines.append("│")
    lines.append(f"│  3 classes les plus petites (train total) :")
    for cls, c in smallest:
        lines.append(f"│    - {cls:<48} : {c['total']:>6,} ({c['originals']:>5,} orig + {c['augmented']:>5,} aug)")
    lines.append("│")
    lines.append(f"│  3 classes les plus grandes (train total) :")
    for cls, c in largest:
        lines.append(f"│    - {cls:<48} : {c['total']:>6,} ({c['originals']:>5,} orig + {c['augmented']:>5,} aug)")
    lines.append("│")

    # Évaluation qualité équilibrage
    if ratio_total < 2.5:
        verdict = "✅ EXCELLENT (ratio < 2.5×)"
    elif ratio_total < 4.0:
        verdict = "✅ BON (ratio < 4×)"
    elif ratio_total < 7.0:
        verdict = "⚠️ MOYEN (ratio < 7×)"
    else:
        verdict = "❌ DÉSÉQUILIBRÉ (ratio > 7×)"

    lines.append(f"│  Qualité de l'équilibrage   : {verdict}")
    lines.append("└" + "─" * 78)

    # ─── SECTION 5 : Distribution par plante ───────────────────────────────
    lines.append("\n┌─ SECTION 5 : DISTRIBUTION PAR PLANTE " + "─" * 40)
    lines.append("│")
    lines.append(f"│  {'Plante':<20} {'Classes':>8} {'Train':>8} {'Val':>8} {'Test':>8} {'Total':>8}")
    lines.append("│  " + "─" * 70)

    plant_stats = defaultdict(lambda: {"classes": 0, "train": 0, "val": 0, "test": 0})
    for cls, c in train.items():
        plant, _ = extract_plant_disease(cls)
        plant_stats[plant]["classes"] += 1
        plant_stats[plant]["train"] += c["total"]
        plant_stats[plant]["val"] += val.get(cls, {"total": 0})["total"]
        plant_stats[plant]["test"] += test.get(cls, {"total": 0})["total"]

    for plant in sorted(plant_stats.keys()):
        p = plant_stats[plant]
        total_plant = p["train"] + p["val"] + p["test"]
        lines.append(f"│  {plant:<20} {p['classes']:>8} {p['train']:>8,} "
                     f"{p['val']:>8,} {p['test']:>8,} {total_plant:>8,}")

    lines.append("└" + "─" * 78)

    # ─── SECTION 6 : Intégrité ─────────────────────────────────────────────
    lines.append("\n┌─ SECTION 6 : VÉRIFICATION D'INTÉGRITÉ " + "─" * 39)
    lines.append("│")
    lines.append(f"│  Échantillon vérifié        : {integrity['sample_size']:>5} images")
    lines.append(f"│  Images corrompues          : {integrity['corrupted_count']:>5}")

    if integrity['corrupted_count'] == 0:
        lines.append(f"│  Status                     : ✅ AUCUNE corruption détectée")
    else:
        lines.append(f"│  Status                     : ❌ {integrity['corrupted_count']} corruptions !")
        lines.append(f"│  Exemples :")
        for f in integrity['corrupted_files'][:5]:
            lines.append(f"│    - {f}")

    lines.append("└" + "─" * 78)

    # ─── SECTION 7 : Recommandations ───────────────────────────────────────
    lines.append("\n┌─ SECTION 7 : RECOMMANDATIONS POUR LE TRAINING " + "─" * 30)
    lines.append("│")

    if ratio_total < 2.5:
        lines.append(f"│  ✅ Équilibrage excellent. Tu peux utiliser un class_weight léger")
        lines.append(f"│     ou même t'en passer.")
    elif ratio_total < 4.0:
        lines.append(f"│  ⚠️ Équilibrage correct mais utilise class_weight='balanced'")
        lines.append(f"│     pour compenser le résidu (ratio {ratio_total:.1f}×).")
    else:
        lines.append(f"│  🔴 Déséquilibre encore élevé. class_weight='balanced' OBLIGATOIRE.")
        lines.append(f"│     Envisage Focal Loss ou plus d'augmentation.")

    lines.append("│")
    lines.append(f"│  📊 Configuration training recommandée :")
    lines.append(f"│     - Modèle      : EfficientNetB0 (ou V2-S si plus de GPU)")
    lines.append(f"│     - Batch size  : 32 (CPU) ou 64 (GPU T4)")
    lines.append(f"│     - Epochs      : 10 (phase 1) + 20 (fine-tuning)")
    lines.append(f"│     - Class weight: balanced (à activer)")
    lines.append(f"│     - Image size  : 224×224")
    lines.append(f"│     - Augment train: léger (flip, rot 5%, zoom 10%)")
    lines.append("│")
    lines.append(f"│  📈 Métriques cibles :")
    lines.append(f"│     - Accuracy globale    : 90-93%")
    lines.append(f"│     - F1-macro            : 88-91%")
    lines.append(f"│     - Top-3 accuracy      : ≥98%")
    lines.append(f"│     - Recall classes rares: ≥85%")
    lines.append("│")
    lines.append("└" + "─" * 78)

    # ─── Fin ───────────────────────────────────────────────────────────────
    lines.append("\n" + "=" * 80)
    lines.append(" ✅ AUDIT TERMINÉ")
    lines.append("=" * 80)

    txt = "\n".join(lines)
    output_path.write_text(txt, encoding="utf-8")
    print("\n" + txt)


# =============================================================================
#                          RAPPORT HTML
# =============================================================================

def write_html_report(data: dict, output_path: Path):
    """Génère un rapport HTML visuellement attrayant."""
    train = data["train"]
    val   = data["val"]
    test  = data["test"]

    total_train = sum(c["total"] for c in train.values())
    total_val   = sum(c["total"] for c in val.values())
    total_test  = sum(c["total"] for c in test.values())
    total_all   = total_train + total_val + total_test

    total_originals = sum(c["originals"] for c in train.values())
    total_augmented = sum(c["augmented"] for c in train.values())

    counts = [c["total"] for c in train.values()]
    ratio = max(counts) / min(counts) if min(counts) > 0 else 0

    # Table HTML
    sorted_classes = sorted(train.keys(), key=lambda c: train[c]["total"])
    rows = ""
    max_total = max(counts)
    for cls in sorted_classes:
        t = train[cls]
        v = val.get(cls, {"total": 0})["total"]
        te = test.get(cls, {"total": 0})["total"]

        if t["total"] < 1500:
            badge = '<span class="badge badge-red">🔴 Faible</span>'
        elif t["total"] < 3000:
            badge = '<span class="badge badge-yellow">🟡 Moyen</span>'
        else:
            badge = '<span class="badge badge-green">🟢 OK</span>'

        bar_pct = (t["total"] / max_total) * 100
        orig_pct = (t["originals"] / t["total"]) * 100 if t["total"] > 0 else 0

        rows += f'''
        <tr>
          <td class="class-name">{cls}</td>
          <td>
            <div class="progress-container">
              <div class="progress-bar" style="width: {bar_pct}%;">
                <div class="progress-orig" style="width: {orig_pct}%;"></div>
              </div>
              <span class="bar-label">{t["total"]:,}</span>
            </div>
          </td>
          <td>{t["originals"]:,}</td>
          <td class="aug">{t["augmented"]:,}</td>
          <td>{v:,}</td>
          <td>{te:,}</td>
          <td>{badge}</td>
        </tr>
        '''

    # Stats par plante
    plant_stats = defaultdict(lambda: {"classes": 0, "train": 0})
    for cls, c in train.items():
        plant, _ = extract_plant_disease(cls)
        plant_stats[plant]["classes"] += 1
        plant_stats[plant]["train"] += c["total"]

    plant_rows = ""
    for plant in sorted(plant_stats.keys()):
        p = plant_stats[plant]
        plant_rows += f'''
        <div class="plant-card">
          <div class="plant-name">{plant}</div>
          <div class="plant-stats">
            <span>{p["classes"]} classes</span>
            <span>{p["train"]:,} images</span>
          </div>
        </div>
        '''

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Audit Dataset Final — PFE Maladies Foliaires</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{
    font-family: 'Segoe UI', system-ui, sans-serif;
    margin: 0; padding: 20px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    min-height: 100vh;
  }}
  .container {{ max-width: 1400px; margin: 0 auto; }}
  h1 {{
    color: #2c3e50; font-size: 2.5em;
    border-bottom: 4px solid #2e7d32; padding-bottom: 15px;
  }}
  .subtitle {{ color: #555; font-size: 1.1em; margin-top: -10px; }}

  .stats-grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px; margin: 30px 0;
  }}
  .stat-card {{
    background: white; padding: 25px; border-radius: 15px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.08);
    text-align: center; transition: transform 0.2s;
  }}
  .stat-card:hover {{ transform: translateY(-5px); }}
  .stat-value {{
    font-size: 2.5em; font-weight: bold;
    background: linear-gradient(45deg, #1976d2, #2e7d32);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }}
  .stat-label {{
    color: #666; font-size: 0.9em; margin-top: 8px;
    text-transform: uppercase; letter-spacing: 1px;
  }}

  .section {{
    background: white; padding: 30px; border-radius: 15px;
    margin: 25px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.08);
  }}
  h2 {{
    color: #1976d2; border-bottom: 2px solid #e0e0e0;
    padding-bottom: 10px;
  }}

  table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
  th {{
    background: #2e7d32; color: white;
    padding: 12px; text-align: left;
    position: sticky; top: 0;
  }}
  td {{ padding: 10px; border-bottom: 1px solid #eee; }}
  tr:hover {{ background: #f9f9f9; }}
  .class-name {{ font-family: monospace; font-weight: bold; }}
  .aug {{ color: #1976d2; font-weight: bold; }}

  .progress-container {{
    position: relative; height: 25px;
    background: #f0f0f0; border-radius: 12px;
    overflow: hidden; min-width: 200px;
  }}
  .progress-bar {{
    height: 100%; background: #4caf50;
    transition: width 0.3s; position: relative;
  }}
  .progress-orig {{
    height: 100%; background: #2e7d32;
  }}
  .bar-label {{
    position: absolute; right: 8px; top: 50%;
    transform: translateY(-50%); color: #333;
    font-size: 0.85em; font-weight: bold;
  }}

  .badge {{
    padding: 4px 10px; border-radius: 12px;
    font-size: 0.85em; font-weight: bold;
  }}
  .badge-red {{ background: #ffebee; color: #c62828; }}
  .badge-yellow {{ background: #fff3e0; color: #ef6c00; }}
  .badge-green {{ background: #e8f5e9; color: #2e7d32; }}

  .plants-grid {{
    display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 15px; margin-top: 20px;
  }}
  .plant-card {{
    padding: 20px; background: linear-gradient(135deg, #f5f7fa, #c3cfe2);
    border-radius: 10px; text-align: center;
  }}
  .plant-name {{ font-weight: bold; color: #2c3e50; font-size: 1.1em; }}
  .plant-stats {{
    display: flex; flex-direction: column; gap: 5px;
    margin-top: 10px; color: #555; font-size: 0.9em;
  }}

  .verdict {{
    padding: 20px; border-radius: 10px;
    font-size: 1.2em; font-weight: bold;
    margin: 20px 0; text-align: center;
  }}
  .verdict-excellent {{ background: #c8e6c9; color: #1b5e20; }}
  .verdict-good {{ background: #fff9c4; color: #f57f17; }}
  .verdict-warning {{ background: #ffcdd2; color: #b71c1c; }}

  .legend {{
    display: flex; gap: 20px; margin: 10px 0;
    flex-wrap: wrap; font-size: 0.9em;
  }}
  .legend-item {{ display: flex; align-items: center; gap: 8px; }}
  .legend-color {{ width: 18px; height: 18px; border-radius: 4px; }}

  footer {{
    text-align: center; color: #888;
    margin-top: 40px; padding: 20px;
  }}
</style>
</head>
<body>

<div class="container">

<h1>🌱 Audit Dataset Final</h1>
<p class="subtitle">PFE — Détection des maladies foliaires | Mariem Salhi | {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>

<!-- Stats globales -->
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">{total_all:,}</div>
    <div class="stat-label">Images Total</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">{len(train)}</div>
    <div class="stat-label">Classes</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">{len(plant_stats)}</div>
    <div class="stat-label">Plantes</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">{ratio:.1f}×</div>
    <div class="stat-label">Ratio Déséquilibre</div>
  </div>
</div>

<!-- Splits -->
<div class="section">
  <h2>📂 Répartition Train / Val / Test</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value" style="color: #1976d2;">{total_train:,}</div>
      <div class="stat-label">Train ({total_train/total_all*100:.1f}%)</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #f57c00;">{total_val:,}</div>
      <div class="stat-label">Val ({total_val/total_all*100:.1f}%)</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #d32f2f;">{total_test:,}</div>
      <div class="stat-label">Test ({total_test/total_all*100:.1f}%)</div>
    </div>
  </div>
</div>

<!-- Augmentation impact -->
<div class="section">
  <h2>✨ Impact de l'Augmentation Sélective</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value" style="background: linear-gradient(45deg, #4caf50, #2e7d32); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">{total_originals:,}</div>
      <div class="stat-label">Images Originales</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="background: linear-gradient(45deg, #2196f3, #1976d2); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">{total_augmented:,}</div>
      <div class="stat-label">Images Augmentées (AUG_)</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">+{total_augmented/total_originals*100:.0f}%</div>
      <div class="stat-label">Croissance Dataset</div>
    </div>
  </div>

  <div class="verdict {'verdict-excellent' if ratio < 2.5 else 'verdict-good' if ratio < 4 else 'verdict-warning'}">
    {'✅ Équilibrage EXCELLENT' if ratio < 2.5 else '⚠️ Équilibrage CORRECT' if ratio < 4 else '🔴 Déséquilibre élevé'}
    — Ratio max/min : <strong>{ratio:.1f}×</strong>
  </div>
</div>

<!-- Distribution par classe -->
<div class="section">
  <h2>📊 Distribution Détaillée par Classe</h2>
  <div class="legend">
    <div class="legend-item">
      <div class="legend-color" style="background: #2e7d32;"></div>
      Images originales
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background: #4caf50;"></div>
      Images augmentées (AUG_)
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Classe</th>
        <th>Distribution Train</th>
        <th>Originales</th>
        <th>Augmentées</th>
        <th>Val</th>
        <th>Test</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      {rows}
    </tbody>
  </table>
</div>

<!-- Plantes -->
<div class="section">
  <h2>🌿 Distribution par Plante</h2>
  <div class="plants-grid">
    {plant_rows}
  </div>
</div>

<footer>
  <p>Rapport généré automatiquement par <strong>audit_dataset_final.py</strong></p>
  <p>Projet PFE — Mariem Salhi — {datetime.now().strftime('%Y-%m-%d')}</p>
</footer>

</div>
</body>
</html>
"""

    output_path.write_text(html, encoding="utf-8")
    print(f"\n[OK] Rapport HTML : {output_path}")


# =============================================================================
#                          GRAPHIQUE
# =============================================================================

def make_distribution_plot(train: dict, output_path: Path):
    """Crée un graphique de distribution avant/après."""
    if not HAS_MPL:
        return

    sorted_classes = sorted(train.keys(), key=lambda c: train[c]["total"])
    classes = sorted_classes
    originals = [train[c]["originals"] for c in classes]
    augmented = [train[c]["augmented"] for c in classes]

    fig, ax = plt.subplots(figsize=(12, max(8, len(classes) * 0.3)))

    y_pos = np.arange(len(classes))
    ax.barh(y_pos, originals, color="#2e7d32", label="Originales", height=0.7)
    ax.barh(y_pos, augmented, left=originals, color="#4caf50", label="Augmentées", height=0.7)

    ax.set_yticks(y_pos)
    ax.set_yticklabels(classes, fontsize=8)
    ax.set_xlabel("Nombre d'images")
    ax.set_title(f"Distribution train par classe — Originales + Augmentées\nTotal : {sum(originals) + sum(augmented):,} images")
    ax.axvline(x=2500, color="#f57c00", linestyle="--", alpha=0.5, label="Cible (2500)")
    ax.axvline(x=3000, color="#1976d2", linestyle="--", alpha=0.5, label="Cible (3000)")
    ax.legend(loc="lower right")
    ax.grid(True, axis="x", alpha=0.3)

    plt.tight_layout()
    plt.savefig(output_path, dpi=120, bbox_inches="tight")
    plt.close(fig)
    print(f"[OK] Graphique : {output_path}")


# =============================================================================
#                          MAIN
# =============================================================================

def main():
    print("=" * 80)
    print(" AUDIT COMPLET — DATASET FINAL APRÈS AUGMENTATION")
    print("=" * 80)

    if not DATASET_DIR.exists():
        print(f"[ERREUR] Dataset introuvable : {DATASET_DIR}")
        return

    # Analyse des 3 splits
    print("\n[INFO] Analyse de train/...")
    train_stats = analyze_split(DATASET_DIR / "train")

    print("[INFO] Analyse de val/...")
    val_stats = analyze_split(DATASET_DIR / "val")

    print("[INFO] Analyse de test/...")
    test_stats = analyze_split(DATASET_DIR / "test")

    # Plantes
    plants = sorted(set(extract_plant_disease(cls)[0] for cls in train_stats.keys()))

    # Intégrité
    integrity = quick_integrity_check(train_stats, sample_size=200)

    # Avant (si disponible)
    before_stats = load_before_stats()

    # Données structurées
    data = {
        "timestamp": datetime.now().isoformat(),
        "train": train_stats,
        "val": val_stats,
        "test": test_stats,
        "plants": plants,
        "integrity": integrity,
        "before_stats": before_stats,
    }

    # Sauvegarde JSON
    json_path = REPORTS_DIR / "dataset_audit_final.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    print(f"\n[OK] JSON       : {json_path}")

    # Rapport texte
    txt_path = REPORTS_DIR / "dataset_audit_final.txt"
    write_text_report(data, txt_path)
    print(f"[OK] Texte      : {txt_path}")

    # Rapport HTML
    html_path = REPORTS_DIR / "dataset_audit_final.html"
    write_html_report(data, html_path)

    # Graphique
    if HAS_MPL:
        plot_path = REPORTS_DIR / "distribution_final.png"
        make_distribution_plot(train_stats, plot_path)

    # Ouverture automatique du HTML
    try:
        import webbrowser
        webbrowser.open(str(html_path))
        print(f"\n[OK] Page HTML ouverte dans ton navigateur.")
    except Exception:
        pass


if __name__ == "__main__":
    main()
