#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
 reduce_oversized_classes.py
 -----------------------------------------------------------------------------
 Projet PFE  : Détection des maladies foliaires
 Rôle        : Réduit les classes sur-représentées dans train/
               en déplaçant l'excédent vers un dossier archived/
               (non-destructif — récupérable à tout moment)

 Classes ciblées :
   - Apple__apple_scab  : 5319 → 3500  (-1819)
   - Cucumber__healthy  : 4396 → 3500  (- 896)

 Sécurités :
   - Déplacement vers archived/ (pas de suppression)
   - Priorité : on archive d'abord les AUG_, puis les originales si besoin
   - val/ et test/ ne sont JAMAIS touchés
   - Vérification finale avec counts

 Auteur     : Mariem Salhi
 Usage      : python reduce_oversized_classes.py
================================================================================
"""

import random
import shutil
from pathlib import Path

# =============================================================================
#                          PARAMÈTRES
# =============================================================================

DATASET_DIR  = Path(r"C:\Users\user\Desktop\PFE\ai\dataset_final")
ARCHIVE_DIR  = Path(r"C:\Users\user\Desktop\PFE\ai\archived_excess")
SEED         = 42

# Classes à réduire : {nom_classe: cible_train}
TARGETS = {
    "Apple__apple_scab" : 3500,
    "Cucumber__healthy" : 3500,
}

random.seed(SEED)


# =============================================================================
#                          FONCTIONS
# =============================================================================

def count_images(cls_dir: Path) -> dict:
    """Compte originales et AUG_ dans un dossier."""
    all_imgs  = list(cls_dir.glob("*.jpg"))
    originals = [p for p in all_imgs if not p.name.startswith("AUG_")]
    augmented = [p for p in all_imgs if p.name.startswith("AUG_")]
    return {
        "total": len(all_imgs),
        "originals": originals,
        "augmented": augmented,
    }


def reduce_class(cls_name: str, target: int, train_dir: Path, archive_dir: Path):
    """
    Réduit une classe à `target` images dans train/.
    Stratégie : archive d'abord les AUG_ (synthétiques),
                puis les originales si encore trop nombreuses.
    """
    cls_train = train_dir / cls_name
    if not cls_train.exists():
        print(f"[ERREUR] Dossier introuvable : {cls_train}")
        return

    info = count_images(cls_train)
    current = info["total"]

    if current <= target:
        print(f"  {cls_name} : {current} images — déjà ≤ {target}, rien à faire.")
        return

    to_remove = current - target
    print(f"  {cls_name} : {current} → {target}  (−{to_remove} images)")

    # Dossier d'archive
    dst_dir = archive_dir / cls_name
    dst_dir.mkdir(parents=True, exist_ok=True)

    removed = 0

    # Étape 1 : retirer d'abord les AUG_ (aléatoirement)
    aug_list = list(info["augmented"])
    random.shuffle(aug_list)
    for img in aug_list:
        if removed >= to_remove:
            break
        shutil.move(str(img), str(dst_dir / img.name))
        removed += 1

    # Étape 2 : si encore trop, retirer des originales
    if removed < to_remove:
        orig_list = list(info["originals"])
        random.shuffle(orig_list)
        for img in orig_list:
            if removed >= to_remove:
                break
            shutil.move(str(img), str(dst_dir / img.name))
            removed += 1

    # Vérification
    final_count = len(list(cls_train.glob("*.jpg")))
    aug_archived = sum(1 for p in dst_dir.glob("AUG_*.jpg"))
    orig_archived = sum(1 for p in dst_dir.glob("*.jpg") if not p.name.startswith("AUG_"))

    print(f"    ✅ {final_count} images restantes dans train/")
    print(f"    📦 Archivées : {aug_archived} AUG_ + {orig_archived} originales")


def print_summary(train_dir: Path):
    """Affiche l'état des classes ciblées après réduction."""
    print("\n" + "=" * 60)
    print(" ÉTAT FINAL")
    print("=" * 60)

    all_counts = []
    for cls_dir in sorted(train_dir.iterdir()):
        if cls_dir.is_dir():
            n = len(list(cls_dir.glob("*.jpg")))
            all_counts.append(n)
            flag = " ← ciblée" if cls_dir.name in TARGETS else ""
            if cls_dir.name in TARGETS or n < 1500:
                print(f"  {cls_dir.name:<48} : {n:>6,}{flag}")

    if all_counts:
        print(f"\n  Min train : {min(all_counts):,}")
        print(f"  Max train : {max(all_counts):,}")
        print(f"  Ratio     : {max(all_counts) / min(all_counts):.1f}×")


# =============================================================================
#                          MAIN
# =============================================================================

def main():
    train_dir = DATASET_DIR / "train"

    if not train_dir.exists():
        print(f"[ERREUR] Dossier introuvable : {train_dir}")
        return

    print("=" * 60)
    print(" RÉDUCTION DES CLASSES SUR-REPRÉSENTÉES")
    print("=" * 60)
    print(f"\n  Cibles :")
    for cls, tgt in TARGETS.items():
        cls_dir = train_dir / cls
        current = len(list(cls_dir.glob("*.jpg"))) if cls_dir.exists() else 0
        print(f"    {cls:<40} : {current:,} → {tgt:,}  (−{max(0, current - tgt):,})")

    print()
    confirm = input("Continuer ? (o/N) : ")
    if confirm.lower() != "o":
        print("Annulé.")
        return

    print("\n" + "-" * 60)
    for cls_name, target in TARGETS.items():
        reduce_class(cls_name, target, train_dir, ARCHIVE_DIR)

    print_summary(train_dir)

    print(f"\n[OK] Images archivées dans : {ARCHIVE_DIR}")
    print(f"     Pour restaurer : déplace les fichiers de archived/ → dataset_final/train/")
    print(f"\nProchaine étape : python audit_dataset_final.py")


if __name__ == "__main__":
    main()
