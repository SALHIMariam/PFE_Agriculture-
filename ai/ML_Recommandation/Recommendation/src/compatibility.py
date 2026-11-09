"""
Matrice de compatibilité plante x gouvernorat.

C'est une règle métier agronomique, pas un modèle appris. Elle répond à une
seule question : est-ce que cette culture est adaptée à ce gouvernorat ?

Trois niveaux :
  FAVORABLE   (2) — culture bien adaptée, pratiquée couramment dans la région
  ADAPTABLE   (1) — possible mais demande des précautions (irrigation, variétés)
  DEFAVORABLE (0) — climat inadapté, culture à risque élevé

Pour la décision binaire des 4 cas, FAVORABLE et ADAPTABLE sont regroupés
en « région favorable » ; seul DEFAVORABLE bascule vers les CAS 3 / CAS 4.
Le niveau fin reste exposé dans la réponse pour nuancer le conseil.

Source : zonage agro-climatique tunisien (Nord humide / Centre semi-aride /
Sud aride), croisé avec les exigences hydriques et thermiques de chaque
culture. À faire valider par un agronome avant citation dans le mémoire.
"""
from __future__ import annotations

from src import config

FAVORABLE = 2
ADAPTABLE = 1
DEFAVORABLE = 0

LEVEL_NAME = {
    FAVORABLE: "favorable",
    ADAPTABLE: "adaptable",
    DEFAVORABLE: "defavorable",
}

LEVEL_LABEL_FR = {
    FAVORABLE: "Favorable",
    ADAPTABLE: "Adaptable avec précautions",
    DEFAVORABLE: "Défavorable",
}

# Exigences agronomiques par culture — sert à documenter la matrice.
CROP_REQUIREMENTS = {
    "Apple": {
        "besoin_froid": "800-1200 heures de froid (< 7 °C) en hiver",
        "eau": "élevé, 700-800 mm/an ou irrigation équivalente",
        "limite": "ne fructifie pas correctement sans froid hivernal suffisant",
    },
    "Bean": {
        "besoin_froid": "aucun — sensible au gel",
        "eau": "moyen, 300-500 mm sur le cycle",
        "limite": "avorte au-dessus de 32 °C pendant la floraison",
    },
    "Corn": {
        "besoin_froid": "aucun",
        "eau": "élevé, 500-800 mm sur le cycle, critique à la floraison",
        "limite": "très sensible au stress hydrique au stade tassel",
    },
    "Cucumber": {
        "besoin_froid": "aucun — culture de saison chaude",
        "eau": "élevé et régulier, irrigation obligatoire",
        "limite": "fruits amers et déformés si arrosage irrégulier",
    },
    "Grape": {
        "besoin_froid": "150-400 heures selon cépage",
        "eau": "faible à moyen, tolère la sécheresse une fois installée",
        "limite": "excès d'humidité favorise mildiou et pourriture",
    },
    "Groundnut": {
        "besoin_froid": "aucun — culture tropicale",
        "eau": "moyen, 500-700 mm, sols sableux drainants",
        "limite": "exige des sols légers pour la pénétration des gynophores",
    },
    "Potato": {
        "besoin_froid": "optimum de tubérisation 15-20 °C",
        "eau": "élevé et régulier",
        "limite": "arrête de tubériser au-dessus de 30 °C",
    },
    "Tomato": {
        "besoin_froid": "aucun",
        "eau": "élevé, irrigation goutte-à-goutte recommandée",
        "limite": "nouaison bloquée au-dessus de 35 °C",
    },
    "Wheat": {
        "besoin_froid": "vernalisation pour les blés d'hiver",
        "eau": "moyen, 350-500 mm, pluvial possible au Nord",
        "limite": "échaudage si coup de chaleur au remplissage du grain",
    },
}

# ---------------------------------------------------------------------------
# La matrice — 9 plantes x 24 gouvernorats
# ---------------------------------------------------------------------------
_N = "Nord"
_C = "Centre"
_S = "Sud"

# Valeur par défaut appliquée à toute la zone, puis exceptions nommées.
_ZONE_DEFAULT: dict[str, dict[str, int]] = {
    "Apple":     {_N: FAVORABLE,   _C: ADAPTABLE,   _S: DEFAVORABLE},
    "Bean":      {_N: FAVORABLE,   _C: ADAPTABLE,   _S: DEFAVORABLE},
    "Corn":      {_N: FAVORABLE,   _C: ADAPTABLE,   _S: DEFAVORABLE},
    "Cucumber":  {_N: FAVORABLE,   _C: FAVORABLE,   _S: ADAPTABLE},
    "Grape":     {_N: FAVORABLE,   _C: FAVORABLE,   _S: DEFAVORABLE},
    "Groundnut": {_N: ADAPTABLE,   _C: FAVORABLE,   _S: ADAPTABLE},
    "Potato":    {_N: FAVORABLE,   _C: ADAPTABLE,   _S: DEFAVORABLE},
    "Tomato":    {_N: FAVORABLE,   _C: FAVORABLE,   _S: ADAPTABLE},
    "Wheat":     {_N: FAVORABLE,   _C: ADAPTABLE,   _S: DEFAVORABLE},
}

