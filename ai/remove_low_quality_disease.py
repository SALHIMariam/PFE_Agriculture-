#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
 remove_low_quality_disease.py  [VERSION CIBLÉE]
 -----------------------------------------------------------------------------
 Projet PFE  : Détection des maladies foliaires
 Rôle        : Détecte et archive les images de mauvaise qualité
               UNIQUEMENT sur les classes ayant >= MIN_ORIG_IMAGES originales

 Seuil de ciblage : MIN_ORIG_IMAGES = 3500
 Classes concernées (automatiquement détectées) :
   - Apple__apple_scab   (5319 originales)
   - Cucumber__healthy   (4396 originales)

 6 critères de détection :
   1. Flou         : Laplacien < 12
   2. Uniformité   : std pixels < 18 (maladie non visible)
   3. Trop sombre  : luminosité < 30
   4. Surexposé    : luminosité > 235
   5. Texture      : gradients Sobel < 5 (image trop lointaine)
   6. Maladie inv. : signal HSV < 2% (désactivé pour classes healthy)

 Rejet si >= REJECT_SCORE critères échouent (défaut = 2)

 Sécurités :
   - Non-destructif : archivé dans low_quality_archive/
   - MIN_CLASS_SIZE  : ne jamais descendre sous ce nombre
   - --dry-run      : stats sans déplacer
   - --preview      : page HTML de vérification visuelle

 Auteur     : Mariem Salhi
 Usage      : python remove_low_quality_disease.py --dry-run
              python remove_low_quality_disease.py --preview
              python remove_low_quality_disease.py
