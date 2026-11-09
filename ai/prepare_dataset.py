#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
 prepare_dataset.py
 -----------------------------------------------------------------------------
 Projet PFE  : Détection intelligente des maladies foliaires (Deep Learning)
 Objectif    : Transformer New_Dataset/ -> dataset_final/ (train/val/test)
 Compatible  : EfficientNetB0, ResNet50, MobileNetV2, CNN simple (224x224 RGB)

 Auteur      : Mariem Salhi
 Python      : >= 3.10
 Usage       : python prepare_dataset.py
================================================================================
"""

# =============================================================================
#                          PARAMÈTRES CONFIGURABLES
# =============================================================================

# --- CHEMINS (mis à jour vers le projet PFE) ---
RAW_DATASET_DIR    = r"C:\Users\user\Desktop\New_Dataset"
OUTPUT_DATASET_DIR = r"C:\Users\user\Desktop\PFE\ai\dataset_final"
REJECTED_DIR       = r"C:\Users\user\Desktop\PFE\ai\rejected"
REPORTS_DIR        = r"C:\Users\user\Desktop\PFE\ai\reports"

IMAGE_SIZE         = (224, 224)        # compatible EfficientNetB0/ResNet50/MobileNetV2
TRAIN_RATIO        = 0.70
VAL_RATIO          = 0.15
TEST_RATIO         = 0.15

BLUR_THRESHOLD     = 30.0              # mesuré sur région feuille uniquement
MIN_IMAGE_SIZE     = 128               # côté minimum (px)
DARK_THRESHOLD     = 35.0             # mesuré sur région feuille uniquement
BRIGHT_THRESHOLD   = 230.0            # mesuré sur région feuille uniquement

RANDOM_SEED        = 42

USE_AI_LEAF_FILTER = False             # désactivé (dataset PlantVillage, fond contrôlé)
AI_LEAF_CONFIDENCE = 0.15

OUTPUT_FORMAT      = "JPEG"
OUTPUT_QUALITY     = 92

EXCLUDE_CLASSES    = []
EXCLUDE_PLANTS     = []

PLANT_NAME_FIXES = {
    "Appel": "Apple",
}

DISEASE_NAME_FIXES = {
    # Tomato : préfixe "Tomato__" redondant dans les sous-dossiers
    "tomato__target_spot"                            : "target_spot",
    "tomato__bacterial_spot"                         : "bacterial_spot",
    "tomato__spider_mites_(two_spotted_spider_mite)" : "spider_mites_two_spotted_spider_mite",
    "tomato__septoria_leaf_spot"                     : "septoria_leaf_spot",
    "tomato__early_blight"                           : "early_blight",
    "tomato__late_blight"                            : "late_blight",
    "tomato__healthy"                                : "healthy",
    "tomato__yellow_leaf_curl_virus"                 : "yellow_leaf_curl_virus",

    # Potato : préfixe "Potato___" redondant + triple underscore
    "potato___late_blight"                           : "late_blight",
    "potato___healthy"                               : "healthy",
    "potato___early_blight"                          : "early_blight",

    # Corn : espaces → underscores
    "gray leaf spot"                                 : "gray_leaf_spot",
    "common rust"                                    : "common_rust",
    "northern_leaf_blight"                           : "northern_leaf_blight",

    # Cucumber : noms avec espaces ou majuscules
    "gummy stem blight"                              : "gummy_stem_blight",
    "powdery mildew"                                 : "powdery_mildew",
    "downy mildew"                                   : "downy_mildew",
    "healthy leaves"                                 : "healthy",
    "anthracnose"                                    : "anthracnose",

    # Groundnut : préfixe "groundnut_" redondant
    "groundnut_rust"                                 : "rust",
    "groundnut_early_leaf_spot"                      : "early_leaf_spot",
    "groundnut_late_leaf_spot"                       : "late_leaf_spot",
    "groundnut_nutrition_deficiency"                 : "nutrition_deficiency",
    "healthy_groundnut"                              : "healthy",

    # Majuscules seules
    "virus"                                          : "virus",
    "pest"                                           : "pest",

    # Anciens fixes conservés
    "als"                                            : "angular_leaf_spot",
    "healthy_leaves"                                 : "healthy",
}

# =============================================================================

import os
import sys
import json
import shutil
import random
import logging
import hashlib
import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Set
from collections import defaultdict

import numpy as np
import pandas as pd
import cv2
from PIL import Image, ImageOps, UnidentifiedImageError
from tqdm import tqdm


try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    HAS_MPL = True
except ImportError:
    HAS_MPL = False

LEAF_BACKEND = None
try:
    import tensorflow as tf
    from tensorflow.keras.applications.mobilenet_v2 import (
        MobileNetV2, preprocess_input, decode_predictions
    )
    LEAF_BACKEND = "tensorflow"
except ImportError:
    try:
        import torch
        from torchvision import models, transforms
        LEAF_BACKEND = "pytorch"
    except ImportError:
        LEAF_BACKEND = None

VALID_EXTS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")


# =============================================================================
#                                LOGGER
# =============================================================================

def setup_logger() -> logging.Logger:
    Path(REPORTS_DIR).mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("prepare_dataset")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    fmt = logging.Formatter("[%(asctime)s] %(levelname)s | %(message)s",
                            datefmt="%H:%M:%S")
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)
    logger.addHandler(ch)
    fh = logging.FileHandler(Path(REPORTS_DIR) / "prepare_dataset.log",
                             encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)
    return logger


log = setup_logger()

REJECTED_RECORDS: List[Dict] = []
SUMMARY_RECORDS:  List[Dict] = []
ERRORS:           List[str]  = []


def record_rejected(src: Path, class_name: str, reason: str) -> None:
    REJECTED_RECORDS.append({
        "source_path": str(src),
        "class": class_name,
        "reason": reason,
    })


# =============================================================================
#                              UTILS E/S
# =============================================================================

def list_images(folder: Path) -> List[Path]:
    return [p for p in folder.rglob("*")
            if p.is_file() and p.suffix.lower() in VALID_EXTS]


def safe_open_pil(path: Path) -> Optional[Image.Image]:
    try:
        img = Image.open(path)
        img.verify()
        img = Image.open(path)
        return img.convert("RGB")
    except (UnidentifiedImageError, OSError, Exception):
        return None


def safe_open_cv(path: Path) -> Optional[np.ndarray]:
    try:
        img = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if img is None or img.size == 0:
            return None
        return img
    except Exception:
        return None


def compute_leaf_mask(gray: np.ndarray,
                      bg_threshold: int = 30) -> Tuple[np.ndarray, float]:
    """
    Construit un masque binaire de la région feuille.
    Mesure la qualité UNIQUEMENT sur la feuille, sans dilution par le fond noir.
    Renvoie (mask, leaf_ratio).
    """
    mask       = gray > bg_threshold
    leaf_ratio = float(mask.sum()) / float(mask.size)
    return mask, leaf_ratio


def make_class_name(plant: str, disease: str) -> str:
    plant   = PLANT_NAME_FIXES.get(plant.strip(), plant.strip())
    plant_n = plant.replace(" ", "_")

    disease = (disease.strip().lower()
               .replace(" ", "_")
               .replace("-", "_"))

    plant_lower = plant_n.lower()
    disease = re.sub(r'^' + re.escape(plant_lower) + r'_+', '', disease)
    disease = DISEASE_NAME_FIXES.get(disease, disease)

    if (disease == "healthy"
            or disease.startswith("healthy_")
            or disease.endswith("_healthy")):
        disease = "healthy"

    disease = re.sub(r'[()]+', '', disease)
    disease = re.sub(r'_+', '_', disease).strip('_')

    return f"{plant_n}__{disease}"


def move_to_rejected(src: Path, class_name: str, reason: str,
                     rejected_root: Path) -> None:
    dst_dir = rejected_root / reason / class_name
    dst_dir.mkdir(parents=True, exist_ok=True)
    try:
        shutil.copy2(src, dst_dir / src.name)
    except Exception as e:
        ERRORS.append(f"copy reject failed {src}: {e}")
    record_rejected(src, class_name, reason)


# =============================================================================
#                        ÉTAPE 1 : ANALYSE DU DATASET
# =============================================================================

def analyze_dataset(raw_dir: Path) -> Dict[str, List[Path]]:
    log.info("=" * 70)
    log.info("ÉTAPE 1 — Analyse du dataset brut")
    log.info("=" * 70)

    if not raw_dir.exists():
        raise FileNotFoundError(f"Dossier introuvable : {raw_dir}")

    classes: Dict[str, List[Path]] = defaultdict(list)
    for plant_dir in sorted(p for p in raw_dir.iterdir() if p.is_dir()):
        if plant_dir.name in EXCLUDE_PLANTS:
            log.info(f"  [skip] plante exclue : {plant_dir.name}")
            continue
        for dis_dir in sorted(d for d in plant_dir.iterdir() if d.is_dir()):
            cname = make_class_name(plant_dir.name, dis_dir.name)
            if cname in EXCLUDE_CLASSES:
                log.info(f"  [skip] classe exclue : {cname}")
                continue
            classes[cname].extend(list_images(dis_dir))

    total = sum(len(v) for v in classes.values())
    log.info(f"  Classes détectées : {len(classes)}")
    log.info(f"  Total images      : {total}")
    for c, paths in sorted(classes.items(), key=lambda x: -len(x[1])):
        log.info(f"    - {c:<50s} {len(paths):>6d}")
    return dict(classes)


# =============================================================================
#                  ÉTAPE 2 : CONTRÔLES QUALITÉ PAR IMAGE
# =============================================================================

def is_corrupted(path: Path) -> bool:
    return safe_open_pil(path) is None


def too_small(path: Path) -> bool:
    img = safe_open_cv(path)
    if img is None:
        return True
    h, w = img.shape[:2]
    return min(h, w) < MIN_IMAGE_SIZE


def is_blurry(img: np.ndarray) -> bool:
    """
    Détecte le flou EXTRÊME uniquement (images inutilisables).
    Utilise 2 tests combinés pour éviter les faux positifs sur feuilles uniformes.
    Rejet seulement si Laplacien < 8 ET ratio contours Canny < 2%.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # TEST 1 : Variance du Laplacien (hautes fréquences)
    mask = gray > 30
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    laplacian_var = float(laplacian[mask].var()) if mask.any() else 0.0

    # TEST 2 : Détection de contours (Canny)
    edges = cv2.Canny(gray, 50, 150)
    edge_ratio = np.count_nonzero(edges) / edges.size

    # Rejet seulement si LES DEUX tests échouent
    return laplacian_var < 8.0 and edge_ratio < 0.02


