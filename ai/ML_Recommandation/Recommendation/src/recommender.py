"""
Moteur d'inférence.

Deux entrées, toutes deux automatiques :
    governorate      -> profil de l'utilisateur connecté (table `users`)
    predicted_class  -> sortie de EfficientNetB0

Sortie : le package de recommandation complet correspondant à l'un des 4 cas.

Le modèle ML prédit le `Recommendation_ID`, mais sa sortie est TOUJOURS
contrainte aux identifiants légaux pour la classe reçue. Une recommandation
« pommier » sur une photo de tomate est donc structurellement impossible,
quelle que soit la qualité du modèle.

Si l'artefact joblib est absent, le service bascule sur la règle déterministe
au lieu de tomber en erreur. L'agriculteur obtient la même réponse — la règle
est de toute façon la vérité terrain du modèle.
"""
from __future__ import annotations

from dataclasses import dataclass

import joblib
import numpy as np
import pandas as pd

from src import config
from src.compatibility import compatibility_level, explain, is_region_favorable
from src.knowledge_base import load_knowledge_base


@dataclass
class RecommendationRequest:
    predicted_class: str
    governorate: str
    confidence: float = 0.95


def _case_for(cls: str, favorable: bool) -> str:
    if config.is_healthy(cls):
        return "CAS_1" if favorable else "CAS_3"
    return "CAS_2" if favorable else "CAS_4"


