"""
Base de connaissances — construction des packages de recommandation.

Un package = (classe prédite, cas). Comme une classe saine ne peut donner que
CAS_1 ou CAS_3, et une classe malade que CAS_2 ou CAS_4, on obtient :

    39 classes x 2 cas possibles = 78 packages

Chaque package porte un `Recommendation_ID` stable (R001 ... R078). C'est ce
que le modèle ML prédit ; le texte agronomique vient d'ici, jamais du modèle.
"""
from __future__ import annotations

import json
from functools import lru_cache

from src import config
from src.agronomy import DISEASES, HEALTHY

# ---------------------------------------------------------------------------
# Textes propres à chaque cas
# ---------------------------------------------------------------------------
CASE_INTRO = {
    "CAS_1": (
        "La plante est saine et votre région est bien adaptée à cette culture. "
        "Continuez le programme d'entretien habituel."
    ),
    "CAS_2": (
        "Une maladie a été détectée. Votre région étant favorable à cette culture, "
        "les conditions locales permettent aussi à la maladie de se développer "
        "rapidement : traitez sans attendre."
    ),
    "CAS_3": (
        "La plante est saine pour l'instant, mais votre région est peu adaptée à "
        "cette culture. Le stress climatique va fragiliser la plante et augmenter "
        "sa sensibilité aux maladies."
    ),
    "CAS_4": (
        "Double problème : la plante est malade ET votre région est peu adaptée à "
        "cette culture. Le stress climatique affaiblit les défenses de la plante et "
        "aggrave la maladie. Situation critique."
    ),
}

CASE_ACTIONS = {
    "CAS_1": [
        "Aucun traitement nécessaire — ne traitez pas une plante saine",
        "Poursuivez la surveillance préventive toutes les deux semaines",
        "Notez cette observation pour construire l'historique de votre parcelle",
    ],
    "CAS_2": [
        "Retirez et détruisez les parties atteintes dès aujourd'hui",
        "Démarrez le traitement recommandé sous 48 heures",
        "Arrêtez tout arrosage par aspersion sur le feuillage",
        "Inspectez les plants voisins : la propagation est probable ici",
    ],
    "CAS_3": [
        "Aucun traitement curatif — la plante est saine",
        "Anticipez le stress climatique avant qu'il n'apparaisse",
        "Renforcez l'irrigation et le paillage du sol",
        "Envisagez des variétés mieux adaptées pour la prochaine campagne",
    ],
    "CAS_4": [
        "AGISSEZ AUJOURD'HUI — traitez l'ensemble de la parcelle",
        "Retirez et détruisez les plants les plus atteints",
        "Arrêtez l'aspersion et suspendez les apports d'azote",
        "Renforcez l'irrigation d'appoint pour réduire le stress hydrique",
        "Contactez un agronome local : sur une culture mal adaptée, le rapport "
        "coût du traitement / rendement attendu doit être vérifié",
    ],
}

# Conseils d'adaptation par zone climatique, appliqués aux CAS 3 et CAS 4.
ZONE_ADAPTATION = {
    "Nord": [
        "Surveillez l'excès d'humidité qui favorise les maladies fongiques",
        "Assurez un bon drainage des parcelles en hiver",
    ],
    "Centre": [
        "Irrigation d'appoint indispensable en été",
        "Paillage du sol pour limiter l'évaporation",
        "Choisissez des variétés à cycle court pour échapper aux fortes chaleurs",
    ],
    "Sud": [
        "Culture sous abri ou ombrière fortement recommandée",
        "Irrigation goutte-à-goutte obligatoire, avec pilotage tensiométrique",
        "Variétés résistantes à la chaleur et à la salinité impératives",
        "Attention à la salinité de l'eau d'irrigation dans les zones d'oasis",
        "Évaluez si une culture mieux adaptée (palmier, olivier, grenadier) serait "
        "plus rentable sur cette parcelle",
    ],
}


