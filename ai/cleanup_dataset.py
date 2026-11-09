#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
cleanup_dataset.py
Nettoyage post-traitement de dataset_final/ :
  - Élimination du train-test leakage (MD5 + pHash)
  - Suppression des doublons intra-split
  - Isolation des erreurs cross-classe
  - Protection des classes faibles (seuil MIN_CLASS_SIZE)
  - Quarantine non-destructive (move, pas delete)
"""

import csv
import hashlib
import logging
import shutil
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from PIL import Image
from tqdm import tqdm

try:
    import imagehash
    HAS_IMAGEHASH = True
except ImportError:
    HAS_IMAGEHASH = False

# ─────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────
DATASET_DIR    = Path(r"C:\Users\user\Desktop\PFE\ai\dataset_final")
QUARANTINE_DIR = Path(r"C:\Users\user\Desktop\PFE\ai\quarantine")
REPORTS_DIR    = QUARANTINE_DIR / "reports"

PHASH_MAX_DIST = 5      # distance pHash max pour quasi-doublons visuels
MIN_CLASS_SIZE = 500    # seuil absolu de protection (jamais en dessous)
VALID_EXTS     = (".jpg", ".jpeg", ".png", ".bmp", ".webp")

# Priorité de conservation : train > test > val
# (index 0 = priorité maximale → gardé)
SPLIT_PRIORITY: List[str] = ["train", "test", "val"]

# ─────────────────────────────────────────────────────────────────────
# LOGGER
# ─────────────────────────────────────────────────────────────────────
def setup_logger() -> logging.Logger:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("cleanup")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    fmt = logging.Formatter("[%(asctime)s] %(levelname)s | %(message)s", datefmt="%H:%M:%S")
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)
    logger.addHandler(ch)
    fh = logging.FileHandler(REPORTS_DIR / "cleanup.log", encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)
    return logger

log = setup_logger()

# ─────────────────────────────────────────────────────────────────────
# COMPTEURS GLOBAUX
# ─────────────────────────────────────────────────────────────────────
MOVED_CROSS_SPLIT  = 0
MOVED_INTRA_SPLIT  = 0
MOVED_CROSS_CLASS  = 0
MOVED_PHASH        = 0
CANCELLED          = 0
ALERTS:           List[str]  = []
CROSS_CLASS_CASES: List[Dict] = []
PHASH_CASES:       List[Dict] = []

# ─────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────
def list_images(folder: Path) -> List[Path]:
    return [p for p in folder.rglob("*")
            if p.is_file() and p.suffix.lower() in VALID_EXTS]

def get_split(path: Path) -> str:
    return path.parts[-3]   # dataset_final / <split> / <class> / file.jpg

def get_class(path: Path) -> str:
    return path.parts[-2]

def split_priority(path: Path) -> int:
    s = get_split(path)
    return SPLIT_PRIORITY.index(s) if s in SPLIT_PRIORITY else 99

def md5_of(path: Path) -> Optional[str]:
    try:
        return hashlib.md5(path.read_bytes()).hexdigest()
    except Exception:
        return None

def phash_of(path: Path) -> Optional[Any]:
    if not HAS_IMAGEHASH:
        return None
    try:
        return imagehash.phash(Image.open(path).convert("RGB"), hash_size=8)
    except Exception:
        return None

def move_to_quarantine(src: Path, subdir: str) -> bool:
    dst_dir = QUARANTINE_DIR / subdir / get_split(src) / get_class(src)
    dst_dir.mkdir(parents=True, exist_ok=True)
    dst = dst_dir / src.name
    if dst.exists():
        dst = dst_dir / (src.stem + "_dup" + src.suffix)
    try:
        shutil.move(str(src), str(dst))
        return True
    except Exception as e:
        log.error(f"Move failed {src} → {dst}: {e}")
        return False

def class_size_map(files: List[Path]) -> Dict[str, int]:
    sizes: Dict[str, int] = defaultdict(int)
    for f in files:
        sizes[get_class(f)] += 1
    return dict(sizes)

def can_remove(path: Path, sizes: Dict[str, int]) -> bool:
    return sizes.get(get_class(path), 0) > MIN_CLASS_SIZE

# ─────────────────────────────────────────────────────────────────────
# ÉTAPE 1 : INDEX MD5
# ─────────────────────────────────────────────────────────────────────
def build_md5_index(files: List[Path]) -> Dict[str, List[Path]]:
    log.info(f"Calcul MD5 sur {len(files)} images...")
    md5_map: Dict[str, List[Path]] = defaultdict(list)
    for f in tqdm(files, desc="md5"):
        h = md5_of(f)
        if h:
            md5_map[h].append(f)
    dup_groups = sum(1 for v in md5_map.values() if len(v) > 1)
    log.info(f"  → {dup_groups} groupes de doublons MD5")
    return md5_map

# ─────────────────────────────────────────────────────────────────────
# ÉTAPE 2 : TRAITEMENT MD5 (cross-class / cross-split / intra-split)
# ─────────────────────────────────────────────────────────────────────
def process_md5(md5_map: Dict[str, List[Path]], sizes: Dict[str, int]) -> None:
    global MOVED_CROSS_SPLIT, MOVED_INTRA_SPLIT, MOVED_CROSS_CLASS, CANCELLED

    log.info("Traitement des doublons MD5...")

    for h, paths in tqdm(md5_map.items(), desc="md5 dedup"):
        if len(paths) < 2:
            continue

        unique_classes = set(get_class(p) for p in paths)
        unique_splits  = set(get_split(p) for p in paths)

        # ── CROSS-CLASS (même image, labels différents) ───────────────
        if len(unique_classes) > 1:
            CROSS_CLASS_CASES.append({
                "md5":     h,
                "paths":   [str(p) for p in paths],
                "classes": sorted(unique_classes),
                "splits":  sorted(unique_splits),
            })
            for p in paths:
                if can_remove(p, sizes):
                    if move_to_quarantine(p, "cross_class_review"):
                        sizes[get_class(p)] = sizes.get(get_class(p), 1) - 1
                        MOVED_CROSS_CLASS += 1
                else:
                    ALERTS.append(
                        f"[cross_class] PROTÉGÉ {get_class(p)}: "
                        f"{sizes.get(get_class(p))} images ≤ {MIN_CLASS_SIZE}"
                    )
                    CANCELLED += 1
            continue

        # ── CROSS-SPLIT LEAKAGE (même image dans train+test ou train+val) ──
        if len(unique_splits) > 1:
            sorted_paths = sorted(paths, key=split_priority)
            to_remove = sorted_paths[1:]
            for p in to_remove:
                if can_remove(p, sizes):
                    if move_to_quarantine(p, "cross_split"):
                        sizes[get_class(p)] = sizes.get(get_class(p), 1) - 1
                        MOVED_CROSS_SPLIT += 1
                else:
                    ALERTS.append(
                        f"[cross_split] PROTÉGÉ {get_class(p)}: "
                        f"{sizes.get(get_class(p))} images ≤ {MIN_CLASS_SIZE}"
                    )
                    CANCELLED += 1
            continue

        # ── INTRA-SPLIT (même split, même classe) ─────────────────────
        sorted_paths = sorted(paths, key=lambda p: p.name)
        for p in sorted_paths[1:]:
            if can_remove(p, sizes):
                if move_to_quarantine(p, "duplicates"):
                    sizes[get_class(p)] = sizes.get(get_class(p), 1) - 1
                    MOVED_INTRA_SPLIT += 1
            else:
                ALERTS.append(
                    f"[intra_split] PROTÉGÉ {get_class(p)}: "
                    f"{sizes.get(get_class(p))} images ≤ {MIN_CLASS_SIZE}"
                )
                CANCELLED += 1

# ─────────────────────────────────────────────────────────────────────
# ÉTAPE 3 : PHASH CROSS-SPLIT (par classe, évite O(n²) global)
# ─────────────────────────────────────────────────────────────────────
def build_phash_index_by_class(
    files: List[Path]
) -> Dict[str, Dict[str, List[Tuple[Path, Any]]]]:
    """Retourne {class: {split: [(path, phash), ...]}}"""
    log.info(f"Calcul pHash sur {len(files)} images (groupé par classe)...")
    idx: Dict[str, Dict[str, List]] = defaultdict(lambda: defaultdict(list))
    for f in tqdm(files, desc="phash"):
        ph = phash_of(f)
        if ph is not None:
            idx[get_class(f)][get_split(f)].append((f, ph))
    return idx

def process_phash(
    idx: Dict[str, Dict[str, List]], sizes: Dict[str, int]
) -> None:
    global MOVED_PHASH

    if not HAS_IMAGEHASH:
        log.warning("pHash désactivé — imagehash non installé")
        return

    log.info("Détection quasi-doublons visuels cross-split (pHash ≤ 5)...")
    moved_set: Set[Path] = set()

    for cls, splits_data in tqdm(idx.items(), desc="phash cross-split"):
        split_names = list(splits_data.keys())
        for i, s1 in enumerate(split_names):
            for s2 in split_names[i + 1:]:
                for p1, h1 in splits_data[s1]:
                    if p1 in moved_set:
                        continue
                    for p2, h2 in splits_data[s2]:
                        if p2 in moved_set:
                            continue
                        dist = int(h1 - h2)
                        if dist > PHASH_MAX_DIST:
                            continue
                        # Garder haute priorité, déplacer l'autre
                        victim = p2 if split_priority(p1) <= split_priority(p2) else p1
                        PHASH_CASES.append({
                            "path1": str(p1), "split1": s1,
                            "path2": str(p2), "split2": s2,
                            "class": cls,     "distance": dist,
                        })
                        if victim not in moved_set:
                            if can_remove(victim, sizes):
                                if move_to_quarantine(victim, "phash_review"):
                                    sizes[get_class(victim)] -= 1
                                    moved_set.add(victim)
                                    MOVED_PHASH += 1
                            else:
                                ALERTS.append(
                                    f"[phash] PROTÉGÉ {get_class(victim)}: "
                                    f"{sizes.get(get_class(victim))} images ≤ {MIN_CLASS_SIZE}"
                                )

# ─────────────────────────────────────────────────────────────────────
# ÉTAPE 4 : VÉRIFICATION FINALE
# ─────────────────────────────────────────────────────────────────────
def final_verification() -> Dict:
    log.info("=" * 60)
    log.info("VÉRIFICATION FINALE")
    log.info("=" * 60)

    files = list_images(DATASET_DIR)
    md5_map = build_md5_index(files)

    leakages_md5 = 0
    intra_remaining = 0
    for h, paths in md5_map.items():
        if len(paths) < 2:
            continue
        splits = set(get_split(p) for p in paths)
        if len(splits) > 1:
            leakages_md5 += 1
        else:
            intra_remaining += len(paths) - 1

    by_split: Dict[str, int] = defaultdict(int)
    by_class: Dict[str, int] = defaultdict(int)
    for f in files:
        by_split[get_split(f)] += 1
        by_class[get_class(f)] += 1

    total = len(files)
    weak = [c for c, n in by_class.items() if n < MIN_CLASS_SIZE]

    log.info(f"  Total images restantes    : {total}")
    log.info(f"  Leakages MD5 cross-split  : {leakages_md5}  {'✅' if leakages_md5 == 0 else '❌'}")
    log.info(f"  Doublons intra restants   : {intra_remaining}  {'✅' if intra_remaining == 0 else '⚠️'}")
    log.info(f"  Classes < {MIN_CLASS_SIZE} images     : {weak or 'aucune'}  {'✅' if not weak else '⚠️'}")
    for s in ["train", "val", "test"]:
        n = by_split.get(s, 0)
        pct = n / total * 100 if total else 0
        log.info(f"  {s:5}: {n:>7} images ({pct:.1f}%)")

    return {
        "total": total, "by_split": dict(by_split), "by_class": dict(by_class),
        "leakages_md5": leakages_md5, "intra_remaining": intra_remaining, "weak": weak,
    }

# ─────────────────────────────────────────────────────────────────────
# ÉTAPE 5 : RAPPORTS
# ─────────────────────────────────────────────────────────────────────
def write_reports(before: int, stats: Dict) -> None:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    total    = stats["total"]
    by_split = stats["by_split"]
    by_class = stats["by_class"]

    # cross_class_cases.csv
    if CROSS_CLASS_CASES:
        with open(REPORTS_DIR / "cross_class_cases.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["md5", "classes", "splits", "paths"])
            for c in CROSS_CLASS_CASES:
                w.writerow([c["md5"], " | ".join(c["classes"]),
                            " | ".join(c["splits"]), " | ".join(c["paths"])])

    # visual_duplicates_report.txt
    if PHASH_CASES:
        with open(REPORTS_DIR / "visual_duplicates_report.txt", "w", encoding="utf-8") as f:
            f.write(f"Total quasi-doublons visuels détectés : {len(PHASH_CASES)}\n\n")
            for c in PHASH_CASES:
                f.write(f"dist={c['distance']}  classe={c['class']}\n")
                f.write(f"  [{c['split1']}] {c['path1']}\n")
                f.write(f"  [{c['split2']}] {c['path2']}\n\n")

    # weak_classes_alerts.txt
    if ALERTS:
        with open(REPORTS_DIR / "weak_classes_alerts.txt", "w", encoding="utf-8") as f:
            f.write("\n".join(ALERTS))

    # Rapport principal
    total_moved = MOVED_CROSS_SPLIT + MOVED_INTRA_SPLIT + MOVED_CROSS_CLASS + MOVED_PHASH
    lines = [
        "=" * 72,
        " RAPPORT DE NETTOYAGE POST-TRAITEMENT — dataset_final/",
        "=" * 72,
        "",
        "SECTION 1 — Statistiques générales",
        f"  Total avant nettoyage        : {before:>7}",
        f"  Total après nettoyage        : {total:>7}",
        f"  Déplacées vers quarantine/   : {total_moved:>7}",
        f"  Suppressions annulées        : {CANCELLED:>7}  (protection classes faibles)",
        "",
        "SECTION 2 — Détail des nettoyages",
        f"  Leakages cross-split (MD5)   : {MOVED_CROSS_SPLIT:>7}  → quarantine/cross_split/",
        f"  Quasi-doublons visuels (pHash): {MOVED_PHASH:>6}  → quarantine/phash_review/",
        f"  Doublons intra-split (MD5)   : {MOVED_INTRA_SPLIT:>7}  → quarantine/duplicates/",
        f"  Erreurs cross-classe         : {MOVED_CROSS_CLASS:>7}  → quarantine/cross_class_review/",
        "",
        "SECTION 3 — Proportions finales",
    ]
    for s in ["train", "val", "test"]:
        n   = by_split.get(s, 0)
        pct = n / total * 100 if total else 0
        lines.append(f"  {s:5} : {n:>7} images ({pct:.1f}%)")

    lines += ["", "SECTION 4 — Classes protégées (< 1 500 images après nettoyage)"]
    weak_classes = {c: n for c, n in by_class.items() if n < 1500}
    if weak_classes:
        lines.append(f"  {'Classe':<48} {'Total':>6}")
        for c, n in sorted(weak_classes.items(), key=lambda x: x[1]):
            flag = "  ⚠ SOUS SEUIL" if n < MIN_CLASS_SIZE else ""
            lines.append(f"  {c:<48} {n:>6}{flag}")
    else:
        lines.append("  Toutes les classes ≥ 1 500 images ✅")

    lines += [
        "",
        "SECTION 5 — Alertes revue manuelle",
        f"  Groupes cross-classe  : {len(CROSS_CLASS_CASES):>5}  → quarantine/cross_class_review/",
        f"  Quasi-doublons visuels: {len(PHASH_CASES):>5}  → quarantine/phash_review/",
        f"  Suppressions annulées : {CANCELLED:>5}  → quarantine/reports/weak_classes_alerts.txt",
        "",
        "SECTION 6 — Vérification finale (post-nettoyage)",
        f"  Leakages MD5 cross-split restants : {stats['leakages_md5']}  "
        f"{'✅' if stats['leakages_md5'] == 0 else '❌'}",
        f"  Doublons intra-split restants     : {stats['intra_remaining']}  "
        f"{'✅' if stats['intra_remaining'] == 0 else '⚠️'}",
        f"  Classes sous {MIN_CLASS_SIZE} images           : "
        f"{stats['weak'] or 'aucune'}  {'✅' if not stats['weak'] else '❌'}",
        "=" * 72,
    ]

    txt = "\n".join(lines)
    (REPORTS_DIR / "cleanup_report.txt").write_text(txt, encoding="utf-8")
    log.info("\n" + txt)

# ─────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────
def main():
    log.info("=" * 70)
    log.info("NETTOYAGE POST-TRAITEMENT — dataset_final/")
    log.info("=" * 70)

    if not HAS_IMAGEHASH:
        log.warning("imagehash non installé → pHash désactivé (MD5 uniquement)")
        log.warning("  pip install imagehash   pour activer la détection visuelle")

    for d in ["duplicates", "cross_split", "cross_class_review", "phash_review"]:
        (QUARANTINE_DIR / d).mkdir(parents=True, exist_ok=True)

    # ── Chargement ────────────────────────────────────────────────────
    files  = list_images(DATASET_DIR)
    before = len(files)
    log.info(f"Total images à traiter : {before}")
    sizes = class_size_map(files)

    # ── Passe MD5 ─────────────────────────────────────────────────────
    log.info("=" * 60)
    log.info("PASSE MD5 — doublons exacts")
    log.info("=" * 60)
    md5_map = build_md5_index(files)
    process_md5(md5_map, sizes)
    log.info(f"  Après MD5 : cross_split={MOVED_CROSS_SPLIT}  "
             f"intra={MOVED_INTRA_SPLIT}  cross_class={MOVED_CROSS_CLASS}")

    # ── Passe pHash ───────────────────────────────────────────────────
    if HAS_IMAGEHASH:
        log.info("=" * 60)
        log.info("PASSE pHash — quasi-doublons visuels cross-split")
        log.info("=" * 60)
        files_rem = list_images(DATASET_DIR)
        sizes     = class_size_map(files_rem)
        phash_idx = build_phash_index_by_class(files_rem)
        process_phash(phash_idx, sizes)
        log.info(f"  Après pHash : {MOVED_PHASH} images déplacées")

    # ── Vérification ──────────────────────────────────────────────────
    stats = final_verification()

    # ── Rapports ──────────────────────────────────────────────────────
    write_reports(before, stats)

    log.info(f"\n[OK] Quarantine : {QUARANTINE_DIR.resolve()}")
    log.info(f"[OK] Rapports   : {REPORTS_DIR.resolve()}")


if __name__ == "__main__":
    main()