def brightness_problem(path: Path) -> Optional[str]:
    """
    Détection too_dark / too_bright : luminosité moyenne calculée UNIQUEMENT
    sur la région feuille. Évite les faux positifs sur fond noir.
    """
    img = safe_open_cv(path)
    if img is None:
        return "corrupted"
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mask, leaf_ratio = compute_leaf_mask(gray)
    if leaf_ratio < 0.05:
        return "too_dark"
    mean = float(gray[mask].mean())
    if mean < DARK_THRESHOLD:
        return "too_dark"
    if mean > BRIGHT_THRESHOLD:
        return "too_bright"
    return None


def quality_check(path: Path) -> Optional[str]:
    """Renvoie None si OK, sinon la raison du rejet."""
    if is_corrupted(path):
        return "corrupted"
    if too_small(path):
        return "too_small"
    b = brightness_problem(path)
    if b:
        return b
    return None


# =============================================================================
#                       ÉTAPE 3 : DÉTECTION DOUBLONS
# =============================================================================

def find_duplicates(paths: List[Path]) -> Set[Path]:
    """Détecte doublons exacts uniquement via MD5 (byte-par-byte)."""
    log.info("Détection des doublons (MD5 exact match)...")
    duplicates: Set[Path] = set()
    seen: Dict[str, Path] = {}
    for p in tqdm(paths, desc="md5"):
        try:
            h = hashlib.md5(p.read_bytes()).hexdigest()
        except Exception:
            continue
        if h in seen:
            duplicates.add(p)
        else:
            seen[h] = p
    log.info(f"  -> {len(duplicates)} doublons exacts détectés")
    return duplicates


