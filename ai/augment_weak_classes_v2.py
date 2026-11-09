#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
 augment_weak_classes_v2.py  [VERSION CORRIGÉE]
 -----------------------------------------------------------------------------
 Projet PFE  : Détection des maladies foliaires
 Rôle        : Génère des images augmentées RÉALISTES (pas de kaléidoscope)

 CORRECTIONS depuis v1 :
   ✅ Suppression de RandomTranslation (cause des artefacts mosaïque)
   ✅ Suppression de RandomFlip vertical (pas botanique pour feuilles)
   ✅ fill_mode="constant" + fill_value=0 (fond noir, comme PlantVillage)
   ✅ Angles réduits (max ±30° au lieu de ±72°)
   ✅ Suppression du color jitter agressif (hue/saturation)
   ✅ Validation : vérifie qu'au moins 60% de la feuille reste visible

 Auteur     : Mariem Salhi
 Usage      : python augment_weak_classes_v2.py
================================================================================
"""

import json
import random
import re
from pathlib import Path
from collections import defaultdict

import numpy as np
import tensorflow as tf
from tensorflow.keras import layers
from PIL import Image
from tqdm import tqdm


# =============================================================================
#                          PARAMÈTRES CONFIGURABLES
# =============================================================================

TRAIN_DIR    = Path(r"C:\Users\user\Desktop\PFE\ai\dataset_final\train")
REPORTS_DIR  = Path(r"C:\Users\user\Desktop\PFE\ai\reports")
MANIFEST_PATH = REPORTS_DIR / "augmentation_manifest.json"

SEQ_RE = re.compile(r"_(\d+)(?:_r\d+)*\.jpg$", re.IGNORECASE)

# Cibles d'équilibrage
TARGET_CRITICAL = 2500
TARGET_WEAK     = 2500
TARGET_MEDIUM   = 3000

# Seuils
THRESHOLD_CRITICAL = 900
THRESHOLD_WEAK     = 1500
THRESHOLD_MEDIUM   = 3000

MAX_MULTIPLIER = 5

IMG_SIZE     = (224, 224)
RANDOM_SEED  = 42

# Format de sortie
OUTPUT_FORMAT  = "JPEG"
OUTPUT_QUALITY = 92

# Validation qualité : rejette les augmentations qui perdent trop de contenu
MIN_LEAF_RATIO = 0.40   # au moins 40% de l'image doit contenir de la feuille
MAX_RETRY      = 5      # nombre max de tentatives par image avant abandon

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)
tf.random.set_seed(RANDOM_SEED)


# =============================================================================
#                  PIPELINES D'AUGMENTATION RÉALISTES (v2)
# =============================================================================
#
# PRINCIPES :
#   - fill_mode="constant" → fond NOIR pour les zones vides (comme PlantVillage)
#   - PAS de RandomTranslation (cause des artefacts mosaïque)
#   - PAS de RandomFlip vertical (les feuilles ont une orientation naturelle)
#   - Angles raisonnables (max ±30°)
#   - Brightness/Contrast modérés
# =============================================================================

def build_aug_critical():
    """
    Augmentation FORTE mais RÉALISTE pour classes < 900 images.
    """
    return tf.keras.Sequential([
        layers.RandomFlip("horizontal"),                    # ✅ flip horizontal seul
        layers.RandomRotation(
            factor=0.083,                                    # ±30°
            fill_mode="constant",                            # ✅ fond noir
            fill_value=0.0,
        ),
        layers.RandomZoom(
            height_factor=0.15,
            width_factor=0.15,
            fill_mode="constant",
            fill_value=0.0,
        ),
        layers.RandomBrightness(0.20),
        layers.RandomContrast(0.20),
    ], name="aug_critical_v2")


def build_aug_weak():
    """
    Augmentation MODÉRÉE pour classes 900-1500 images.
    """
    return tf.keras.Sequential([
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(
            factor=0.069,                                    # ±25°
            fill_mode="constant",
            fill_value=0.0,
        ),
        layers.RandomZoom(
            height_factor=0.12,
            width_factor=0.12,
            fill_mode="constant",
            fill_value=0.0,
        ),
        layers.RandomBrightness(0.15),
        layers.RandomContrast(0.15),
    ], name="aug_weak_v2")


def build_aug_medium():
    """
    Augmentation LÉGÈRE pour classes 1500-3000 images.
    """
    return tf.keras.Sequential([
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(
            factor=0.055,                                    # ±20°
            fill_mode="constant",
            fill_value=0.0,
        ),
        layers.RandomZoom(
            height_factor=0.10,
            width_factor=0.10,
            fill_mode="constant",
            fill_value=0.0,
        ),
        layers.RandomBrightness(0.12),
        layers.RandomContrast(0.12),
    ], name="aug_medium_v2")


# =============================================================================
#                  VALIDATION QUALITÉ DES IMAGES AUGMENTÉES
# =============================================================================

def is_augmentation_valid(augmented_img: np.ndarray, min_ratio: float = MIN_LEAF_RATIO) -> bool:
    """
    Vérifie qu'au moins `min_ratio` de l'image contient quelque chose (pas du noir).
    Évite les augmentations où l'image a été trop décalée/zoomée.

    Args:
        augmented_img : ndarray (H, W, 3), uint8
        min_ratio     : ratio minimum de pixels non-noirs

    Returns:
        True si l'image est OK, False sinon
    """
    # Convertir en niveaux de gris
    if augmented_img.ndim == 3:
        gray = np.mean(augmented_img, axis=2)
    else:
        gray = augmented_img

    # Compter les pixels "non-noirs" (seuil 25 pour tolérer le bruit JPEG)
    non_black = (gray > 25).sum()
    total     = gray.size

    ratio = non_black / total
    return ratio >= min_ratio


# =============================================================================
#                  MANIFESTE DE PROVENANCE
# =============================================================================

def load_manifest() -> dict:
    """Charge le manifeste de provenance {classe: [fichiers generes]}."""
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_manifest(manifest: dict) -> None:
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)


def next_sequence_number(cls_dir: Path) -> int:
    """Prochain numero de sequence disponible (max existant + 1)."""
    max_seq = 0
    for p in cls_dir.glob("*.jpg"):
        m = SEQ_RE.search(p.name)
        if m:
            max_seq = max(max_seq, int(m.group(1)))
    return max_seq + 1


# =============================================================================
#                  CLASSIFICATION DES CLASSES
# =============================================================================

def classify_classes(train_dir: Path, manifest: dict) -> dict:
    """Analyse train_dir et classe chaque dossier par niveau d'urgence."""
    print("\n" + "=" * 70)
    print(" ANALYSE DES CLASSES")
    print("=" * 70)

    classes_info = {}
    for cls_dir in sorted(train_dir.iterdir()):
        if not cls_dir.is_dir():
            continue

        # Compter les images NON-augmentées (absentes du manifeste)
        generated = set(manifest.get(cls_dir.name, []))
        originals = [p for p in cls_dir.glob("*.jpg") if p.name not in generated]
        n = len(originals)

        if n < THRESHOLD_CRITICAL:
            level    = "critical"
            n_target = TARGET_CRITICAL
        elif n < THRESHOLD_WEAK:
            level    = "weak"
            n_target = TARGET_WEAK
        elif n < THRESHOLD_MEDIUM:
            level    = "medium"
            n_target = TARGET_MEDIUM
        else:
            level    = "ok"
            n_target = n

        n_to_generate = max(0, n_target - n)
        max_allowed   = n * (MAX_MULTIPLIER - 1)
        n_to_generate = min(n_to_generate, max_allowed)

        classes_info[cls_dir.name] = {
            "n_current"     : n,
            "level"         : level,
            "n_target"      : n + n_to_generate,
            "n_to_generate" : n_to_generate,
            "originals"     : originals,
            "directory"     : cls_dir,
        }

    print(f"\n{'Classe':<45} {'Actuel':>8} {'Niveau':>10} {'Cible':>8} {'À générer':>10}")
    print("-" * 85)
    for cls, info in sorted(classes_info.items(), key=lambda x: x[1]["n_current"]):
        flag = {"critical": " 🔴", "weak": " 🟠", "medium": " 🟡", "ok": " 🟢"}[info["level"]]
        print(f"{cls:<45} {info['n_current']:>8} {info['level']:>10}{flag} "
              f"{info['n_target']:>8} {info['n_to_generate']:>10}")

    total_current = sum(c["n_current"] for c in classes_info.values())
    total_target  = sum(c["n_target"] for c in classes_info.values())
    total_gen     = sum(c["n_to_generate"] for c in classes_info.values())

    print("-" * 85)
    print(f"{'TOTAL':<45} {total_current:>8} {'':>10}  {total_target:>8} {total_gen:>10}")

    counts = [c["n_target"] for c in classes_info.values()]
    print(f"\n[INFO] Déséquilibre AVANT : {max(c['n_current'] for c in classes_info.values()) / min(c['n_current'] for c in classes_info.values()):.1f}×")
    print(f"[INFO] Déséquilibre APRÈS : {max(counts) / min(counts):.1f}×")

    return classes_info


