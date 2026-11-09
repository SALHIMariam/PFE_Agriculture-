# -*- coding: utf-8 -*-
"""
Reequilibrage stratifie du dataset : 74/13/13 -> 70/15/15
Deplace des images de train -> val et train -> test proportionnellement
par classe, sans train-test leakage.
"""

import random
import shutil
from pathlib import Path
from collections import defaultdict

DATASET_DIR = Path(r"C:\Users\user\Desktop\PFE\ai\dataset_final")
TARGET_RATIOS = {"train": 0.70, "val": 0.15, "test": 0.15}
SEED = 42

random.seed(SEED)


def report_split(label):
    totals = {}
    for split in ["train", "val", "test"]:
        totals[split] = sum(
            len(list(f.rglob("*.jpg")))
            for f in (DATASET_DIR / split).iterdir()
            if f.is_dir()
        )
    grand = sum(totals.values())
    print(f"\n[{label}]")
    for s, n in totals.items():
        print(f"  {s:5}: {n:>6} images ({n/grand*100:.1f}%)")
    print(f"  total: {grand}")
    return totals, grand


# -- Etat initial --------------------------------------------------------------
totals_before, grand_total = report_split("AVANT reequilibrage")

train_total = totals_before["train"]
val_total   = totals_before["val"]
test_total  = totals_before["test"]

train_target = round(grand_total * TARGET_RATIOS["train"])
val_target   = round(grand_total * TARGET_RATIOS["val"])
test_target  = grand_total - train_target - val_target

need_val  = val_target  - val_total
need_test = test_target - test_total

print("\n[CIBLES]")
print(f"  train : {train_target} ({train_target/grand_total*100:.1f}%)")
print(f"  val   : {val_target}   ({val_target/grand_total*100:.1f}%)")
print(f"  test  : {test_target}  ({test_target/grand_total*100:.1f}%)")
print(f"\n  A deplacer -> val  : {need_val}")
print(f"  A deplacer -> test : {need_test}")

if need_val <= 0 and need_test <= 0:
    print("\nLe split est deja equilibre. Rien a faire.")
    raise SystemExit(0)

# -- Inventaire par classe dans train ------------------------------------------
train_dir = DATASET_DIR / "train"
class_images = {}
for cls_dir in sorted(train_dir.iterdir()):
    if cls_dir.is_dir():
        imgs = list(cls_dir.glob("*.jpg"))
        random.shuffle(imgs)
        class_images[cls_dir.name] = imgs

# -- Calcul stratifie ----------------------------------------------------------
to_move_val  = defaultdict(list)
to_move_test = defaultdict(list)

for cls, imgs in class_images.items():
    n_cls = len(imgs)
    ratio_cls = n_cls / train_total

    n_val  = round(ratio_cls * need_val)  if need_val  > 0 else 0
    n_test = round(ratio_cls * need_test) if need_test > 0 else 0

    n_val  = min(n_val,  n_cls)
    n_test = min(n_test, n_cls - n_val)

    to_move_val[cls]  = imgs[:n_val]
    to_move_test[cls] = imgs[n_val: n_val + n_test]

total_moving_val  = sum(len(v) for v in to_move_val.values())
total_moving_test = sum(len(v) for v in to_move_test.values())

print(f"\n[STRATIFICATION]")
print(f"  Images selectionnees -> val  : {total_moving_val}")
print(f"  Images selectionnees -> test : {total_moving_test}")

# -- Deplacement effectif ------------------------------------------------------
def move_images(mapping, dest_split):
    moved = 0
    for cls, imgs in mapping.items():
        dest_dir = DATASET_DIR / dest_split / cls
        dest_dir.mkdir(parents=True, exist_ok=True)
        for img in imgs:
            shutil.move(str(img), str(dest_dir / img.name))
            moved += 1
    return moved

print("\n[DEPLACEMENT EN COURS...]")
moved_val  = move_images(to_move_val,  "val")
moved_test = move_images(to_move_test, "test")
print(f"  OK {moved_val} images deplacees -> val")
print(f"  OK {moved_test} images deplacees -> test")

# -- Verification finale -------------------------------------------------------
totals_after, grand_after = report_split("APRES reequilibrage")

print("\n[VERIFICATION +/-1%]")
ok = True
for split, target_ratio in TARGET_RATIOS.items():
    actual = totals_after[split] / grand_after
    diff = abs(actual - target_ratio) * 100
    status = "OK" if diff <= 1.0 else "ECHEC"
    print(f"  [{status}] {split:5}: {actual*100:.1f}% (cible {target_ratio*100:.0f}%, ecart {diff:.2f}%)")
    if diff > 1.0:
        ok = False

if ok:
    print("\nReequilibrage reussi -- pret pour l'entrainement.")
else:
    print("\nEcart > 1% sur au moins un split -- verifier manuellement.")
