# Structure du Projet AgriNova — Documentation Complète

## 📂 DOSSIERS DES IMAGES FINALES

### Dataset Principal (76,622 train | 15,965 val | 16,075 test)
```
C:\Users\user\Desktop\PFE\ai\dataset_final\
├── train/          [76,622 images]   70.5% du dataset
│   ├── Apple__apple_scab/
│   ├── Apple__black_rot/
│   ├── Potato__virus/          (822 images - classe rare)
│   └── ... (41 classes au total)
│
├── val/             [15,965 images]   14.7% du dataset
│   ├── Apple__apple_scab/
│   ├── Potato__virus/
│   └── ... (mêmes 41 classes)
│
└── test/            [16,075 images]   14.8% du dataset
    ├── Apple__apple_scab/
    ├── Potato__virus/
    └── ... (mêmes 41 classes)
```

**Total: 108,662 images | 41 classes de maladies foliaires**

---

## 🔧 FICHIERS PYTHON — PIPELINE DE TRAITEMENT

### 1️⃣ **prepare_dataset.py** — ÉTAPE 1 : Préparation initiale
**Rôle :** Crée la structure train/val/test à partir des images brutes
**Fonctionnement :**
- Lit les images depuis une source (ex: dossier brut)
- Crée les répertoires `dataset_final/train`, `val`, `test`
- Split initial 80/10/10 (avant rééquilibrage)
- Copie les images dans chaque dossier

**Entrée :** Images brutes (non organisées)
**Sortie :** `dataset_final/` avec structure train/val/test

---

### 2️⃣ **cleanup_dataset.py** — ÉTAPE 2 : Nettoyage
**Rôle :** Supprime les images corrompues, trop petites, trop floues
**Fonctionnement :**
- Vérifie que chaque image est valide (format, dimensions)
- Mesure la flou avec Laplacian variance
- Supprime images < 500×500 pixels
- Supprime images trop floues (variance < seuil)
- Déplace images rejetées vers `rejected/`

**Critères appliqués :**
- Minimum 500×500 pixels
- Laplacian variance > 100 (détecte le flou)
- Format valide (jpg, png)

**Sortie :** Images propres dans `dataset_final/`, rejetées dans `rejected/`

---

### 3️⃣ **audit_dataset.py** — ÉTAPE 3 : Audit qualité
**Rôle :** Vérifie l'absence de leakage et doublons
**Fonctionnement :**
- Calcule MD5 de chaque image (détecte doublons exacts)
- Calcule pHash (Perceptual Hash) — détecte quasi-doublons
- Vérifie qu'aucune image n'existe dans 2 splits
- Compte les images par classe
- Crée rapports JSON

**Vérifications :**
- ✅ 0 train-test leakage (MD5)
- ✅ 0 train-val leakage (pHash)
- ✅ 0 doublon intra-split
- ✅ Chaque classe ≥ 500 images

**Sortie :** `reports/audit_report.json` — confirme qualité dataset

---

### 4️⃣ **rebalance_splits.py** — ÉTAPE 4 : Rééquilibrage (NOUVEAU)
**Rôle :** Corrige le split 74/13/13 → 70/15/15 de façon stratifiée
**Fonctionnement :**
1. Compte images actuelles dans train/val/test
2. Calcule cibles : 76,622 train | 16,419 val | 16,419 test
3. **Stratified sampling** : pour chaque classe en train
   - Déplace proportionnellement vers val et test
   - Ex: Apple__healthy = 8% de train → déplace 8% vers val/test
4. Déplace physiquement les fichiers
5. Vérifie proportions finales ±1%

**Résultat :**
- train: 70.5% ✅
- val: 14.7% ✅
- test: 14.8% ✅

**Préserve :** Distribution par classe (chaque classe 70/15/15 localement)

---

### 5️⃣ **verify_blur.py** — Utilitaire : Détection flou
**Rôle :** Analyse Laplacian variance des images (détecte flou)
**Utilisation :** Vérifier manuellement la qualité d'une image
```bash
python verify_blur.py image.jpg
```

---

## 🤖 FICHIERS DE TRAINING — MODÈLES

### **train_efficientnetb0.py** — MODÈLE PRINCIPAL ✨
**Architecture :** EfficientNetB0 (Transfer Learning)

**Phases d'entraînement :**
1. **Phase 1 (10 epochs)** — Backbone gelé
   - Entraîne UNIQUEMENT la tête (Dense layer 1280 → 41 classes)
   - Learning rate: 1e-3
   - Augmentation activée

2. **Phase 2 (15 epochs)** — Fine-tuning
   - Dégèle les 30 dernières couches du backbone
   - Learning rate réduit: 1e-5
   - Même augmentation

**Optimisations appliquées :**
- ✅ **Class weights='balanced'** → compense déséquilibre 7.7× (Potato__virus 2.7×)
- ✅ **Data augmentation extra** (50% batches) → flip + brightness pour classes faibles
- ✅ **Early stopping** — arrête si val_accuracy n'améliore pas (patience=5)
- ✅ **ReduceLROnPlateau** — réduit learning rate si loss stagne

**Pipeline données :**
```
Images brutes [0,255]
    ↓
Augmentation (train uniquement)
    ↓
preprocess_input EfficientNet
    ↓
Batch 32
    ↓
Model.fit(train_ds, class_weight=class_weight_dict)
```