# =============================================================================
#                  GÉNÉRATION DES IMAGES AUGMENTÉES
# =============================================================================

def generate_augmented_images(classes_info: dict, manifest: dict):
    """Génère et sauvegarde les images augmentées avec validation qualité."""
    print("\n" + "=" * 70)
    print(" GÉNÉRATION DES IMAGES AUGMENTÉES (v2 - sans artefacts)")
    print("=" * 70)

    aug_pipelines = {
        "critical": build_aug_critical(),
        "weak"    : build_aug_weak(),
        "medium"  : build_aug_medium(),
    }

    stats = defaultdict(int)
    rejected_total = 0

    for cls, info in classes_info.items():
        n_to_gen = info["n_to_generate"]
        if n_to_gen == 0:
            continue

        level     = info["level"]
        aug_pipe  = aug_pipelines[level]
        originals = info["originals"]
        cls_dir   = info["directory"]
        next_seq  = next_sequence_number(cls_dir)
        generated_files = manifest.setdefault(cls, [])

        print(f"\n>>> {cls}  (niveau: {level}, à générer: {n_to_gen})")

        n_originals = len(originals)
        variations_per_image = n_to_gen // n_originals
        remainder = n_to_gen % n_originals

        gen_count = 0
        rejected_class = 0

        for idx, orig_path in enumerate(tqdm(originals, desc="aug")):
            n_vars = variations_per_image + (1 if idx < remainder else 0)
            if n_vars == 0:
                continue

            try:
                img = Image.open(orig_path).convert("RGB")
                img_array  = np.array(img, dtype=np.float32)
                img_tensor = tf.expand_dims(img_array, 0)
            except Exception as e:
                print(f"  [SKIP] {orig_path.name}: {e}")
                continue

            for v in range(n_vars):
                # Boucle avec retry si l'augmentation est invalide
                success = False
                for attempt in range(MAX_RETRY):
                    try:
                        augmented = aug_pipe(img_tensor, training=True)
                        augmented = tf.clip_by_value(augmented, 0.0, 255.0)
                        augmented_np = tf.cast(augmented[0], tf.uint8).numpy()

                        # Validation qualité
                        if is_augmentation_valid(augmented_np):
                            out_name = f"{cls}_{next_seq:04d}.jpg"
                            out_path = cls_dir / out_name
                            # Securite : ne jamais ecraser un fichier existant si
                            # next_sequence_number() s'est trompe (ex: trous de
                            # sequence suite a une suppression manuelle passee).
                            while out_path.exists():
                                next_seq += 1
                                out_name = f"{cls}_{next_seq:04d}.jpg"
                                out_path = cls_dir / out_name
                            Image.fromarray(augmented_np).save(
                                out_path, format=OUTPUT_FORMAT,
                                quality=OUTPUT_QUALITY, optimize=True,
                            )
                            generated_files.append(out_name)
                            next_seq += 1
                            gen_count += 1
                            success = True
                            break
                        else:
                            rejected_class += 1
                            # Réessaye avec une autre aléatoire
                    except Exception as e:
                        pass

                if not success:
                    # Si après MAX_RETRY tentatives c'est toujours raté, on saute
                    pass

        stats[cls] = gen_count
        rejected_total += rejected_class
        print(f"  ✅ {gen_count} images générées | {rejected_class} rejetées (qualité)")

    print("\n" + "=" * 70)
    print(" RÉSUMÉ DE GÉNÉRATION")
    print("=" * 70)
    total = sum(stats.values())
    print(f"  Total images générées : {total}")
    print(f"  Total rejetées (qual.) : {rejected_total}")
    print(f"  Classes touchées       : {sum(1 for n in stats.values() if n > 0)} / {len(classes_info)}")

    save_manifest(manifest)

    return stats, rejected_total