# Exceptions justifiées gouvernorat par gouvernorat.
_EXCEPTIONS: dict[tuple[str, str], int] = {
    # Pommier — le froid hivernal manque dès le Centre ; Kasserine (altitude) tient
    ("Apple", "Kasserine"): FAVORABLE,
    ("Apple", "Siliana"): FAVORABLE,
    ("Apple", "Sfax"): DEFAVORABLE,
    ("Apple", "Mahdia"): DEFAVORABLE,
    ("Apple", "Monastir"): DEFAVORABLE,
    ("Apple", "Sousse"): DEFAVORABLE,

    # Vigne — Cap Bon et Sahel historiques ; oasis exclues
    ("Grape", "Nabeul"): FAVORABLE,
    ("Grape", "Kebili"): DEFAVORABLE,
    ("Grape", "Tozeur"): DEFAVORABLE,
    ("Grape", "Gabes"): ADAPTABLE,

    # Arachide — sols sableux du Centre-Est, tradition à Sfax et Sidi Bouzid
    ("Groundnut", "Sfax"): FAVORABLE,
    ("Groundnut", "Sidi Bouzid"): FAVORABLE,
    ("Groundnut", "Kairouan"): FAVORABLE,
    ("Groundnut", "Tataouine"): DEFAVORABLE,

    # Blé — céréaliculture du Nord-Ouest, marginale au Sud
    ("Wheat", "Beja"): FAVORABLE,
    ("Wheat", "Jendouba"): FAVORABLE,
    ("Wheat", "Kef"): FAVORABLE,
    ("Wheat", "Siliana"): FAVORABLE,
    ("Wheat", "Kairouan"): FAVORABLE,
    ("Wheat", "Sfax"): DEFAVORABLE,

    # Tomate — Nabeul et Sidi Bouzid sont les bassins majeurs
    ("Tomato", "Nabeul"): FAVORABLE,
    ("Tomato", "Sidi Bouzid"): FAVORABLE,
    ("Tomato", "Gabes"): FAVORABLE,   # oasis maraîchères
    ("Tomato", "Tataouine"): DEFAVORABLE,
    ("Tomato", "Kebili"): ADAPTABLE,

    # Concombre — sous serre au Sud, oasis de Gabès très productives
    ("Cucumber", "Gabes"): FAVORABLE,
    ("Cucumber", "Tataouine"): DEFAVORABLE,

    # Pomme de terre — Chott Mariem, Cap Bon, Jendouba
    ("Potato", "Nabeul"): FAVORABLE,
    ("Potato", "Sousse"): FAVORABLE,
    ("Potato", "Monastir"): FAVORABLE,
    ("Potato", "Mahdia"): FAVORABLE,
    ("Potato", "Tataouine"): DEFAVORABLE,

    # Maïs — irrigué seulement, jamais en pluvial au Centre-Sud
    ("Corn", "Kairouan"): ADAPTABLE,
    ("Corn", "Tataouine"): DEFAVORABLE,
    ("Corn", "Kebili"): DEFAVORABLE,
    ("Corn", "Tozeur"): DEFAVORABLE,

    # Haricot — sensible à la chaleur, se limite au Nord et littoral tempéré
    ("Bean", "Nabeul"): FAVORABLE,
    ("Bean", "Sousse"): ADAPTABLE,
    ("Bean", "Tataouine"): DEFAVORABLE,
    ("Bean", "Kebili"): DEFAVORABLE,
    ("Bean", "Tozeur"): DEFAVORABLE,
}


def _build_matrix() -> dict[str, dict[str, int]]:
    matrix: dict[str, dict[str, int]] = {}
    for plant in config.PLANTS:
        row: dict[str, int] = {}
        for gov in config.GOVERNORATES:
            zone = config.GOVERNORATE_ZONE[gov]
            row[gov] = _EXCEPTIONS.get((plant, gov), _ZONE_DEFAULT[plant][zone])
        matrix[plant] = row
    return matrix


MATRIX: dict[str, dict[str, int]] = _build_matrix()


def compatibility_level(plant: str, governorate: str) -> int:
    """Retourne FAVORABLE / ADAPTABLE / DEFAVORABLE."""
    try:
        return MATRIX[plant][governorate]
    except KeyError as exc:
        raise KeyError(f"Combinaison inconnue : {plant} / {governorate}") from exc


def is_region_favorable(plant: str, governorate: str) -> bool:
    """Décision binaire pour l'aiguillage des 4 cas."""
    return compatibility_level(plant, governorate) != DEFAVORABLE


def explain(plant: str, governorate: str) -> dict:
    level = compatibility_level(plant, governorate)
    zone = config.GOVERNORATE_ZONE[governorate]
    return {
        "plante": config.PLANTS_FR.get(plant, plant),
        "gouvernorat": governorate,
        "zone": zone,
        "zone_description": config.ZONE_DESCRIPTION[zone],
        "niveau": LEVEL_NAME[level],
        "niveau_label": LEVEL_LABEL_FR[level],
        "score": level,
        "favorable": level != DEFAVORABLE,
        "exigences": CROP_REQUIREMENTS[plant],
    }


def as_dataframe():
    """Matrice complète en DataFrame — pour l'annexe du mémoire."""
    import pandas as pd

    return pd.DataFrame(
        {plant: {gov: LEVEL_LABEL_FR[MATRIX[plant][gov]] for gov in config.GOVERNORATES}
         for plant in config.PLANTS}
    )


def summary() -> dict:
    counts = {"favorable": 0, "adaptable": 0, "defavorable": 0}
    for plant in config.PLANTS:
        for gov in config.GOVERNORATES:
            counts[LEVEL_NAME[MATRIX[plant][gov]]] += 1
    return {
        "n_plantes": len(config.PLANTS),
        "n_gouvernorats": len(config.GOVERNORATES),
        "n_combinaisons": len(config.PLANTS) * len(config.GOVERNORATES),
        "repartition": counts,
    }


if __name__ == "__main__":
    import json

    print(json.dumps(summary(), indent=2, ensure_ascii=False))
    print()
    print(as_dataframe().to_string())
