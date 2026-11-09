#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
 balanced_data_pipeline.py
 -----------------------------------------------------------------------------
 Projet PFE  : Détection des maladies foliaires
 Rôle        : Pipeline tf.data PROFESSIONNEL pour gérer le déséquilibre
               de classes (ratio 9.8×) avec 4 techniques combinées :

               1. CLASS WEIGHTS         → pénalise erreurs sur classes rares
               2. OVERSAMPLING À LA VOLÉE → équilibre statistique par batch
               3. AUGMENTATION ADAPTATIVE → plus agressive pour classes rares
               4. MIXUP + CUTMIX        → régularisation avancée (SOTA)

 IMPORTANT  : Aucune image dupliquée sur disque. Tout se fait en mémoire
              via tf.data.Dataset.sample_from_datasets() (méthode officielle TF).

 Auteur     : Mariem Salhi
 Usage      : Importé par train_efficientnetb0_balanced.py
================================================================================
"""

import json
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers
from tensorflow.keras.applications.efficientnet import preprocess_input
from pathlib import Path
from collections import Counter

AUTOTUNE = tf.data.AUTOTUNE


# =============================================================================
#  1. DÉFINITION DES NIVEAUX D'AUGMENTATION (par criticité de classe)
# =============================================================================

def build_augmentation_layers(strength: str = "medium"):
    """
    Retourne une pipeline d'augmentation Keras selon la force voulue.

    Args:
        strength: "light" | "medium" | "strong" | "extreme"

    Logique :
        - light    → classes majoritaires (>3000 images)
        - medium   → classes moyennes (1500-3000 images)
        - strong   → classes faibles (800-1500 images)
        - extreme  → classes critiques (<800 images, ex: Potato__virus)
    """
    if strength == "light":
        return tf.keras.Sequential([
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.05),       # ±18°
            layers.RandomZoom(0.05),           # ±5%
            layers.RandomBrightness(0.10),
            layers.RandomContrast(0.10),
        ], name="aug_light")

    if strength == "medium":
        return tf.keras.Sequential([
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.10),       # ±36°
            layers.RandomZoom(0.10),
            layers.RandomTranslation(0.05, 0.05),
            layers.RandomBrightness(0.15),
            layers.RandomContrast(0.15),
        ], name="aug_medium")

    if strength == "strong":
        return tf.keras.Sequential([
            layers.RandomFlip("horizontal"),
            layers.RandomFlip("vertical"),     # feuille => OK vertical aussi
            layers.RandomRotation(0.15),       # ±54°
            layers.RandomZoom(0.15),
            layers.RandomTranslation(0.10, 0.10),
            layers.RandomBrightness(0.20),
            layers.RandomContrast(0.20),
        ], name="aug_strong")

    if strength == "extreme":
        return tf.keras.Sequential([
            layers.RandomFlip("horizontal"),
            layers.RandomFlip("vertical"),
            layers.RandomRotation(0.20),       # ±72°
            layers.RandomZoom(0.20),
            layers.RandomTranslation(0.15, 0.15),
            layers.RandomBrightness(0.25),
            layers.RandomContrast(0.25),
            # Color jitter avancé
            layers.Lambda(lambda x: tf.image.random_saturation(x, 0.8, 1.2)),
            layers.Lambda(lambda x: tf.image.random_hue(x, 0.05)),
        ], name="aug_extreme")

    raise ValueError(f"Strength inconnue: {strength}")


# =============================================================================
#  2. ASSIGNATION DU NIVEAU D'AUGMENTATION PAR CLASSE
# =============================================================================

def assign_augmentation_strength(class_counts: dict) -> dict:
    """
    Décide automatiquement le niveau d'augmentation pour chaque classe.

    Args:
        class_counts: {class_name: n_images_in_train}

    Returns:
        {class_name: strength_str}
    """
    strength_map = {}
    for cls, n in class_counts.items():
        if n >= 3000:
            strength_map[cls] = "light"
        elif n >= 1500:
            strength_map[cls] = "medium"
        elif n >= 800:
            strength_map[cls] = "strong"
        else:
            strength_map[cls] = "extreme"
    return strength_map


# =============================================================================
#  3. MIXUP — Mélange linéaire de 2 images (régularisation puissante)
# =============================================================================

def mixup(images, labels, alpha: float = 0.2):
    """
    MixUp : combine linéairement 2 images du batch.

    Référence : Zhang et al. 2018 "mixup: Beyond Empirical Risk Minimization"
    Effet    : Régularise fortement, améliore généralisation (+2-3% accuracy)

    Args:
        images: (batch, H, W, 3)
        labels: (batch, num_classes) one-hot
        alpha:  paramètre de la loi Beta (0.2 = standard pour ImageNet)
    """
    batch_size = tf.shape(images)[0]

    # Lambda tiré d'une loi Beta(alpha, alpha)
    lam = tf.compat.v1.distributions.Beta(alpha, alpha).sample(1)[0]
    lam = tf.maximum(lam, 1.0 - lam)  # force lam dans [0.5, 1.0] (stabilité)

    # Permutation aléatoire du batch
    indices = tf.random.shuffle(tf.range(batch_size))
    images_shuffled = tf.gather(images, indices)
    labels_shuffled = tf.gather(labels, indices)

    # Mélange linéaire
    mixed_images = lam * images + (1.0 - lam) * images_shuffled
    mixed_labels = lam * labels + (1.0 - lam) * labels_shuffled

    return mixed_images, mixed_labels


# =============================================================================
#  4. CUTMIX — Découpe une région d'une image et la colle sur une autre
# =============================================================================

def cutmix(images, labels, alpha: float = 1.0):
    """
    CutMix : combine 2 images par découpe-collage d'une région rectangulaire.

    Référence : Yun et al. 2019 "CutMix: Regularization Strategy"
    Effet    : Améliore détection locale (très adapté aux maladies foliaires
               qui sont des taches localisées sur la feuille)

    Args:
        images: (batch, H, W, 3)
        labels: (batch, num_classes) one-hot
        alpha:  paramètre Beta
    """
    batch_size = tf.shape(images)[0]
    image_height = tf.shape(images)[1]
    image_width = tf.shape(images)[2]

    # Lambda tiré d'une Beta
    lam = tf.compat.v1.distributions.Beta(alpha, alpha).sample(1)[0]

    # Permutation
    indices = tf.random.shuffle(tf.range(batch_size))
    images_shuffled = tf.gather(images, indices)
    labels_shuffled = tf.gather(labels, indices)

    # Calcul du rectangle à découper
    cut_ratio = tf.sqrt(1.0 - lam)
    cut_h = tf.cast(tf.cast(image_height, tf.float32) * cut_ratio, tf.int32)
    cut_w = tf.cast(tf.cast(image_width, tf.float32) * cut_ratio, tf.int32)

    # Position aléatoire du centre
    cx = tf.random.uniform([], 0, image_width, dtype=tf.int32)
    cy = tf.random.uniform([], 0, image_height, dtype=tf.int32)

    # Coordonnées du rectangle (clipées aux bords)
    x1 = tf.clip_by_value(cx - cut_w // 2, 0, image_width)
    x2 = tf.clip_by_value(cx + cut_w // 2, 0, image_width)
    y1 = tf.clip_by_value(cy - cut_h // 2, 0, image_height)
    y2 = tf.clip_by_value(cy + cut_h // 2, 0, image_height)

    # Construction du masque binaire
    mask = tf.ones((image_height, image_width, 1), dtype=images.dtype)
    rect_h = y2 - y1
    rect_w = x2 - x1

    # Si rectangle non vide, on crée le masque
    def apply_cutmix():
        zeros = tf.zeros((rect_h, rect_w, 1), dtype=images.dtype)
        paddings = [[y1, image_height - y2], [x1, image_width - x2], [0, 0]]
        local_mask = 1.0 - tf.pad(zeros + 1.0, paddings)  # 0 dans le rect, 1 ailleurs
        mixed = images * local_mask + images_shuffled * (1.0 - local_mask)

        # Ajuster lambda en fonction de la VRAIE surface coupée
        real_lam = 1.0 - tf.cast(rect_h * rect_w, tf.float32) / tf.cast(
            image_height * image_width, tf.float32
        )
        mixed_labels = real_lam * labels + (1.0 - real_lam) * labels_shuffled
        return mixed, mixed_labels

    # Cas dégénéré (rect vide)
    def no_cutmix():
        return images, labels

    return tf.cond(
        tf.logical_and(rect_h > 0, rect_w > 0),
        apply_cutmix,
        no_cutmix,
    )


# =============================================================================
#  5. PIPELINE TF.DATA AVEC OVERSAMPLING ÉQUILIBRÉ
# =============================================================================

def build_balanced_train_dataset(
    train_dir: Path,
    class_names: list,
    img_size: tuple = (224, 224),
    batch_size: int = 32,
    use_oversampling: bool = True,
    use_mixup: bool = True,
    use_cutmix: bool = True,
    mixup_prob: float = 0.5,
    seed: int = 42,
):
    """
    Pipeline d'entraînement professionnel avec gestion complète du déséquilibre.

    Étapes :
        1. Charge UN dataset PAR CLASSE (pour oversampling contrôlé)
        2. Applique l'augmentation ADAPTÉE à chaque classe
        3. Combine tous les datasets avec sample_from_datasets (uniforme)
        4. Batch + MixUp + CutMix
        5. preprocess_input EfficientNet

    Returns:
        tf.data.Dataset, class_counts
    """
    print("\n" + "=" * 70)
    print(" CONSTRUCTION DU PIPELINE BALANCED")
    print("=" * 70)

    # --- 5.1 Compter les images par classe ---
    class_counts = {}
    for cls in class_names:
        cls_dir = train_dir / cls
        n = len(list(cls_dir.glob("*.jpg")))
        class_counts[cls] = n

    total = sum(class_counts.values())
    print(f"\n[INFO] {len(class_names)} classes, {total} images train total")
    print(f"[INFO] Min : {min(class_counts.values())} | "
          f"Max : {max(class_counts.values())} | "
          f"Ratio : {max(class_counts.values())/min(class_counts.values()):.1f}×")

    # --- 5.2 Assigner les niveaux d'augmentation ---
    strength_map = assign_augmentation_strength(class_counts)
    aug_levels_count = Counter(strength_map.values())
    print(f"\n[INFO] Distribution des niveaux d'augmentation :")
    for lvl, n in sorted(aug_levels_count.items()):
        print(f"  - {lvl:8s}: {n:2d} classes")

    # --- 5.3 Pré-construire les augmentations (une par niveau pour économiser mémoire) ---
    aug_pipelines = {
        "light":   build_augmentation_layers("light"),
        "medium":  build_augmentation_layers("medium"),
        "strong":  build_augmentation_layers("strong"),
        "extreme": build_augmentation_layers("extreme"),
    }

    # --- 5.4 Créer UN dataset par classe ---
    per_class_datasets = []
    for class_idx, cls in enumerate(class_names):
        cls_dir = train_dir / cls
        strength = strength_map[cls]
        aug_pipe = aug_pipelines[strength]

        # Dataset d'images de cette classe uniquement
        ds = tf.keras.utils.image_dataset_from_directory(
            cls_dir.parent,
            image_size=img_size,
            batch_size=None,           # IMPORTANT : pas de batch ici
            label_mode=None,           # On gère les labels manuellement
            shuffle=True,
            seed=seed,
            class_names=[cls],         # Filtre uniquement cette classe
        )

        # One-hot label pour cette classe
        one_hot = tf.one_hot(class_idx, len(class_names))

        # Map : (image, label_one_hot) + augmentation adaptée
        ds = ds.map(
            lambda img, _aug=aug_pipe, _lbl=one_hot:
                (_aug(img, training=True), _lbl),
            num_parallel_calls=AUTOTUNE,
        )

        # Répétition infinie (sample_from_datasets a besoin de ça pour oversampling)
        ds = ds.repeat()

        per_class_datasets.append(ds)

    # --- 5.5 Combiner avec poids uniformes (= oversampling automatique) ---
    if use_oversampling:
        # Poids uniformes : chaque classe a la même proba d'être tirée
        # → les classes rares apparaissent plus souvent qu'avec leur fréquence naturelle
        weights = [1.0 / len(class_names)] * len(class_names)
        print(f"\n[INFO] ✅ Oversampling activé (échantillonnage uniforme par classe)")
    else:
        # Poids proportionnels à la taille de chaque classe (= comme normal)
        weights = [class_counts[cls] / total for cls in class_names]
        print(f"\n[INFO] ❌ Oversampling désactivé (échantillonnage naturel)")

    balanced_ds = tf.data.Dataset.sample_from_datasets(
        per_class_datasets,
        weights=weights,
        seed=seed,
    )

    # --- 5.6 Batch ---
    balanced_ds = balanced_ds.batch(batch_size, drop_remainder=True)

    # --- 5.7 MixUp + CutMix (50% / 50% du temps) ---
    if use_mixup or use_cutmix:
        def apply_mixing(images, labels):
            # Convertir en float pour les opérations de mélange
            images = tf.cast(images, tf.float32)

            r = tf.random.uniform(())

            if use_mixup and use_cutmix:
                # 1/3 mixup, 1/3 cutmix, 1/3 normal
                return tf.cond(
                    r < (mixup_prob / 2),
                    lambda: mixup(images, labels, alpha=0.2),
                    lambda: tf.cond(
                        r < mixup_prob,
                        lambda: cutmix(images, labels, alpha=1.0),
                        lambda: (images, labels),
                    ),
                )
            elif use_mixup:
                return tf.cond(
                    r < mixup_prob,
                    lambda: mixup(images, labels, alpha=0.2),
                    lambda: (images, labels),
                )
            else:  # use_cutmix only
                return tf.cond(
                    r < mixup_prob,
                    lambda: cutmix(images, labels, alpha=1.0),
                    lambda: (images, labels),
                )

        balanced_ds = balanced_ds.map(apply_mixing, num_parallel_calls=AUTOTUNE)
        print(f"[INFO] ✅ MixUp + CutMix activés (prob={mixup_prob})")

    # --- 5.8 preprocess_input EfficientNet ---
    balanced_ds = balanced_ds.map(
        lambda x, y: (preprocess_input(x), y),
        num_parallel_calls=AUTOTUNE,
    )

    # --- 5.9 Prefetch ---
    balanced_ds = balanced_ds.prefetch(AUTOTUNE)

    print(f"\n[INFO] Pipeline construit ✅")
    print(f"  - {len(class_names)} datasets par classe combinés")
    print(f"  - Oversampling : {use_oversampling}")
    print(f"  - MixUp        : {use_mixup}")
    print(f"  - CutMix       : {use_cutmix}")
    print("=" * 70)

    return balanced_ds, class_counts


# =============================================================================
#  6. DATASETS VAL/TEST (PAS d'augmentation, PAS d'oversampling)
# =============================================================================

def build_eval_dataset(
    eval_dir: Path,
    img_size: tuple = (224, 224),
    batch_size: int = 32,
    seed: int = 42,
):
    """
    Pipeline d'évaluation propre :
    - Aucune augmentation
    - Aucun oversampling (distribution naturelle préservée)
    - preprocess_input EfficientNet uniquement
    """
    ds = tf.keras.utils.image_dataset_from_directory(
        eval_dir,
        image_size=img_size,
        batch_size=batch_size,
        label_mode="categorical",
        shuffle=False,
        seed=seed,
    )
    class_names = ds.class_names

    ds = ds.map(
        lambda x, y: (preprocess_input(x), y),
        num_parallel_calls=AUTOTUNE,
    ).prefetch(AUTOTUNE)

    return ds, class_names


# =============================================================================
#  7. STEPS PAR ÉPOQUE (important avec oversampling)
# =============================================================================

def compute_steps_per_epoch(class_counts: dict, batch_size: int) -> int:
    """
    Avec sample_from_datasets + repeat(), il faut spécifier steps_per_epoch.

    Stratégie : 1 époque = passer en moyenne sur le nombre total d'images
                du dataset original (pas du dataset suréchantillonné, qui est infini).
    """
    total = sum(class_counts.values())
    return total // batch_size


# =============================================================================
#  TEST / DÉMO
# =============================================================================

if __name__ == "__main__":
    DATASET_DIR = Path(r"C:\Users\user\Desktop\PFE\ai\dataset_final")

    # Lecture des classes
    train_dir = DATASET_DIR / "train"
    class_names = sorted([d.name for d in train_dir.iterdir() if d.is_dir()])

    # Construction
    train_ds, class_counts = build_balanced_train_dataset(
        train_dir=train_dir,
        class_names=class_names,
        img_size=(224, 224),
        batch_size=32,
        use_oversampling=True,
        use_mixup=True,
        use_cutmix=True,
    )

    steps = compute_steps_per_epoch(class_counts, batch_size=32)
    print(f"\n[INFO] Steps per epoch : {steps}")

    # Test : tirer 1 batch
    print("\n[TEST] Tirage d'un batch...")
    for images, labels in train_ds.take(1):
        print(f"  Images shape : {images.shape}")
        print(f"  Labels shape : {labels.shape}")
        print(f"  Labels[0]    : {labels[0].numpy().round(3)}")
        print(f"  Min/Max img  : {images.numpy().min():.2f} / {images.numpy().max():.2f}")