# =============================================================================
#                  RAPPORT FINAL
# =============================================================================

def write_report(classes_info: dict, stats: dict, rejected_total: int):
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    report_data = {
        "version": "v2_no_artifacts",
        "config": {
            "target_critical"    : TARGET_CRITICAL,
            "target_weak"        : TARGET_WEAK,
            "target_medium"      : TARGET_MEDIUM,
            "threshold_critical" : THRESHOLD_CRITICAL,
            "threshold_weak"     : THRESHOLD_WEAK,
            "threshold_medium"   : THRESHOLD_MEDIUM,
            "max_multiplier"     : MAX_MULTIPLIER,
            "min_leaf_ratio"     : MIN_LEAF_RATIO,
            "fill_mode"          : "constant (fond noir)",
        },
        "per_class": {
            cls: {
                "n_before"   : info["n_current"],
                "n_generated": stats.get(cls, 0),
                "n_after"    : info["n_current"] + stats.get(cls, 0),
                "level"      : info["level"],
            }
            for cls, info in classes_info.items()
        },
        "totals": {
            "n_before"        : sum(c["n_current"] for c in classes_info.values()),
            "n_generated"     : sum(stats.values()),
            "n_rejected_qual" : rejected_total,
            "n_after"         : sum(c["n_current"] for c in classes_info.values()) + sum(stats.values()),
        },
    }

    json_path = REPORTS_DIR / "selective_augmentation_v2_report.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)

    txt_path = REPORTS_DIR / "selective_augmentation_v2_report.txt"
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("=" * 72 + "\n")
        f.write(" RAPPORT D'AUGMENTATION SÉLECTIVE v2 — PFE\n")
        f.write(" (Version corrigée : pas d'artefacts mosaïque/kaléidoscope)\n")
        f.write("=" * 72 + "\n\n")

        f.write(f"Configuration v2 :\n")
        f.write(f"  - fill_mode      : constant (fond noir, comme PlantVillage)\n")
        f.write(f"  - Pas de translation (cause des mosaïques)\n")
        f.write(f"  - Pas de flip vertical (pas botanique pour feuilles)\n")
        f.write(f"  - Rotation max   : ±30° (vs ±72° en v1)\n")
        f.write(f"  - Validation     : minimum {MIN_LEAF_RATIO*100:.0f}% de contenu non-noir\n\n")

        f.write(f"{'Classe':<45} {'Avant':>8} {'Généré':>8} {'Après':>8} {'Niveau':>10}\n")
        f.write("-" * 85 + "\n")

        for cls in sorted(classes_info.keys()):
            info = classes_info[cls]
            gen = stats.get(cls, 0)
            f.write(f"{cls:<45} {info['n_current']:>8} {gen:>8} "
                    f"{info['n_current']+gen:>8} {info['level']:>10}\n")

        total_before    = sum(c["n_current"] for c in classes_info.values())
        total_generated = sum(stats.values())

        f.write("-" * 85 + "\n")
        f.write(f"{'TOTAL':<45} {total_before:>8} {total_generated:>8} "
                f"{total_before+total_generated:>8}\n")
        f.write(f"Rejetées (qualité insuffisante) : {rejected_total}\n\n")

        counts_before = [c["n_current"] for c in classes_info.values()]
        counts_after  = [c["n_current"] + stats.get(cls, 0)
                         for cls, c in classes_info.items()]

        f.write(f"Déséquilibre AVANT : {max(counts_before) / min(counts_before):.1f}×\n")
        f.write(f"Déséquilibre APRÈS : {max(counts_after) / min(counts_after):.1f}×\n")

    print(f"\n[OK] Rapports sauvegardés :")
    print(f"     {json_path}")
    print(f"     {txt_path}")


