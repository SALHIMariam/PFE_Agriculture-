"""
Accès à la base de connaissances agronomique.
Résout une classe prédite (ex. "Tomato__early_blight") vers sa fiche.
Gère les plantes saines et un fallback générique.
"""
import json
import os

_KB_PATH = os.path.join(os.path.dirname(__file__), "knowledge_base.json")

with open(_KB_PATH, encoding="utf-8") as f:
    _KB = json.load(f)


def is_healthy(predicted_class: str) -> bool:
    """Toute classe se terminant par 'healthy' (ou variante) est une plante saine."""
    key = predicted_class.lower()
    return key.endswith("healthy") or "healthy" in key.split("__")[-1]


def lookup(predicted_class: str) -> dict:
    """
    Retourne la fiche de la classe.
    - plante saine  -> _healthy_template
    - fiche connue  -> la fiche
    - inconnue      -> _fallback (found=False)
    Ajoute un champ 'found' (True si vraie fiche, False si fallback).
    """
    if is_healthy(predicted_class):
        entry = dict(_KB["_healthy_template"])
        entry["found"] = True
        return entry

    if predicted_class in _KB and not predicted_class.startswith("_"):
        entry = dict(_KB[predicted_class])
        entry["found"] = True
        return entry

    entry = dict(_KB["_fallback"])
    entry["found"] = False
    return entry


def known_classes() -> set:
    """Ensemble des classes ayant une vraie fiche (hors entrées techniques _*)."""
    return {k for k in _KB if not k.startswith("_")}
