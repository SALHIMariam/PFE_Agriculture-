# -*- coding: utf-8 -*-
"""
Tests unitaires de bout en bout du modèle LightGBM de prédiction de risque
de propagation des maladies (AgriDetect).

Charge directement les artefacts .pkl (modèle, encoders, feature names,
explainer SHAP) et valide 5 scénarios agronomiques.

Lancement :
    venv\\Scripts\\activate
    python test_model.py
"""

import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import joblib
import numpy as np
import pandas as pd

MODEL_PATH = "risk_model.pkl"
ENCODERS_PATH = "risk_encoders.pkl"
FEATURE_NAMES_PATH = "risk_feature_names.pkl"
EXPLAINER_PATH = "risk_shap_explainer.pkl"

CATEGORICAL_COLS = ["disease", "crop", "governorate", "climate_zone", "season"]

SEASON_BY_MONTH = {
    12: "Winter", 1: "Winter", 2: "Winter",
    3: "Spring", 4: "Spring", 5: "Spring",
    6: "Summer", 7: "Summer", 8: "Summer",
    9: "Autumn", 10: "Autumn", 11: "Autumn",
}

# Mapping des noms SHAP -> libellés lisibles ("Why this risk?")
FRIENDLY_FACTOR_NAMES = {
    "disease_enc": "Type de maladie",
    "crop_enc": "Culture",
    "governorate_enc": "Gouvernorat",
    "climate_zone_enc": "Zone climatique",
    "season_enc": "Saison",
    "temperature": "Température",
    "humidity": "Humidité",
    "rainfall": "Précipitations",
    "wind_speed": "Vent",
    "cases_7d": "Cas récents (7j)",
    "cases_14d": "Cas récents (14j)",
    "cases_30d": "Cas récents (30j)",
    "growth_rate": "Tendance des cas",
    "avg_severity": "Sévérité moyenne",
    "nearby_cases": "Pression voisins",
    "month": "Mois",
}

_model = joblib.load(MODEL_PATH)
_encoders = joblib.load(ENCODERS_PATH)
_feature_cols = joblib.load(FEATURE_NAMES_PATH)
_explainer = joblib.load(EXPLAINER_PATH)


def risk_level(score: float) -> str:
    if score < 35:
        return "low"
    if score < 55:
        return "medium"
    if score < 70:
        return "high"
    return "very_high"


def build_features(scn: dict) -> pd.DataFrame:
    """Construit la ligne de features (DataFrame nommé) attendue par le modèle."""
    season = SEASON_BY_MONTH[scn["month"]]
    raw = {
        "disease": scn["disease"],
        "crop": scn["crop"],
        "governorate": scn["governorate"],
        "climate_zone": scn["climate_zone"],
        "season": season,
    }
    row = {}
    for col in CATEGORICAL_COLS:
        enc = _encoders[col]
        val = raw[col]
        if val not in enc.classes_:
            raise ValueError(f"Valeur inconnue pour {col!r}: {val!r}")
        row[col + "_enc"] = int(enc.transform([val])[0])

    row.update({
        "month": scn["month"],
        "temperature": scn["temperature"],
        "humidity": scn["humidity"],
        "rainfall": scn["rainfall"],
        "wind_speed": scn["wind_speed"],
        "cases_7d": scn["cases_7d"],
        "cases_14d": scn["cases_14d"],
        "cases_30d": scn["cases_30d"],
        "growth_rate": scn["growth_rate"],
        "avg_severity": scn["avg_severity"],
        "nearby_cases": scn["nearby_cases"],
    })
    return pd.DataFrame([[row[c] for c in _feature_cols]], columns=_feature_cols)


def predict(scn: dict):
    X = build_features(scn)
    raw = float(_model.predict(X)[0])
    score = int(round(float(np.clip(raw, 0, 100))))

    shap_vals = _explainer.shap_values(X)
    shap_vals = np.asarray(shap_vals)[0]
    ranked = sorted(zip(_feature_cols, shap_vals), key=lambda t: abs(t[1]), reverse=True)
    top4 = [
        (FRIENDLY_FACTOR_NAMES.get(name, name), round(float(val), 2))
        for name, val in ranked[:4]
    ]
    return score, risk_level(score), top4