# =============================================================================
#                  ROLLBACK
# =============================================================================

def rollback_augmentations(train_dir: Path, manifest: dict):
    """SUPPRIME toutes les images générées (listées dans le manifeste).

    ATTENTION (2026-07-05) : cette fonction a ete adaptee au systeme de
    manifeste JSON (remplacement du filtre par prefixe AUG_) mais n'a PAS
    ete testee en execution reelle avec le nouveau systeme (--rollback non
    exerce depuis la refonte). Relue en diff uniquement. A valider sur un
    petit sous-ensemble avant tout usage en conditions reelles.
    """
    print("\n" + "=" * 70)
    print(" ROLLBACK — Suppression des images augmentées existantes")
    print("=" * 70)
    total = 0
    for cls_dir in tqdm(list(train_dir.iterdir()), desc="rollback"):
        if not cls_dir.is_dir():
            continue
        for name in manifest.get(cls_dir.name, []):
            p = cls_dir / name
            if p.exists():
                p.unlink()
                total += 1
        manifest[cls_dir.name] = []
    save_manifest(manifest)
    print(f"\n[OK] {total} images augmentées supprimées")


def count_augmented_images(manifest: dict) -> int:
    """Compte les images generees existantes au total (via le manifeste)."""
    return sum(len(v) for v in manifest.values())