================================================================================
"""

import argparse
import base64
from collections import defaultdict
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from tqdm import tqdm

# =============================================================================
#                          PARAMÈTRES
# =============================================================================

DATASET_DIR      = Path(r"C:\Users\user\Desktop\PFE\ai\dataset_final")
ARCHIVE_DIR      = Path(r"C:\Users\user\Desktop\PFE\ai\low_quality_archive")
REPORTS_DIR      = Path(r"C:\Users\user\Desktop\PFE\ai\reports")
SPLITS           = ["train", "val", "test"]

# ── Seuil de ciblage ────────────────────────────────────────────────
# Seules les classes avec >= MIN_ORIG_IMAGES images ORIGINALES
# (non-AUG_) dans train/ sont analysées
MIN_ORIG_IMAGES  = 3500

# ── Seuils de qualité ───────────────────────────────────────────────
THRESH_BLUR       = 12.0    # Laplacien < 12 → flou
THRESH_UNIFORMITY = 18.0    # std < 18 → trop uniforme
THRESH_DARK       = 30.0    # luminosité < 30 → trop sombre
THRESH_BRIGHT     = 235.0   # luminosité > 235 → surexposé
THRESH_TEXTURE    = 5.0     # Sobel < 5 → texture trop faible
REJECT_SCORE      = 2       # ≥ 2 critères échoués = rejet

# ── Protection ──────────────────────────────────────────────────────
MIN_CLASS_SIZE    = 200     # ne jamais descendre sous ce nb d'images

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)


# =============================================================================
#                          DÉTECTION DES CLASSES CIBLES
# =============================================================================

def find_target_classes() -> list[str]:
    """
    Détecte automatiquement les classes ayant >= MIN_ORIG_IMAGES
    images ORIGINALES (non-AUG_) dans train/.
    """
    targets = []
    train_dir = DATASET_DIR / "train"
    if not train_dir.exists():
        return targets

    for cls_dir in sorted(train_dir.iterdir()):
        if not cls_dir.is_dir():
            continue
        originals = [p for p in cls_dir.glob("*.jpg")
                     if not p.name.startswith("AUG_")]
        if len(originals) >= MIN_ORIG_IMAGES:
            targets.append(cls_dir.name)

    return targets


# =============================================================================
#                          MÉTRIQUES DE QUALITÉ
# =============================================================================

def analyze_image(path: Path, is_healthy_class: bool = False) -> dict:
    """
    Calcule toutes les métriques de qualité pour une image.
    Retourne un dict avec scores, flags, et décision de rejet.
    """
    result = {
        "path":           path,
        "readable":       False,
        "leaf_ratio":     0.0,
        "blur_score":     0.0,
        "uniformity":     0.0,
        "brightness":     0.0,
        "texture":        0.0,
        "disease_signal": 0.0,
        "score":          0,
        "flags":          [],
        "rejected":       False,
    }

    try:
        img_bgr = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if img_bgr is None or img_bgr.size == 0:
            result["flags"].append("illisible")
            result["score"] = 3
            result["rejected"] = True
            return result

        result["readable"] = True
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

        # ── 1. Masque feuille ────────────────────────────────────────
        mask = gray > 25
        leaf_ratio = float(mask.sum()) / float(mask.size)
        result["leaf_ratio"] = leaf_ratio

        if leaf_ratio < 0.10:
            result["flags"].append("pas_de_feuille")
            result["score"] += 2
            result["rejected"] = True
            return result

        leaf_pixels = gray[mask]

        # ── 2. Flou ──────────────────────────────────────────────────
        lap = cv2.Laplacian(gray, cv2.CV_64F)
        blur_score = float(lap[mask].var()) if mask.any() else 0.0
        result["blur_score"] = blur_score
        if blur_score < THRESH_BLUR:
            result["flags"].append("flou")
            result["score"] += 1

        # ── 3. Uniformité ────────────────────────────────────────────
        uniformity = float(np.std(leaf_pixels))
        result["uniformity"] = uniformity
        if uniformity < THRESH_UNIFORMITY:
            result["flags"].append("trop_uniforme")
            result["score"] += 1

        # ── 4. Luminosité ────────────────────────────────────────────
        brightness = float(np.mean(leaf_pixels))
        result["brightness"] = brightness
        if brightness < THRESH_DARK:
            result["flags"].append("trop_sombre")
            result["score"] += 1
        elif brightness > THRESH_BRIGHT:
            result["flags"].append("surexpose")
            result["score"] += 1

        # ── 5. Texture (gradients Sobel) ─────────────────────────────
        sx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        texture = float(np.mean(np.sqrt(sx**2 + sy**2)[mask])) if mask.any() else 0.0
        result["texture"] = texture
        if texture < THRESH_TEXTURE:
            result["flags"].append("texture_faible")
            result["score"] += 1

        # ── 6. Signal maladie (HSV) — désactivé pour healthy ─────────
        if not is_healthy_class:
            hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
            s_leaf = hsv[:, :, 1][mask]
            v_leaf = hsv[:, :, 2][mask]
            low_sat   = float(np.mean(s_leaf < 40))
            high_sat  = float(np.mean(s_leaf > 180))
            dark_spot = float(np.mean(v_leaf < 60))
            disease_signal = low_sat + high_sat + dark_spot
            result["disease_signal"] = disease_signal
            if disease_signal < 0.02 and uniformity < 25.0:
                result["flags"].append("maladie_invisible")
                result["score"] += 1

        result["rejected"] = result["score"] >= REJECT_SCORE

    except Exception as e:
        result["flags"].append(f"erreur")
        result["score"] = 3
        result["rejected"] = True

    return result


# =============================================================================
#                          SCAN DES CLASSES CIBLES
# =============================================================================

def scan_targeted(target_classes: list[str]) -> dict:
    """
    Analyse uniquement les classes cibles sur train/val/test.
    Retourne {split: {classe: [result_dict, ...]}}
    """
    all_results = defaultdict(lambda: defaultdict(list))
    total_scanned = 0
    total_rejected = 0

    for split in SPLITS:
        split_dir = DATASET_DIR / split
        if not split_dir.exists():
            continue

        print(f"\n{'─' * 65}")
        print(f"  [{split.upper()}]")
        print(f"{'─' * 65}")

        for cls_name in target_classes:
            cls_dir = split_dir / cls_name
            if not cls_dir.exists():
                continue

            is_healthy = "healthy" in cls_name.lower()
            imgs = (list(cls_dir.glob("*.jpg")) +
                    list(cls_dir.glob("*.jpeg")) +
                    list(cls_dir.glob("*.png")))

            rejected_cls = []
            for img_path in tqdm(imgs, desc=f"  {cls_name:<42}", leave=False):
                res = analyze_image(img_path, is_healthy_class=is_healthy)
                total_scanned += 1
                if res["rejected"]:
                    rejected_cls.append(res)
                    total_rejected += 1

            pct = len(rejected_cls) / len(imgs) * 100 if imgs else 0
            flags_count = defaultdict(int)
            for r in rejected_cls:
                for f in r["flags"]:
                    flags_count[f] += 1
            flag_str = " | ".join(f"{k}:{v}" for k, v in sorted(flags_count.items()))

            status = f"{len(rejected_cls):>5}/{len(imgs):>6}  ({pct:.1f}%)"
            if rejected_cls:
                status += f"  [{flag_str}]"
            print(f"  {cls_name:<45} : {status}")

            all_results[split][cls_name] = rejected_cls

    print(f"\n{'=' * 65}")
    print(f"  Total scanné   : {total_scanned:,}")
    print(f"  Total rejetées : {total_rejected:,} ({total_rejected/total_scanned*100:.1f}%)")
    print(f"{'=' * 65}")

    return all_results


# =============================================================================
#                          ARCHIVAGE
# =============================================================================

def archive_images(all_results: dict) -> dict:
    """Déplace les images rejetées vers low_quality_archive/."""
    import shutil
    stats = {"archived": 0, "protected": 0, "errors": 0}

    for split, classes in all_results.items():
        for cls_name, rejected_list in classes.items():
            if not rejected_list:
                continue

            cls_dir = DATASET_DIR / split / cls_name
            arc_dir = ARCHIVE_DIR / split / cls_name
            arc_dir.mkdir(parents=True, exist_ok=True)

            current    = len(list(cls_dir.glob("*.jpg")))
            max_remove = max(0, current - MIN_CLASS_SIZE)

            removed = 0
            for res in sorted(rejected_list, key=lambda x: -x["score"]):
                if removed >= max_remove:
                    stats["protected"] += 1
                    continue
                try:
                    p = res["path"]
                    if p.exists():
                        shutil.move(str(p), str(arc_dir / p.name))
                        removed += 1
                        stats["archived"] += 1
                except Exception:
                    stats["errors"] += 1

    return stats


# =============================================================================
#                          PAGE HTML PREVIEW
# =============================================================================

def img_to_b64(path: Path, size: int = 180) -> str:
    try:
        img = Image.open(path).convert("RGB")
        img.thumbnail((size, size), Image.LANCZOS)
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=75)
        return base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        return ""


def generate_preview(all_results: dict, n_per_class: int = 6):
    """Génère une page HTML de vérification visuelle."""
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    output = REPORTS_DIR / "low_quality_preview.html"

    sections = ""

    for split in SPLITS:
        if split not in all_results:
            continue
        for cls_name in sorted(all_results[split].keys()):
            rejected = all_results[split][cls_name]
            if not rejected:
                print(f"  [{split}] {cls_name} : 0 rejetées ✅")
                continue

            worst = sorted(rejected, key=lambda x: -x["score"])[:n_per_class]
            cards = ""
            for res in worst:
                b64 = img_to_b64(res["path"])
                if not b64:
                    continue
                score = res["score"]
                color = "#d32f2f" if score >= 3 else "#f57c00"
                flags = ", ".join(res["flags"])
                cards += f'''
                <div style="background:white;border-radius:8px;overflow:hidden;
                            border-top:5px solid {color};
                            box-shadow:0 2px 6px rgba(0,0,0,0.1)">
                  <img src="data:image/jpeg;base64,{b64}"
                       style="width:100%;height:165px;object-fit:cover;display:block"/>
                  <div style="padding:9px;font-size:11px">
                    <div style="font-weight:bold;color:{color};margin-bottom:4px">
                      Score : {score} / {REJECT_SCORE} — {flags}
                    </div>
                    <div style="color:#777;margin-top:3px;font-size:10px">
                      Lap:{res["blur_score"]:.1f} |
                      Std:{res["uniformity"]:.1f} |
                      Lum:{res["brightness"]:.0f} |
                      Tex:{res["texture"]:.1f}
                    </div>
                  </div>
                </div>'''

            if cards:
                sections += f'''
                <div style="background:white;padding:20px;border-radius:12px;
                            margin-bottom:24px;box-shadow:0 2px 10px rgba(0,0,0,0.08)">
                  <h2 style="color:#1976d2;margin:0 0 12px;font-size:16px;
                             border-bottom:2px solid #eee;padding-bottom:8px">
                    [{split}] {cls_name}
                    <span style="font-size:13px;color:#666;font-weight:normal">
                      — {len(rejected)} images à archiver
                      (top {len(worst)} affichées)
                    </span>
                  </h2>
                  <div style="display:grid;
                              grid-template-columns:repeat(auto-fill,minmax(190px,1fr));
                              gap:12px">
                    {cards}
                  </div>
                </div>'''

    html = f"""<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<title>Qualité images — PFE</title></head>
