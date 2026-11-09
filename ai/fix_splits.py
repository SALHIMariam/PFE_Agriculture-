"""
fix_splits.py
Rééquilibre les splits train/val/test à 70% / 15% / 15% par classe.
Gère les cas extrêmes (0 images dans un split, classe vide, etc.)

Les images augmentées (préfixe AUG_) sont exclues du rééquilibrage : elles
restent toujours dans train/, quel que soit leur split d'origine, pour éviter
toute contamination de val/test par des images synthétiques.
"""
import os
import random
import shutil
from pathlib import Path
from collections import defaultdict

random.seed(42)

DATASET = Path("dataset_final")
SPLITS   = ["train", "val", "test"]
RATIOS   = {"train": 0.70, "val": 0.15, "test": 0.15}
IMG_EXTS = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}

# ─── 1. Collecter toutes les images par classe ─────────────────────────────
print("=== COLLECTE DES IMAGES ===")
classes_images: dict[str, dict[str, list[Path]]] = defaultdict(lambda: defaultdict(list))

for split in SPLITS:
    split_path = DATASET / split
    if not split_path.exists():
        continue
    for cls_dir in sorted(split_path.iterdir()):
        if not cls_dir.is_dir():
            continue
        imgs = [p for p in cls_dir.iterdir()
                if p.suffix in IMG_EXTS and not p.name.startswith("AUG_")]
        classes_images[cls_dir.name][split].extend(imgs)

all_classes = sorted(classes_images.keys())
print(f"Classes trouvées : {len(all_classes)}")

# ─── 2. Calculer les nouveaux targets ──────────────────────────────────────
print("\n=== CALCUL DES TARGETS (70/15/15) ===\n")
moves_needed = []

for cls in all_classes:
    # Pool global de toutes les images de cette classe
    all_imgs: list[Path] = []
    for split in SPLITS:
        all_imgs.extend(classes_images[cls][split])

    total = len(all_imgs)
    if total == 0:
        print(f"  [SKIP] {cls} — aucune image")
        continue

    target_train = round(total * RATIOS["train"])
    target_val   = round(total * RATIOS["val"])
    target_test  = total - target_train - target_val

    cur_train = len(classes_images[cls]["train"])
    cur_val   = len(classes_images[cls]["val"])
    cur_test  = len(classes_images[cls]["test"])

    delta_train = target_train - cur_train
    delta_val   = target_val   - cur_val
    delta_test  = target_test  - cur_test

    if delta_train != 0 or delta_val != 0 or delta_test != 0:
        moves_needed.append(cls)
        print(f"  {cls}")
        print(f"    Actuel  : train={cur_train}  val={cur_val}  test={cur_test}  total={total}")
        print(f"    Target  : train={target_train}  val={target_val}  test={target_test}")
        print(f"    Delta   : train={delta_train:+d}  val={delta_val:+d}  test={delta_test:+d}")

print(f"\n{len(moves_needed)} classes nécessitent un rééquilibrage.")

# ─── 3. Rééquilibrage ──────────────────────────────────────────────────────
print("\n=== RÉÉQUILIBRAGE EN COURS ===\n")

for cls in all_classes:
    all_imgs: list[Path] = []
    for split in SPLITS:
        all_imgs.extend(classes_images[cls][split])

    total = len(all_imgs)
    if total == 0:
        continue

    # Shuffle déterministe
    random.shuffle(all_imgs)

    target_train = round(total * RATIOS["train"])
    target_val   = round(total * RATIOS["val"])
    target_test  = total - target_train - target_val

    assigned = {
        "train": set(all_imgs[:target_train]),
        "val":   set(all_imgs[target_train:target_train + target_val]),
        "test":  set(all_imgs[target_train + target_val:]),
    }

    # S'assurer que les dossiers cibles existent
    for split in SPLITS:
        (DATASET / split / cls).mkdir(parents=True, exist_ok=True)

    # Déplacer les images qui sont dans le mauvais split
    moved = 0
    for split_src in SPLITS:
        for img_path in list(classes_images[cls][split_src]):
            # Trouver dans quel split cible cette image doit aller
            for split_dst in SPLITS:
                if img_path in assigned[split_dst]:
                    if split_src != split_dst:
                        dst = DATASET / split_dst / cls / img_path.name
                        # Eviter collision de noms
                        if dst.exists():
                            stem = img_path.stem
                            suffix = img_path.suffix
                            i = 1
                            while dst.exists():
                                dst = DATASET / split_dst / cls / f"{stem}_r{i}{suffix}"
                                i += 1
                        shutil.move(str(img_path), str(dst))
                        moved += 1
                    break

    if moved > 0:
        print(f"  {cls} : {moved} images déplacées")

print("\n=== RÉÉQUILIBRAGE TERMINÉ ===")

# ─── 4. Vérification finale ────────────────────────────────────────────────
print("\n=== VÉRIFICATION FINALE ===\n")
total_global = {"train": 0, "val": 0, "test": 0}
classes_final = {}

for split in SPLITS:
    split_path = DATASET / split
    for cls_dir in sorted(split_path.iterdir()):
        if not cls_dir.is_dir():
            continue
        imgs = [p for p in cls_dir.iterdir() if p.suffix in IMG_EXTS]
        count = len(imgs)
        total_global[split] += count
        if cls_dir.name not in classes_final:
            classes_final[cls_dir.name] = {}
        classes_final[cls_dir.name][split] = count

grand_total = sum(total_global.values())
print(f"Total global : {grand_total}")
print(f"Train : {total_global['train']}  ({total_global['train']/grand_total*100:.1f}%)")
print(f"Val   : {total_global['val']}  ({total_global['val']/grand_total*100:.1f}%)")
print(f"Test  : {total_global['test']}  ({total_global['test']/grand_total*100:.1f}%)")

print(f"\n{'Classe':<45} {'Train':>6} {'Val':>6} {'Test':>6} {'Total':>7} {'%Train':>7} {'%Val':>6} {'%Test':>6}")
print("-" * 100)
for cls, counts in sorted(classes_final.items()):
    tr = counts.get("train", 0)
    va = counts.get("val", 0)
    te = counts.get("test", 0)
    tot = tr + va + te
    pct_tr = tr/tot*100 if tot else 0
    pct_va = va/tot*100 if tot else 0
    pct_te = te/tot*100 if tot else 0
    flag = ""
    if pct_tr < 60 or pct_tr > 80:
        flag = " ⚠️"
    print(f"{cls:<45} {tr:>6} {va:>6} {te:>6} {tot:>7} {pct_tr:>6.1f}% {pct_va:>5.1f}% {pct_te:>5.1f}%{flag}")

print("\n✅ Script terminé.")