# =============================================================================
#               ÉTAPE 4 : FILTRE IA FEUILLE / NON-FEUILLE (CNN)
# =============================================================================

PLANT_KEYWORDS = {
    "leaf", "plant", "tree", "vine", "fern", "moss", "ivy", "flower",
    "broccoli", "cabbage", "lettuce", "spinach", "corn", "fig",
}
NON_LEAF_KEYWORDS = {
    "person", "people", "face", "man", "woman", "dog", "cat", "car",
}


class LeafFilter:
    def __init__(self):
        self.backend = LEAF_BACKEND
        self.model   = None
        if not USE_AI_LEAF_FILTER or self.backend is None:
            log.warning("Filtre IA désactivé.")
            return
        if self.backend == "tensorflow":
            log.info("Chargement MobileNetV2 (TensorFlow)...")
            self.model = MobileNetV2(weights="imagenet")
        else:
            log.info("Chargement MobileNetV2 (PyTorch)...")
            self.model = models.mobilenet_v2(weights="IMAGENET1K_V2").eval()
            self._tf = transforms.Compose([
                transforms.Resize(256), transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                     std=[0.229, 0.224, 0.225]),
            ])

    def is_leaf(self, path: Path) -> bool:
        if self.model is None:
            return True
        img = safe_open_pil(path)
        if img is None:
            return False
        try:
            if self.backend == "tensorflow":
                arr    = np.expand_dims(np.array(img.resize((224, 224))).astype("float32"), 0)
                arr    = preprocess_input(arr)
                preds  = self.model.predict(arr, verbose=0)
                decoded = decode_predictions(preds, top=5)[0]
                names  = [d[1].lower() for d in decoded]
                probs  = [float(d[2]) for d in decoded]
            else:
                x = self._tf(img).unsqueeze(0)
                with torch.no_grad():
                    out = self.model(x)
                p    = torch.nn.functional.softmax(out[0], dim=0)
                top5 = torch.topk(p, 5)
                names = ["" for _ in top5.indices.tolist()]
                probs = top5.values.tolist()

            plant_score = sum(pr for n, pr in zip(names, probs)
                              if any(k in n for k in PLANT_KEYWORDS))
            non_score   = sum(pr for n, pr in zip(names, probs)
                              if any(k in n for k in NON_LEAF_KEYWORDS))
            return plant_score >= AI_LEAF_CONFIDENCE and non_score < 0.5
        except Exception as e:
            ERRORS.append(f"AI filter {path.name}: {e}")
            return True