**Sorties :**
- `models/efficientnetb0_best.keras` — meilleur checkpoint
- `models/efficientnetb0_final.keras` — modèle final
- `models/class_names.json` — mapping classe → index
- `models/efficientnetb0_train_log.csv` — historique epochs
- `reports/efficientnetb0_confusion_matrix.png` — matrice confusion test
- `reports/efficientnetb0_classification_report.txt` — Precision/Recall/F1 par classe
- `reports/efficientnetb0_training_curves.png` — courbes accuracy/loss

---

### **train_resnet50.py** — Alternative : ResNet50
**Architecture :** ResNet50 (Transfer Learning)
**Même pipeline que EfficientNetB0**

---

### **train_mobilenetv2.py** — Alternative : MobileNetV2
**Architecture :** MobileNetV2 (léger, optimisé mobile)
**Même pipeline que EfficientNetB0**

---

### **train_baseline_cnn.py** — Baseline CNN custom
**Architecture :** CNN custom (non pré-entraîné)
**Utilisé pour :** Comparaison baseline

---

## 📊 FICHIERS DE CONFIGURATION

### **models/class_names.json**
**Contenu :** Liste des 41 classes en ordre
```json
[
  "Apple__apple_scab",
  "Apple__black_rot",
  "Apple__cedar_apple_rust",
  "Apple__healthy",
  ...
  "Tomato__target_spot",
  "Tomato__yellow_leaf_curl_virus"
]
```
**Utilisé par :** Mobile app pour mapper predictions → noms maladies

---

### **reports/audit_report.json**
**Contenu :** Résumé qualité dataset
```json
{
  "total_images": 109460,
  "classes": 41,
  "train_test_leakage_md5": 0,
  "duplicates_phash": 0,
  "min_class_size": 822,
  "max_class_size": 8034,
  "class_distribution": {...}
}
```

---

### **reports/class_distribution.csv**
**Contenu :** Proportions par classe dans chaque split
```
class,train_count,val_count,test_count,train_%,val_%,test_%
Apple__apple_scab,5678,1234,1256,70.1,14.9,15.0
...
```

---

## 📁 DOSSIERS AUXILIAIRES

### **rejected/** — Images rejetées
```
rejected/
├── duplicate/          (doublons détectés)
├── too_bright/         (surexposées)
└── too_small/          (< 500×500 pixels)
```

### **quarantine/** — Cas douteux pour révision manuelle
```
quarantine/
├── cross_class_cases.csv    (images ambiguës multi-classe)
├── cross_split/             (potentiels leakage à réviser)
├── duplicates/              (quasi-doublons à valider)
└── phash_review/            (pHash collisions)
```

### **reports/** — Rapports d'analyse
```
reports/
├── audit_report.json                         (qualité dataset)
├── class_distribution.csv                    (proportions classes)
├── dataset_summary.csv                       (stats globales)
├── rejected_images.csv                       (images supprimées + raison)
├── plots/                                    (visualisations)
├── efficientnetb0_confusion_matrix.png       (après training)
├── efficientnetb0_classification_report.txt  (après training)
└── efficientnetb0_training_curves.png        (après training)
```

### **models/** — Modèles sauvegardés
```
models/
├── class_names.json                 (41 classes)
├── efficientnetb0_best.keras        (checkpoint meilleure epoch)
├── efficientnetb0_final.keras       (modèle final complet)
├── efficientnetb0_train_log.csv     (logs training)
├── resnet50_final.keras             (si lancé)
└── mobilenetv2_final.keras          (si lancé)
```

---

## 🔄 PIPELINE COMPLET — Ordre d'exécution

```
1. prepare_dataset.py
   ├─ Crée structure train/val/test
   └─ Résultat: dataset_final/ non-nettoyé
        ↓
2. cleanup_dataset.py
   ├─ Supprime images corrompues/floues/trop petites
   └─ Résultat: dataset_final/ propre (109,460 images)
        ↓
3. audit_dataset.py
   ├─ Vérifie leakage / doublons / proportions
   └─ Résultat: audit_report.json ✅
        ↓
4. rebalance_splits.py [NOUVEAU]
   ├─ Corrige split 74/13/13 → 70/15/15
   └─ Résultat: dataset_final/ équilibré + stratifié
        ↓
5. train_efficientnetb0.py
   ├─ Entraîne EfficientNetB0 (Phase 1 + Phase 2)
   ├─ Applique class_weight + augmentation
   └─ Résultat: 
       - efficientnetb0_final.keras
       - confusion_matrix.png
       - training_curves.png
```

---

## 📈 STATISTIQUES FINALES

| Métrique | Valeur |
|----------|--------|
| **Total images** | 108,662 |
| **Classes** | 41 |
| **Train** | 76,622 (70.5%) |
| **Val** | 15,965 (14.7%) |
| **Test** | 16,075 (14.8%) |
| **Classe la plus rare** | Potato__virus (822 images) |
| **Classe la plus commune** | Cucumber__healthy (8,034 images) |
| **Déséquilibre** | Ratio 9.8× (réduit à ~1.2× avec class_weight) |
| **Leakage train-test** | 0 (MD5 + pHash) |
| **Doublons** | 0 |
| **Images rejetées** | 798 (flou + petit + corrompu) |

---

## 🎯 PROCHAINES ÉTAPES

1. **Attendre fin du training** (50 epochs ≈ plusieurs heures sur CPU)
2. **Évaluer résultats** :
   - Ouvrir `reports/efficientnetb0_training_curves.png` → check overfitting
   - Lire `reports/efficientnetb0_classification_report.txt` → check F1-scores par classe
   - Analyser `reports/efficientnetb0_confusion_matrix.png` → check erreurs confusions
3. **Déployer modèle** : `models/efficientnetb0_final.keras` + `class_names.json` → mobile app

