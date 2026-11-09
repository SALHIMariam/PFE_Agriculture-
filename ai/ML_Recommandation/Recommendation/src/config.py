"""
Configuration centrale — AgriDetect moteur de recommandation.

Deux entrées seulement, toutes deux automatiques :
  1. Gouvernorat  -> profil de l'utilisateur connecté (table `users`)
  2. Classe CNN   -> sortie de EfficientNetB0

Aucune saisie manuelle du fermier.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
ARTIFACTS_DIR = ROOT / "artifacts"
REPORTS_DIR = ROOT / "reports"

KB_FILE = DATA_DIR / "knowledge_base.json"
DATASET_FILE = DATA_DIR / "dataset_recommendation.csv"
MODEL_FILE = ARTIFACTS_DIR / "recommendation_model.joblib"
METADATA_FILE = ARTIFACTS_DIR / "model_metadata.json"
COMPARISON_FILE = REPORTS_DIR / "model_comparison.csv"

for _d in (DATA_DIR, ARTIFACTS_DIR, REPORTS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

RANDOM_STATE = 42

# ---------------------------------------------------------------------------
# Les 39 classes du dataset — format dossier `Plante__maladie` (double _)
# ---------------------------------------------------------------------------
CLASSES: list[str] = [
    "Apple__black_rot",
    "Apple__cedar_apple_rust",
    "Apple__healthy",
    "Apple__scab",
    "Bean__beans_angular_leaf_spot_disease",
    "Bean__beans_healthy_crop",
    "Bean__beans_rust_disease",
    "Corn__common_rust",
    "Corn__gray_leaf_spot",
    "Corn__healthy",
    "Corn__maize_streak_virus_disease",
    "Corn__northern_leaf_blight",
    "Cucumber__anthracnose",
    "Cucumber__downy_mildew",
    "Cucumber__gummy_stem_blight",
    "Cucumber__healthy",
    "Cucumber__powdery_mildew",
    "Grape__black_measles",
    "Grape__black_rot",
    "Grape__healthy",
    "Grape__leaf_blight",
    "Groundnut__early_leaf_spot",
    "Groundnut__healthy",
    "Groundnut__late_leaf_spot",
    "Groundnut__nutrition_deficiency",
    "Groundnut__rust",
    "Potato__early_blight",
    "Potato__healthy",
    "Potato__late_blight",
    "Tomato__bacterial_spot",
    "Tomato__early_blight",
    "Tomato__healthy",
    "Tomato__late_blight",
    "Tomato__septoria_leaf_spot",
    "Tomato__spider_mites_two_spotted_spider_mite",
    "Tomato__yellow_leaf_curl_virus",
    "Wheat__healthy",
    "Wheat__septoria",
    "Wheat__stripe_rust",
]

HEALTHY_CLASSES = {
    "Apple__healthy",
    "Bean__beans_healthy_crop",
    "Corn__healthy",
    "Cucumber__healthy",
    "Grape__healthy",
    "Groundnut__healthy",
    "Potato__healthy",
    "Tomato__healthy",
    "Wheat__healthy",
}

PLANTS = ["Apple", "Bean", "Corn", "Cucumber", "Grape",
          "Groundnut", "Potato", "Tomato", "Wheat"]

PLANTS_FR = {
    "Apple": "Pommier", "Bean": "Haricot", "Corn": "Maïs",
    "Cucumber": "Concombre", "Grape": "Vigne", "Groundnut": "Arachide",
    "Potato": "Pomme de terre", "Tomato": "Tomate", "Wheat": "Blé",
}

# ---------------------------------------------------------------------------
# Les 24 gouvernorats de Tunisie
# ---------------------------------------------------------------------------
GOVERNORATE_ZONE: dict[str, str] = {
    # Nord — humide, pluviométrie 400-1000 mm
    "Ariana": "Nord",
    "Beja": "Nord",
    "Ben Arous": "Nord",
    "Bizerte": "Nord",
    "Jendouba": "Nord",
    "Kef": "Nord",
    "Manouba": "Nord",
    "Nabeul": "Nord",
    "Tunis": "Nord",
    "Zaghouan": "Nord",
    # Centre — semi-aride, 200-400 mm
    "Kairouan": "Centre",
    "Kasserine": "Centre",
    "Mahdia": "Centre",
    "Monastir": "Centre",
    "Sfax": "Centre",
    "Sidi Bouzid": "Centre",
    "Siliana": "Centre",
    "Sousse": "Centre",
    # Sud — aride / saharien, < 200 mm
    "Gabes": "Sud",
    "Gafsa": "Sud",
    "Kebili": "Sud",
    "Medenine": "Sud",
    "Tataouine": "Sud",
    "Tozeur": "Sud",
}

GOVERNORATES = sorted(GOVERNORATE_ZONE)

ZONE_DESCRIPTION = {
    "Nord": "climat méditerranéen humide, pluviométrie 400-1000 mm/an",
    "Centre": "climat semi-aride, pluviométrie 200-400 mm/an",
    "Sud": "climat aride à saharien, pluviométrie inférieure à 200 mm/an",
}

# ---------------------------------------------------------------------------
# Vocabulaire des 4 cas
# ---------------------------------------------------------------------------
CASES = {
    ("healthy", "favorable"): "CAS_1",
    ("diseased", "favorable"): "CAS_2",
    ("healthy", "defavorable"): "CAS_3",
    ("diseased", "defavorable"): "CAS_4",
}

CASE_LABEL = {
    "CAS_1": "Plante saine — région favorable",
    "CAS_2": "Plante malade — région favorable",
    "CAS_3": "Plante saine — région défavorable",
    "CAS_4": "Plante malade — région défavorable",
}

CASE_RISK = {
    "CAS_1": "Faible",
    "CAS_2": "Élevé",
    "CAS_3": "Moyen",
    "CAS_4": "Critique",
}

CASE_MONITORING_DAYS = {"CAS_1": 14, "CAS_2": 3, "CAS_3": 7, "CAS_4": 2}

# ---------------------------------------------------------------------------
# Contrat de features partagé entraînement / inférence
# ---------------------------------------------------------------------------
CATEGORICAL_FEATURES = [
    "Predicted_Class",
    "Plant",
    "Disease",
    "Governorate",
    "Climate_Zone",
]

NUMERIC_FEATURES = [
    "Is_Healthy",
    "Region_Favorable",
    "Compatibility_Score",
]

FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES
TARGET = "Recommendation_ID"


def normalize_class(raw: str) -> str:
    """Accepte `Tomato__early_blight`, `Tomato_early_blight`, `tomato__early_blight`."""
    if not raw:
        raise ValueError("Le nom de classe est obligatoire")
    cleaned = raw.strip()
    lookup = {c.lower(): c for c in CLASSES}
    lookup.update({c.lower().replace("__", "_"): c for c in CLASSES})
    key = cleaned.lower()
    if key in lookup:
        return lookup[key]
    raise ValueError(
        f"Classe inconnue : '{raw}'. Attendu l'une des {len(CLASSES)} classes AgriDetect."
    )


def split_class(cls: str) -> tuple[str, str]:
    """`Apple__black_rot` -> ('Apple', 'black_rot')."""
    plant, disease = cls.split("__", 1)
    return plant, disease


def is_healthy(cls: str) -> bool:
    return cls in HEALTHY_CLASSES


def normalize_governorate(raw: str) -> str:
    """Tolère la casse et les accents absents (Beja / Béja, Gabes / Gabès)."""
    if not raw:
        raise ValueError("Le gouvernorat est obligatoire")
    table = str.maketrans("àâäéèêëîïôöùûüç", "aaaeeeeiioouuuc")
    key = raw.strip().lower().translate(table)
    lookup = {g.lower().translate(table): g for g in GOVERNORATES}
    if key in lookup:
        return lookup[key]
    raise ValueError(
        f"Gouvernorat inconnu : '{raw}'. Attendu l'un des 24 gouvernorats de Tunisie."
    )