# =============================================================================
#                ÉTAPE 5 : NORMALISATION (RGB + 224x224 + JPG)
# =============================================================================

def normalize_and_save(src: Path, dst: Path) -> bool:
    img = safe_open_pil(src)
    if img is None:
        return False
    try:
        img = ImageOps.exif_transpose(img)   # corrige orientation EXIF
        img = img.convert("RGB")             # garantit 3 canaux RGB
        img = img.resize(IMAGE_SIZE, Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        img.save(dst, format=OUTPUT_FORMAT,
                 quality=OUTPUT_QUALITY, optimize=True)
        return True
    except Exception as e:
        ERRORS.append(f"normalize {src.name}: {e}")
        return False


# =============================================================================
#                       ÉTAPE 6 : SPLIT TRAIN/VAL/TEST
# =============================================================================

def split_paths(paths: List[Path]) -> Tuple[List[Path], List[Path], List[Path]]:
    """Split reproductible 70/15/15 (par classe -> stratification implicite)."""
    rng   = random.Random(RANDOM_SEED)
    paths = list(paths)
    rng.shuffle(paths)
    n    = len(paths)
    n_tr = int(n * TRAIN_RATIO)
    n_va = int(n * VAL_RATIO)
    return paths[:n_tr], paths[n_tr:n_tr + n_va], paths[n_tr + n_va:]


# =============================================================================
#                              ÉTAPE 7 : RAPPORTS
# =============================================================================

def write_csv_reports(out_root: Path, reports_dir: Path) -> Dict:
    reports_dir.mkdir(parents=True, exist_ok=True)

    df_summary = pd.DataFrame(SUMMARY_RECORDS)
    df_summary.to_csv(reports_dir / "dataset_summary.csv", index=False)

    df_rej = pd.DataFrame(REJECTED_RECORDS)
    df_rej.to_csv(reports_dir / "rejected_images.csv", index=False)

    rows = []
    for split in ("train", "val", "test"):
        sd = out_root / split
        if not sd.exists():
            continue
        for cd in sd.iterdir():
            if cd.is_dir():
                rows.append({
                    "class": cd.name,
                    "split": split,
                    "count": len(list_images(cd)),
                })
    df_dist = pd.DataFrame(rows)
    df_dist.to_csv(reports_dir / "class_distribution.csv", index=False)

    return {"summary": df_summary, "rejected": df_rej, "distribution": df_dist}


def write_text_report(reports_dir: Path, total_before: int,
                      df_dist: pd.DataFrame, df_rej: pd.DataFrame) -> None:
    total_after = int(df_dist["count"].sum()) if not df_dist.empty else 0
    removed     = len(df_rej)
    by_reason   = df_rej["reason"].value_counts().to_dict() if not df_rej.empty else {}

    totals      = df_dist.groupby("class")["count"].sum() if not df_dist.empty else pd.Series(dtype=int)
    median      = totals.median() if len(totals) else 0
    weak_classes = totals[totals < max(50, median / 3)].index.tolist() if len(totals) else []
    imbalanced   = totals[totals * 3 < median].index.tolist() if len(totals) else []

    lines = ["=" * 72,
             " RAPPORT DE NETTOYAGE — Dataset PFE (maladies foliaires)",
             "=" * 72,
             f"Total images AVANT  nettoyage : {total_before}",
             f"Total images APRES  nettoyage : {total_after}",
             f"Images supprimees             : {removed}",
             "-" * 72,
             "Raisons de suppression :"]

    if by_reason:
        for r, n in sorted(by_reason.items(), key=lambda x: -x[1]):
            lines.append(f"  - {r:<20s} {n:>6d}")
    else:
        lines.append("  (aucune)")

    lines += ["-" * 72, f"Classes finales : {len(totals)}"]
    if len(totals):
        lines.append(f"{'Classe':<45}{'train':>8}{'val':>8}{'test':>8}{'total':>8}")
        for c in sorted(totals.index):
            sub = df_dist[df_dist["class"] == c].set_index("split")["count"].to_dict()
            tr  = sub.get("train", 0)
            va  = sub.get("val",   0)
            te  = sub.get("test",  0)
            lines.append(f"{c:<45}{tr:>8}{va:>8}{te:>8}{tr+va+te:>8}")

    lines += ["-" * 72,
              "Classes faibles :"]
    lines += [f"  - {c}" for c in weak_classes] or ["  (aucune)"]
    lines += ["Classes desequilibrees :"]
    lines += [f"  - {c}" for c in imbalanced]  or ["  (aucune)"]
    lines += ["-" * 72,
              "Recommandations :",
              "  * Completer les classes faibles (collecte ou data augmentation).",
              "  * Verifier visuellement rejected/ (faux positifs eventuels).",
              "  * Si desequilibre fort : utiliser class_weight ou oversampling.",
              "=" * 72]

    txt = "\n".join(lines)
    with open(reports_dir / "cleaning_report.txt", "w", encoding="utf-8") as f:
        f.write(txt)
    log.info("\n" + txt)


def write_plots(reports_dir: Path, df_dist: pd.DataFrame) -> None:
    if not HAS_MPL or df_dist.empty:
        return
    plots_dir = reports_dir / "plots"
    plots_dir.mkdir(exist_ok=True)

    totals = df_dist.groupby("class")["count"].sum().sort_values(ascending=True)
    fig, ax = plt.subplots(figsize=(10, max(4, len(totals) * 0.3)))
    totals.plot(kind="barh", ax=ax, color="#2e7d32")
    ax.set_xlabel("Nombre d'images")
    ax.set_title("Distribution totale par classe (après nettoyage)")
    plt.tight_layout()
    plt.savefig(plots_dir / "class_distribution_total.png", dpi=110)
    plt.close(fig)

    pivot = df_dist.pivot_table(index="class", columns="split",
                                values="count", fill_value=0)
    pivot = pivot.reindex(columns=["train", "val", "test"], fill_value=0)
    fig, ax = plt.subplots(figsize=(11, max(4, len(pivot) * 0.3)))
    pivot.plot(kind="barh", stacked=True, ax=ax,
               color=["#1976d2", "#fbc02d", "#d32f2f"])
    ax.set_xlabel("Nombre d'images")
    ax.set_title("Répartition train / val / test par classe")
    plt.tight_layout()
    plt.savefig(plots_dir / "class_distribution_split.png", dpi=110)
    plt.close(fig)


# =============================================================================
#                                 MAIN
# =============================================================================

def main():
    raw_dir      = Path(RAW_DATASET_DIR)
    out_dir      = Path(OUTPUT_DATASET_DIR)
    rejected_dir = Path(REJECTED_DIR)
    reports_dir  = Path(REPORTS_DIR)

    for d in (out_dir, rejected_dir):
        if d.exists():
            log.warning(f"Suppression de l'ancien : {d}")
            shutil.rmtree(d, ignore_errors=True)   # ignore_errors : contourne les locks Windows
            if d.exists():                          # si encore présent (antivirus), on vide manuellement
                for item in d.rglob("*"):
                    try:
                        if item.is_file():
                            item.unlink()
                    except Exception:
                        pass
        d.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)

    classes = analyze_dataset(raw_dir)
    if not classes:
        log.error("Aucune classe trouvée.")
        sys.exit(1)
    total_before = sum(len(p) for p in classes.values())

    leaf_filter = LeafFilter() if USE_AI_LEAF_FILTER else None

    log.info("=" * 70)
    log.info("ÉTAPES 2-5 — Qualité / Doublons / Filtre IA / Normalisation / Split")
    log.info("=" * 70)

    for class_name, paths in classes.items():
        log.info(f"\n>>> {class_name}  ({len(paths)} images)")

        # 2. Qualité + 3. Doublons  (par batch si classe volumineuse)
        valid: List[Path] = []
        _BATCH_SIZE = 3000

        if len(paths) > 4000:
            n_batches = (len(paths) - 1) // _BATCH_SIZE + 1
            log.info(f"  Classe volumineuse ({len(paths)}) → traitement par batch de {_BATCH_SIZE} ({n_batches} batches)")
            for _bi, _start in enumerate(range(0, len(paths), _BATCH_SIZE), 1):
                _batch = paths[_start:_start + _BATCH_SIZE]
                _batch_valid: List[Path] = []
                for p in tqdm(_batch, desc=f"quality [{_bi}/{n_batches}]"):
                    reason = quality_check(p)
                    if reason:
                        move_to_rejected(p, class_name, reason, rejected_dir)
                    else:
                        _batch_valid.append(p)
                _dups = find_duplicates(_batch_valid)
                for p in _dups:
                    move_to_rejected(p, class_name, "duplicate", rejected_dir)
                valid.extend(p for p in _batch_valid if p not in _dups)
            log.info(f"  Valides après qualité+doublons (batches) : {len(valid)}")
        else:
            for p in tqdm(paths, desc="quality"):
                reason = quality_check(p)
                if reason:
                    move_to_rejected(p, class_name, reason, rejected_dir)
                else:
                    valid.append(p)
            log.info(f"  Valides après qualité : {len(valid)}")
            # 3. Doublons (classe normale)
            dups = find_duplicates(valid)
            for p in dups:
                move_to_rejected(p, class_name, "duplicate", rejected_dir)
            valid = [p for p in valid if p not in dups]

        # 4. Filtre IA
        if leaf_filter is not None and leaf_filter.model is not None:
            kept: List[Path] = []
            for p in tqdm(valid, desc="leaf-AI"):
                if leaf_filter.is_leaf(p):
                    kept.append(p)
                else:
                    move_to_rejected(p, class_name, "non_leaf", rejected_dir)
            valid = kept
            log.info(f"  Valides après IA      : {len(valid)}")

        if not valid:
            log.warning(f"  Aucune image retenue pour {class_name} -> skip")
            continue

        # 5. Split 70/15/15
        train, val, test = split_paths(valid)

        # 6. Normalisation + sauvegarde
        for split_name, split_list in (("train", train), ("val", val), ("test", test)):
            for i, src in enumerate(split_list, 1):
                fname = f"{class_name}_{i:04d}.jpg"
                dst   = out_dir / split_name / class_name / fname
                if normalize_and_save(src, dst):
                    SUMMARY_RECORDS.append({
                        "class"       : class_name,
                        "split"       : split_name,
                        "source_path" : str(src),
                        "final_path"  : str(dst),
                    })
        log.info(f"  -> train={len(train)}  val={len(val)}  test={len(test)}")

    # 7. Rapports
    log.info("=" * 70)
    log.info("ÉTAPE 7 — Génération des rapports")
    log.info("=" * 70)

    dfs = write_csv_reports(out_dir, reports_dir)
    write_text_report(reports_dir, total_before, dfs["distribution"], dfs["rejected"])
    write_plots(reports_dir, dfs["distribution"])

    log.info(f"\n[OK] Dataset final : {out_dir.resolve()}")
    log.info(f"[OK] Rapports      : {reports_dir.resolve()}")
    log.info(f"[OK] Rejets        : {rejected_dir.resolve()}")


if __name__ == "__main__":
    main()
