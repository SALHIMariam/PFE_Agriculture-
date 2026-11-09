"""
Génération du jeu de données d'entraînement.

L'espace d'entrée est entièrement énuméré :

    39 classes CNN  x  24 gouvernorats  =  936 combinaisons

Chaque combinaison mène à exactement un `Recommendation_ID`. Le jeu de données
est donc la table de vérité complète du problème — pas un échantillon.

À LIRE AVANT DE COMMENTER LES MÉTRIQUES
----------------------------------------
Avec ces deux seules entrées, la cible est une FONCTION DÉTERMINISTE des
features :

    Recommendation_ID = f(classe, favorabilité(plante, gouvernorat))

Il n'y a aucun bruit, aucune variable latente, aucune ambiguïté. Un modèle
correctement entraîné atteindra donc ~100% d'accuracy. Ce n'est pas une
performance : c'est la confirmation que les arbres ont mémorisé une table de
correspondance de 936 lignes.

C'est honnête et c'est défendable, à condition de l'écrire dans le mémoire.
Le comparatif des cinq algorithmes exigé par le cahier des charges reste
pertinent — il montre lesquels apprennent la règle avec le moins de données
et le moins de profondeur — mais il ne faut pas présenter le 100% comme une
prouesse prédictive.

Si un vrai problème d'apprentissage est souhaité, il faut rajouter une source
de variabilité réelle. La plus simple et la plus honnête : le MOIS, disponible
automatiquement via l'horodatage de l'analyse, sans aucune saisie du fermier.
Activez-la avec `generate(with_month=True)`.
"""
from __future__ import annotations

import pandas as pd

from src import config
from src.compatibility import compatibility_level, is_region_favorable
from src.knowledge_base import load_knowledge_base


def _case_for(cls: str, favorable: bool) -> str:
    healthy = config.is_healthy(cls)
    if healthy:
        return "CAS_1" if favorable else "CAS_3"
    return "CAS_2" if favorable else "CAS_4"


def generate(with_month: bool = False) -> pd.DataFrame:
    """
    Énumère les 936 combinaisons (ou 11 232 avec le mois).

    with_month=False -> table de vérité pure, cible déterministe
    with_month=True  -> ajoute le mois (12 valeurs) comme feature contextuelle
    """
    kb = load_knowledge_base()
    months = range(1, 13) if with_month else [None]
    rows = []

    for cls in config.CLASSES:
        plant, disease = config.split_class(cls)
        healthy = config.is_healthy(cls)
        for gov in config.GOVERNORATES:
            zone = config.GOVERNORATE_ZONE[gov]
            level = compatibility_level(plant, gov)
            favorable = is_region_favorable(plant, gov)
            case = _case_for(cls, favorable)
            rid = kb.resolve(cls, case)

            for month in months:
                row = {
                    "Predicted_Class": cls,
                    "Plant": plant,
                    "Disease": disease,
                    "Governorate": gov,
                    "Climate_Zone": zone,
                    "Is_Healthy": int(healthy),
                    "Region_Favorable": int(favorable),
                    "Compatibility_Score": level,
                    "Case": case,
                    "Recommendation_ID": rid,
                }
                if month is not None:
                    row["Month"] = month
                rows.append(row)

    df = pd.DataFrame(rows)
    ordered = config.FEATURES + (["Month"] if with_month else []) + ["Case", config.TARGET]
    return df[ordered]


def save(with_month: bool = False, path=config.DATASET_FILE) -> pd.DataFrame:
    df = generate(with_month=with_month)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    return df


if __name__ == "__main__":
    df = save()
    print(f"Dataset : {len(df):,} lignes x {df.shape[1]} colonnes -> {config.DATASET_FILE}")
    print(f"{df[config.TARGET].nunique()} packages distincts représentés")
    print()
    print("Répartition des 4 cas :")
    print(df["Case"].value_counts().sort_index().to_string())
    print()
    print("Support minimum par package :", df[config.TARGET].value_counts().min())