SCENARIOS = [
    {
        "id": "TEST 1",
        "titre": "Sfax — Tomato Early Blight — août, chaud et humide",
        "disease": "Tomato__early_blight", "crop": "Tomato",
        "governorate": "Sfax", "climate_zone": "Center", "month": 8,
        "temperature": 30, "humidity": 81, "rainfall": 8, "wind_speed": 10,
        "cases_7d": 38, "cases_14d": 59, "cases_30d": 68, "growth_rate": 1.8,
        "avg_severity": 0.63, "nearby_cases": 52,
        "attendu": 'risk_level "high" ou "very_high" (score >= 55)',
        "check": lambda s, lvl: s >= 55 and lvl in ("high", "very_high"),
    },
    {
        "id": "TEST 2",
        "titre": "Tunis — Tomato Healthy — janvier, hiver sec",
        "disease": "Tomato__healthy", "crop": "Tomato",
        "governorate": "Tunis", "climate_zone": "North", "month": 1,
        "temperature": 12, "humidity": 45, "rainfall": 0, "wind_speed": 8,
        "cases_7d": 2, "cases_14d": 4, "cases_30d": 6, "growth_rate": 1.0,
        "avg_severity": 0.10, "nearby_cases": 5,
        "attendu": 'risk_level "low" (score < 15)',
        "check": lambda s, lvl: s < 15 and lvl == "low",
    },
    {
        "id": "TEST 3",
        "titre": "Nabeul — Potato Late Blight — octobre, automne très pluvieux",
        "disease": "Potato__late_blight", "crop": "Potato",
        "governorate": "Nabeul", "climate_zone": "North", "month": 10,
        "temperature": 22, "humidity": 88, "rainfall": 25, "wind_speed": 12,
        "cases_7d": 45, "cases_14d": 70, "cases_30d": 90, "growth_rate": 2.1,
        "avg_severity": 0.82, "nearby_cases": 80,
        "attendu": 'risk_level "very_high" (score >= 70)',
        "check": lambda s, lvl: s >= 70 and lvl == "very_high",
    },
    {
        "id": "TEST 4",
        "titre": "Tataouine — Spider Mites — juillet, été chaud et sec",
        "disease": "Tomato__spider_mites_two_spotted_spider_mite", "crop": "Tomato",
        "governorate": "Tataouine", "climate_zone": "South", "month": 7,
        "temperature": 38, "humidity": 25, "rainfall": 0, "wind_speed": 15,
        "cases_7d": 30, "cases_14d": 48, "cases_30d": 60, "growth_rate": 1.6,
        "avg_severity": 0.70, "nearby_cases": 35,
        "attendu": "score significatif (>= 30) — chaleur + sécheresse favorisent les acariens",
        "check": lambda s, lvl: s >= 30,
    },
    {
        "id": "TEST 5",
        "titre": "Gabès — Grape Black Rot — mai, printemps humide",
        "disease": "Grape__black_rot", "crop": "Grape",
        "governorate": "Gabès", "climate_zone": "South", "month": 5,
        "temperature": 24, "humidity": 78, "rainfall": 15, "wind_speed": 8,
        "cases_7d": 25, "cases_14d": 40, "cases_30d": 55, "growth_rate": 1.5,
        "avg_severity": 0.58, "nearby_cases": 60,
        "attendu": 'risk_level "high" (score >= 55)',
        "check": lambda s, lvl: s >= 55 and lvl == "high",
    },
]


def main():
    print("=" * 70)
    print("  TESTS UNITAIRES — Modèle de risque de propagation AgriDetect")
    print("=" * 70)

    results = {}
    for scn in SCENARIOS:
        score, lvl, top4 = predict(scn)
        results[scn["id"]] = {"score": score, "level": lvl, "scn": scn}

        print(f"\n{'-' * 70}")
        print(f"{scn['id']} — {scn['titre']}")
        print(f"{'-' * 70}")
        print(f"  Gouvernorat   : {scn['governorate']} ({scn['climate_zone']})")
        print(f"  Maladie       : {scn['disease']}  |  Culture : {scn['crop']}")
        print(f"  Saison/Mois   : {SEASON_BY_MONTH[scn['month']]} (mois {scn['month']})")
        print(f"  Météo         : temp={scn['temperature']}°C  hum={scn['humidity']}%  "
              f"pluie={scn['rainfall']}mm  vent={scn['wind_speed']}")
        print(f"  Historique    : 7j={scn['cases_7d']}  14j={scn['cases_14d']}  "
              f"30j={scn['cases_30d']}  tendance={scn['growth_rate']}  "
              f"sévérité={scn['avg_severity']}  voisins={scn['nearby_cases']}")
        print()
        print(f"  >>> RISK SCORE : {score}")
        print(f"  >>> RISK LEVEL : {lvl}")
        print(f"  Attendu       : {scn['attendu']}")
        print()
        print("  Why this risk ? — Top 4 facteurs SHAP :")
        for i, (name, contrib) in enumerate(top4, 1):
            sign = "+" if contrib >= 0 else "-"
            print(f"    {i}. {name:<22} contribution = {sign}{abs(contrib):.2f}")

        ok = scn["check"](score, lvl)
        print(f"\n  [{'OK ' if ok else 'ECHEC'}] {scn['id']}")

    # ------------------------------------------------------------------ RÉSUMÉ
    print("\n" + "=" * 70)
    print("  RÉSUMÉ DES 5 TESTS")
    print("=" * 70)
    for scn in SCENARIOS:
        r = results[scn["id"]]
        ok = scn["check"](r["score"], r["level"])
        print(f"  {scn['id']:8}  score={r['score']:>3}  level={r['level']:<10}  "
              f"{'OK' if ok else 'ECHEC'}   {scn['titre']}")

    s1 = results["TEST 1"]["score"]
    s2 = results["TEST 2"]["score"]
    l2 = results["TEST 2"]["level"]
    s3 = results["TEST 3"]["score"]
    l3 = results["TEST 3"]["level"]
    s4 = results["TEST 4"]["score"]

    print("\n  Validations agronomiques croisées :")
    checks = []

    c = (l2 == "low" and s2 < 15)
    checks.append(c)
    print(f"    [{'OK ' if c else 'ECHEC'}] Healthy doit être \"low\" et score < 15 "
          f"(level={l2}, score={s2})")

    c = (s3 > s1)
    checks.append(c)
    print(f"    [{'OK ' if c else 'ECHEC'}] Late Blight + pluie doit être > Early Blight "
          f"({s3} > {s1})")

    c = (s4 >= 30)
    checks.append(c)
    print(f"    [{'OK ' if c else 'ECHEC'}] Spider Mites en chaleur sèche doit être >= 30 "
          f"(score={s4})")

    c = (l3 == "very_high")
    checks.append(c)
    print(f"    [{'OK ' if c else 'ECHEC'}] Late Blight automne pluvieux doit être "
          f"\"very_high\" (level={l3})")

    per_test = [scn["check"](results[scn["id"]]["score"], results[scn["id"]]["level"])
                for scn in SCENARIOS]

    all_ok = all(per_test) and all(checks)
    print("\n" + "=" * 70)
    print("  " + ("TOUS LES TESTS PASSÉS" if all_ok else "CERTAINS TESTS ONT ÉCHOUÉ"))
    print("=" * 70)
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