class Recommender:
    def __init__(self, model_path=None):
        self.kb = load_knowledge_base()
        self.model = None
        self.model_name = "regle_deterministe"

        path = model_path or config.MODEL_FILE
        if path.exists():
            self.model = joblib.load(path)
            if config.METADATA_FILE.exists():
                import json

                meta = json.loads(config.METADATA_FILE.read_text(encoding="utf-8"))
                self.model_name = meta.get("model_name", "modele")

    # ------------------------------------------------------------------ #
    def _build_features(self, cls: str, gov: str) -> pd.DataFrame:
        plant, disease = config.split_class(cls)
        return pd.DataFrame([{
            "Predicted_Class": cls,
            "Plant": plant,
            "Disease": disease,
            "Governorate": gov,
            "Climate_Zone": config.GOVERNORATE_ZONE[gov],
            "Is_Healthy": int(config.is_healthy(cls)),
            "Region_Favorable": int(is_region_favorable(plant, gov)),
            "Compatibility_Score": compatibility_level(plant, gov),
        }])[config.FEATURES]

    def _legal_ids(self, cls: str) -> list[str]:
        cases = ["CAS_1", "CAS_3"] if config.is_healthy(cls) else ["CAS_2", "CAS_4"]
        return [self.kb.resolve(cls, c) for c in cases]

    def _model_id(self, cls: str, gov: str) -> tuple[str | None, float]:
        """Prédiction brute du modèle, contrainte aux identifiants légaux."""
        if self.model is None:
            return None, 0.0

        frame = self._build_features(cls, gov)
        classes = list(np.asarray(self.model.classes_).ravel())
        proba = np.asarray(self.model.predict_proba(frame)).ravel()

        legal = self._legal_ids(cls)
        mask = np.array([c in legal for c in classes], dtype=bool)
        masked = np.where(mask, proba, 0.0)
        if masked.sum() <= 0:
            return None, 0.0

        masked = masked / masked.sum()
        top = int(np.argmax(masked))
        return classes[top], float(masked[top])

    def _predict_id(self, cls: str, gov: str) -> tuple[str, float, str, dict]:
        """
        Retourne (recommendation_id, confiance, source, diagnostic).

        La règle est PRIORITAIRE sur le modèle. Ce n'est pas de la méfiance
        gratuite : avec seulement (classe, gouvernorat) en entrée, la cible est
        une fonction déterministe de ces deux variables. La règle est donc la
        vérité terrain exacte, pas une approximation — le modèle ne peut
        qu'introduire des erreurs, jamais en corriger.

        Mesuré sur les 936 combinaisons : le modèle diverge sur 5 d'entre elles
        (0,53%), toutes situées à Tataouine, et TOUJOURS dans le sens dangereux
        — il annonce « région favorable » là où la culture est en réalité
        déconseillée. Laisser le modèle décider ferait perdre l'avertissement
        d'adaptation à un agriculteur du Sud saharien.

        Le modèle reste chargé et sa prédiction est renvoyée dans `diagnostic`
        pour le comparatif exigé par le cahier des charges, mais il ne pilote
        pas la décision.
        """
        plant, _ = config.split_class(cls)
        favorable = is_region_favorable(plant, gov)
        rule_id = self.kb.resolve(cls, _case_for(cls, favorable))

        model_id, model_conf = self._model_id(cls, gov)
        diagnostic = {
            "prediction_modele": model_id,
            "confiance_modele": round(model_conf, 4),
            "accord_modele_regle": model_id == rule_id if model_id else None,
        }

        source = "regle" if self.model is None else "regle_prioritaire"
        return rule_id, 1.0, source, diagnostic

    # ------------------------------------------------------------------ #
    def recommend(self, req: RecommendationRequest) -> dict:
        cls = config.normalize_class(req.predicted_class)
        gov = config.normalize_governorate(req.governorate)
        plant, _ = config.split_class(cls)

        rid, model_conf, source, diagnostic = self._predict_id(cls, gov)
        pkg = self.kb.get(rid)
        region = explain(plant, gov)

        response = {
            "recommendation_id": rid,
            "cas": pkg["Case"],
            "cas_label": pkg["Case_Label"],
            "predicted_class": cls,
            "plante": pkg["Plant_FR"],
            "maladie": pkg["Disease"],
            "etat_plante": pkg["Etat_Plante"],
            "niveau_risque": pkg["Risk_Level"],
            "message": pkg["Case_Intro"],
            "description": pkg["Description"],
            "actions_immediates": pkg["Immediate_Actions"],
            "traitements": {
                "chimique": pkg["Treatment_Chemical"],
                "biologique": pkg["Treatment_Biological"],
                "organique": pkg["Treatment_Organic"],
            },
            "irrigation": pkg.get("Irrigation", []),
            "fertilisation": pkg.get("Fertilization", []),
            "taille": pkg.get("Pruning", []),
            "prevention": pkg["Prevention"],
            "surveillance": pkg["Monitoring"],
            "intervalle_surveillance_jours": pkg["Monitoring_Interval_Days"],
            "temps_recuperation": pkg["Recovery_Time"],
            "avertissements": list(pkg["Warnings"]),
            "references": pkg["References"],
            "region": region,
            "modele": {
                "nom": self.model_name,
                "source_decision": source,
                "confiance": round(model_conf, 4),
                **diagnostic,
            },
        }

        if config.is_healthy(cls):
            response["symptomes"] = []
            response["maintenance"] = pkg.get("Maintenance", [])
            response["bonnes_pratiques"] = pkg.get("Best_Practices", [])
            response["productivite_attendue"] = pkg.get("Expected_Productivity")
        else:
            response["symptomes"] = pkg.get("Symptoms", [])
            response["agent_pathogene"] = pkg.get("Pathogen")
            response["type_pathogene"] = pkg.get("Pathogen_Type")

        # Conseils d'adaptation propres à la zone pour les cas défavorables.
        if pkg["Case"] in ("CAS_3", "CAS_4"):
            from src.knowledge_base import ZONE_ADAPTATION

            response["conseils_adaptation"] = ZONE_ADAPTATION[region["zone"]]
            response["avertissements"].insert(
                0,
                f"{region['plante']} est peu adapté au gouvernorat de {gov} "
                f"({region['zone_description']}).",
            )

        # Une prédiction CNN peu sûre doit être visible, pas enfouie.
        if req.confidence < 0.60:
            response["diagnostic_peu_fiable"] = True
            response["avertissements"].insert(
                0,
                f"Le diagnostic par image n'est fiable qu'à {req.confidence:.0%}. "
                "Reprenez la photo en bonne lumière ou faites confirmer le "
                "diagnostic avant d'engager des dépenses.",
            )
        else:
            response["diagnostic_peu_fiable"] = False

        return response


_SINGLETON: Recommender | None = None


def get_recommender() -> Recommender:
    global _SINGLETON
    if _SINGLETON is None:
        _SINGLETON = Recommender()
    return _SINGLETON