<body style="font-family:'Segoe UI',sans-serif;background:#f0f2f5;padding:20px;margin:0">
<h1 style="color:#2c3e50;border-bottom:4px solid #d32f2f;padding-bottom:10px">
  Vérification qualité — Classes ≥ {MIN_ORIG_IMAGES} originales
</h1>
<div style="background:#e3f2fd;padding:15px;border-radius:8px;margin-bottom:20px;
            border-left:4px solid #1976d2">
  <b>Classes analysées :</b> Apple__apple_scab · Cucumber__healthy<br>
  <b>Rejet si</b> ≥ {REJECT_SCORE} critères échoués sur 6.<br>
  <b>Cadre rouge</b> = score ≥ 3 (très mauvaise) |
  <b>Cadre orange</b> = score = 2 (mauvaise)
</div>
<div style="background:#fff3cd;padding:12px;border-radius:8px;margin-bottom:20px;
            border-left:4px solid #ffc107">
  <b>Si trop de faux positifs</b> (bonnes images rejetées) →
  augmente <code>REJECT_SCORE = 3</code><br>
  <b>Si pas assez de rejets</b> → baisse <code>REJECT_SCORE = 1</code>
</div>
{sections or '<p style="color:#666">Aucune image rejetée.</p>'}
</body></html>"""

    output.write_text(html, encoding="utf-8")
    print(f"\n[OK] Page HTML : {output}")
    import webbrowser
    try:
        webbrowser.open(str(output))
    except Exception:
        pass


# =============================================================================
#                          MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run",  action="store_true")
    parser.add_argument("--preview",  action="store_true")
    args = parser.parse_args()

    if not DATASET_DIR.exists():
        print(f"[ERREUR] Dataset introuvable : {DATASET_DIR}")
        return

    # Détecter les classes cibles
    target_classes = find_target_classes()
    if not target_classes:
        print(f"Aucune classe avec >= {MIN_ORIG_IMAGES} images originales trouvée.")
        return

    mode = "DRY-RUN" if args.dry_run else "PREVIEW" if args.preview else "ARCHIVAGE"
    print("=" * 65)
    print(f"  NETTOYAGE QUALITÉ — Classes ≥ {MIN_ORIG_IMAGES} originales")
    print("=" * 65)
    print(f"  Mode         : {mode}")
    print(f"  Splits       : {', '.join(SPLITS)}")
    print(f"  REJECT_SCORE : ≥ {REJECT_SCORE} critères échoués")
    print(f"\n  Classes ciblées ({len(target_classes)}) :")
    for cls in target_classes:
        train_dir = DATASET_DIR / "train" / cls
        n_orig = len([p for p in train_dir.glob("*.jpg")
                      if not p.name.startswith("AUG_")]) if train_dir.exists() else 0
        print(f"    - {cls:<45} ({n_orig:,} originales)")

    print()

    # Scan
    all_results = scan_targeted(target_classes)

    total = sum(
        len(v) for classes in all_results.values() for v in classes.values()
    )
    print(f"\n>>> Total à archiver : {total} images")

    if args.preview:
        generate_preview(all_results, n_per_class=6)
        return

    if args.dry_run:
        print("\n[DRY-RUN] Rien déplacé.")
        print("  Lance avec --preview pour vérifier visuellement.")
        print("  Lance sans flag pour appliquer.")
        return

    if total == 0:
        print("Aucune image à archiver.")
        return

    confirm = input(f"\nArchiver {total} images ? (o/N) : ")
    if confirm.lower() != "o":
        print("Annulé.")
        return

    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    stats = archive_images(all_results)

    print("\n" + "=" * 65)
    print("  RÉSULTAT FINAL")
    print("=" * 65)
    print(f"  Archivées       : {stats['archived']}")
    print(f"  Protégées (min) : {stats['protected']}")
    print(f"  Erreurs         : {stats['errors']}")
    print(f"\n[OK] Archives    : {ARCHIVE_DIR}")
    print(f"\nProchaine étape  : python audit_dataset_final.py")


if __name__ == "__main__":
    main()