def _build_packages() -> dict:
    packages: dict[str, dict] = {}
    index: dict[str, str] = {}
    counter = 0

    for cls in config.CLASSES:
        plant, disease_key = config.split_class(cls)
        healthy = config.is_healthy(cls)
        cases = ["CAS_1", "CAS_3"] if healthy else ["CAS_2", "CAS_4"]

        for case in cases:
            counter += 1
            rid = f"R{counter:03d}"
            index[f"{cls}|{case}"] = rid

            base = {
                "Recommendation_ID": rid,
                "Predicted_Class": cls,
                "Plant": plant,
                "Plant_FR": config.PLANTS_FR[plant],
                "Case": case,
                "Case_Label": config.CASE_LABEL[case],
                "Etat_Plante": "Saine" if healthy else "Malade",
                "Region_Status": "Favorable" if case in ("CAS_1", "CAS_2") else "Défavorable",
                "Risk_Level": config.CASE_RISK[case],
                "Monitoring_Interval_Days": config.CASE_MONITORING_DAYS[case],
                "Case_Intro": CASE_INTRO[case],
                "Immediate_Actions": CASE_ACTIONS[case],
            }

            if healthy:
                h = HEALTHY[_healthy_key(cls)]
                base.update({
                    "Disease": "Aucune",
                    "Description": h["status_note"],
                    "Treatment_Chemical": [],
                    "Treatment_Biological": [],
                    "Treatment_Organic": [],
                    "Maintenance": h["maintenance"],
                    "Fertilization": h["nutrition"],
                    "Irrigation": h["watering"],
                    "Monitoring": h["monitoring"],
                    "Prevention": h["prevention"],
                    "Best_Practices": h["best_practices"],
                    "Expected_Productivity": h["productivity"],
                    "Recovery_Time": "Sans objet — la plante est saine",
                    "Warnings": [
                        "Aucun traitement n'est nécessaire. Traiter une plante saine "
                        "coûte de l'argent et accélère l'apparition de résistances."
                    ],
                    "References": ["FAO — Bonnes pratiques agricoles",
                                   "CABI Crop Protection Compendium"],
                })
            else:
                d = DISEASES[_disease_key(cls)]
                base.update({
                    "Disease": d["disease_name"],
                    "Pathogen": d["pathogen"],
                    "Pathogen_Type": d["type"],
                    "Description": d["description"],
                    "Symptoms": d["symptoms"],
                    "Treatment_Chemical": d["chemical"],
                    "Treatment_Biological": d["biological"],
                    "Treatment_Organic": d["organic"],
                    "Irrigation": d["irrigation"],
                    "Fertilization": d["fertilization"],
                    "Pruning": d["pruning"],
                    "Monitoring": d["monitoring"],
                    "Prevention": d["prevention"],
                    "Crop_Management": d["prevention"][:2],
                    "Recovery_Time": d["recovery_time"],
                    "Warnings": list(d["warnings"]),
                    "References": d["references"],
                })
                if case == "CAS_4":
                    base["Warnings"].insert(
                        0,
                        "Culture peu adaptée à votre région : le stress climatique "
                        "réduit l'efficacité des traitements et la capacité de "
                        "récupération de la plante.",
                    )
                    base["Recovery_Time"] += (
                        " — délai à rallonger en région défavorable, "
                        "la récupération est plus lente."
                    )

            packages[rid] = base

    return {
        "version": "2.0.0",
        "n_classes": len(config.CLASSES),
        "n_packages": len(packages),
        "index": index,
        "packages": packages,
    }


def _disease_key(cls: str) -> str:
    """`Apple__black_rot` -> clé simple-underscore utilisée dans agronomy.py."""
    return cls.replace("__", "_")


def _healthy_key(cls: str) -> str:
    return cls.replace("__", "_")


def save(path=config.KB_FILE) -> dict:
    kb = _build_packages()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(kb, indent=2, ensure_ascii=False), encoding="utf-8")
    return kb


class KnowledgeBase:
    def __init__(self, payload: dict):
        self._payload = payload
        self._packages = payload["packages"]
        self._index = payload["index"]

    def get(self, rid: str) -> dict:
        try:
            return self._packages[rid]
        except KeyError as exc:
            raise KeyError(f"Recommendation_ID inconnu : '{rid}'") from exc

    def resolve(self, predicted_class: str, case: str) -> str:
        key = f"{predicted_class}|{case}"
        try:
            return self._index[key]
        except KeyError as exc:
            raise KeyError(f"Aucun package pour {predicted_class} / {case}") from exc

    def package_for(self, predicted_class: str, case: str) -> dict:
        return self.get(self.resolve(predicted_class, case))

    @property
    def ids(self) -> list[str]:
        return sorted(self._packages)

    @property
    def version(self) -> str:
        return self._payload["version"]

    def __len__(self) -> int:
        return len(self._packages)

    def validate(self) -> None:
        missing = []
        for cls in config.CLASSES:
            cases = ["CAS_1", "CAS_3"] if config.is_healthy(cls) else ["CAS_2", "CAS_4"]
            for case in cases:
                if f"{cls}|{case}" not in self._index:
                    missing.append(f"{cls}|{case}")
        if missing:
            raise ValueError(f"Base de connaissances incomplète : {missing[:5]}")


@lru_cache(maxsize=1)
def load_knowledge_base(path=None) -> KnowledgeBase:
    path = path or config.KB_FILE
    if not path.exists():
        save(path)
    kb = KnowledgeBase(json.loads(path.read_text(encoding="utf-8")))
    kb.validate()
    return kb


if __name__ == "__main__":
    kb = save()
    print(f"Base de connaissances v{kb['version']} : {kb['n_packages']} packages "
          f"pour {kb['n_classes']} classes -> {config.KB_FILE}")
