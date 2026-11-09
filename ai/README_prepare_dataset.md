# Préparation Dataset — PFE Détection maladies foliaires

Pipeline complet de nettoyage / filtrage / normalisation / split d'un dataset
d'images de feuilles de plantes pour entraîner un modèle Deep Learning.

## Installation

```bash
pip install -r requirements.txt
# Filtre IA (au choix) :
pip install tensorflow      # ou
pip install torch torchvision
```

## Structure attendue (entrée)

```
dataset_raw/
├── Tomato/
│   ├── healthy/
│   ├── early_blight/
│   └── late_blight/
├── Potato/
│   ├── healthy/
│   └── late_blight/
└── Apple/
    ├── healthy/
    └── scab/
```

## Lancer le pipeline

```bash
# Pipeline complet (par défaut)
python prepare_dataset.py --raw dataset_raw --out dataset_clean

# Sans filtre IA (plus rapide, moins précis)
python prepare_dataset.py --no-ai

# Avec data augmentation sur train/
python prepare_dataset.py --augment

# Exclure certaines classes
python prepare_dataset.py --exclude Tomato__healthy Apple__scab

# Exclure des plantes entières
python prepare_dataset.py --exclude-plants Apple

# Avec génération d'aperçus visuels
python prepare_dataset.py --visualize
```

## Sortie

```
dataset_clean/
├── train/   (70%)
├── val/     (15%)
├── test/    (15%)
├── samples/ (aperçus si --visualize)
├── report.json
└── report.txt
```

## Pipeline (7 étapes)

1. **Indexation** du dataset brut (plante × maladie)
2. **Nettoyage qualité** : corrompues, taille, flou (Laplacien), luminosité, doublons (phash)
3. **Filtre IA** : MobileNetV2 sur ImageNet → garde feuilles/plantes uniquement
4. **Normalisation** : 224×224, RGB, JPEG qualité 92, EXIF corrigé
5. **Restructuration** : `Plant__disease` (ex: `Tomato__late_blight`)
6. **Split** : 70 / 15 / 15 (seed reproductible)
7. **Augmentation** (optionnelle) + **rapport JSON/TXT** + **visualisations**

## Personnalisation

Modifier la classe `Config` en haut de `prepare_dataset.py` :
- seuils (flou, luminosité, hash)
- ratios train/val/test
- liste de classes/plantes exclues
- paramètres d'augmentation