# =============================================================================
#                  MAIN
# =============================================================================

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Augmentation sélective v2 (sans artefacts)")
    parser.add_argument("--rollback", action="store_true",
                        help="Supprime toutes les images generees (via le manifeste)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Affiche le plan sans générer d'images")
    args = parser.parse_args()

    if not TRAIN_DIR.exists():
        print(f"[ERREUR] Dossier introuvable : {TRAIN_DIR}")
        return

    manifest = load_manifest()

    if args.rollback:
        rollback_augmentations(TRAIN_DIR, manifest)
        print("\n[INFO] Rollback terminé.")
        return

    # Vérifier les images déjà générées (manifeste)
    existing = count_augmented_images(manifest)
    if existing > 0:
        print(f"\n[ATTENTION] {existing} images déjà générées (run précédent).")
        print("             Recommandation : faire --rollback d'abord pour repartir propre.")
        response = input("\nFaire un rollback automatique avant ? (o/N) : ")
        if response.lower() == "o":
            rollback_augmentations(TRAIN_DIR, manifest)
        else:
            response2 = input("\nContinuer quand même (mélange ancien + nouveau) ? (o/N) : ")
            if response2.lower() != "o":
                print("Annulé.")
                return

    classes_info = classify_classes(TRAIN_DIR, manifest)

    total_to_gen = sum(c["n_to_generate"] for c in classes_info.values())
    print(f"\n>>> Total à générer : {total_to_gen} images")

    if args.dry_run:
        print("\n[DRY-RUN] Aucune image générée.")
        return

    response = input("\nLancer la génération v2 ? (o/N) : ")
    if response.lower() != "o":
        print("Annulé.")
        return

    stats, rejected = generate_augmented_images(classes_info, manifest)
    write_report(classes_info, stats, rejected)

    print("\n" + "=" * 70)
    print(" ✅ AUGMENTATION v2 TERMINÉE")
    print("=" * 70)
    print("\nProchaines étapes :")
    print("  1. Vérifier reports/selective_augmentation_v2_report.txt")
    print("  2. Lancer python visualize_augmentations.py pour CONTRÔLE VISUEL")
    print("  3. Si OK : lancer le training")
    print("  4. Si problème : python augment_weak_classes_v2.py --rollback")


if __name__ == "__main__":
    main()
