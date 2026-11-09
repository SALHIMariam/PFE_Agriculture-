# -*- coding: utf-8 -*-
"""
Tests d'intégration de l'endpoint FastAPI POST /spread-risk (AgriDetect).

Monte le router de risk.py dans une app FastAPI, envoie les 5 scénarios via
TestClient (HTTP simulé), plus 2 cas d'erreur (gouvernorat / maladie invalide).

Lancement :
    venv\\Scripts\\activate
    python test_api.py
"""

import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from fastapi import FastAPI
from fastapi.testclient import TestClient

from risk import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


SCENARIOS = [
    {
        "id": "TEST 1",
        "titre": "Sfax — Tomato Early Blight — août, chaud et humide",
        "payload": {
            "disease": "Tomato__early_blight", "crop": "Tomato",
            "governorate": "Sfax", "climate_zone": "Center", "month": 8,
            "temperature": 30, "humidity": 81, "rainfall": 8, "wind_speed": 10,
            "cases_7d": 38, "cases_14d": 59, "cases_30d": 68, "growth_rate": 1.8,
            "avg_severity": 0.63, "nearby_cases": 52,
        },
        "attendu": 'risk_level "high"/"very_high" (score >= 55)',
        "check": lambda d: d["risk_score"] >= 55 and d["risk_level"] in ("high", "very_high"),
    },
    {
        "id": "TEST 2",
        "titre": "Tunis — Tomato Healthy — janvier, hiver sec",
        "payload": {
            "disease": "Tomato__healthy", "crop": "Tomato",
            "governorate": "Tunis", "climate_zone": "North", "month": 1,
            "temperature": 12, "humidity": 45, "rainfall": 0, "wind_speed": 8,
            "cases_7d": 2, "cases_14d": 4, "cases_30d": 6, "growth_rate": 1.0,
            "avg_severity": 0.10, "nearby_cases": 5,
        },
        "attendu": 'risk_level "low" (score < 15)',
        "check": lambda d: d["risk_score"] < 15 and d["risk_level"] == "low",
    },
    {
        "id": "TEST 3",
        "titre": "Nabeul — Potato Late Blight — octobre, automne très pluvieux",
        "payload": {
            "disease": "Potato__late_blight", "crop": "Potato",
            "governorate": "Nabeul", "climate_zone": "North", "month": 10,
            "temperature": 22, "humidity": 88, "rainfall": 25, "wind_speed": 12,
            "cases_7d": 45, "cases_14d": 70, "cases_30d": 90, "growth_rate": 2.1,
            "avg_severity": 0.82, "nearby_cases": 80,
        },
        "attendu": 'risk_level "very_high" (score >= 70)',
        "check": lambda d: d["risk_score"] >= 70 and d["risk_level"] == "very_high",
    },
    {
        "id": "TEST 4",
        "titre": "Tataouine — Spider Mites — juillet, été chaud et sec",
        "payload": {
            "disease": "Tomato__spider_mites_two_spotted_spider_mite", "crop": "Tomato",
            "governorate": "Tataouine", "climate_zone": "South", "month": 7,
            "temperature": 38, "humidity": 25, "rainfall": 0, "wind_speed": 15,
            "cases_7d": 30, "cases_14d": 48, "cases_30d": 60, "growth_rate": 1.6,
            "avg_severity": 0.70, "nearby_cases": 35,
        },
        "attendu": "score significatif (>= 30)",
        "check": lambda d: d["risk_score"] >= 30,
    },
    {
        "id": "TEST 5",
        "titre": "Gabès — Grape Black Rot — mai, printemps humide",
        "payload": {
            "disease": "Grape__black_rot", "crop": "Grape",
            "governorate": "Gabès", "climate_zone": "South", "month": 5,
            "temperature": 24, "humidity": 78, "rainfall": 15, "wind_speed": 8,
            "cases_7d": 25, "cases_14d": 40, "cases_30d": 55, "growth_rate": 1.5,
            "avg_severity": 0.58, "nearby_cases": 60,
        },
        "attendu": 'risk_level "high" (score >= 55)',
        "check": lambda d: d["risk_score"] >= 55 and d["risk_level"] == "high",
    },
]

REQUIRED_KEYS = ["risk_score", "risk_level", "top_factors", "confidence"]


def check_schema(data: dict) -> list:
    """Retourne la liste des problèmes de schéma (vide = OK)."""
    problems = []
    for k in REQUIRED_KEYS:
        if k not in data:
            problems.append(f"clé manquante: {k}")
    if "top_factors" in data:
        tf = data["top_factors"]
        if not isinstance(tf, list):
            problems.append("top_factors n'est pas une liste")
        elif len(tf) != 4:
            problems.append(f"top_factors doit contenir 4 éléments (reçu {len(tf)})")
        else:
            for i, f in enumerate(tf):
                if "factor" not in f or "contribution" not in f:
                    problems.append(f"top_factors[{i}] doit avoir 'factor' et 'contribution'")
    if "confidence" in data and not isinstance(data["confidence"], (int, float)):
        problems.append("confidence n'est pas numérique")
    return problems


def main():
    print("=" * 70)
    print("  TESTS API — POST /spread-risk (AgriDetect)")
    print("=" * 70)

    passed, failed = 0, 0

    # ----------------------------------------------------------- 5 scénarios
    for scn in SCENARIOS:
        print(f"\n{'-' * 70}")
        print(f"{scn['id']} — {scn['titre']}")
        print(f"{'-' * 70}")
        resp = client.post("/spread-risk", json=scn["payload"])
        ok = True

        if resp.status_code != 200:
            print(f"  [ECHEC] HTTP {resp.status_code} attendu 200 — {resp.text}")
            failed += 1
            continue

        data = resp.json()
        problems = check_schema(data)
        if problems:
            ok = False
            for p in problems:
                print(f"  [ECHEC] schéma: {p}")

        print(f"  HTTP {resp.status_code}")
        print(f"  risk_score : {data.get('risk_score')}")
        print(f"  risk_level : {data.get('risk_level')}")
        print(f"  confidence : {data.get('confidence')}")
        print(f"  top_factors ({len(data.get('top_factors', []))}) :")
        for i, f in enumerate(data.get("top_factors", []), 1):
            print(f"    {i}. {f.get('factor'):<28} contribution = {f.get('contribution')}")
        print(f"  Attendu    : {scn['attendu']}")

        if not scn["check"](data):
            ok = False
            print("  [ECHEC] valeur métier hors attendu")

        if ok:
            print(f"  [OK] {scn['id']}")
            passed += 1
        else:
            failed += 1

    # ----------------------------------------------------- cas d'erreur 422
    print(f"\n{'-' * 70}")
    print("TEST 6 — Gouvernorat invalide 'Atlantide' → 422 attendu")
    print(f"{'-' * 70}")
    bad_gov = dict(SCENARIOS[0]["payload"], governorate="Atlantide")
    resp = client.post("/spread-risk", json=bad_gov)
    print(f"  HTTP {resp.status_code} — {resp.text[:160]}")
    if resp.status_code == 422:
        print("  [OK] TEST 6")
        passed += 1
    else:
        print("  [ECHEC] TEST 6 — 422 attendu")
        failed += 1

    print(f"\n{'-' * 70}")
    print("TEST 7 — Maladie invalide 'Fake__disease' → 422 attendu")
    print(f"{'-' * 70}")
    bad_dis = dict(SCENARIOS[0]["payload"], disease="Fake__disease")
    resp = client.post("/spread-risk", json=bad_dis)
    print(f"  HTTP {resp.status_code} — {resp.text[:160]}")
    if resp.status_code == 422:
        print("  [OK] TEST 7")
        passed += 1
    else:
        print("  [ECHEC] TEST 7 — 422 attendu")
        failed += 1

    # ------------------------------------------------------------- RÉSUMÉ
    total = passed + failed
    print("\n" + "=" * 70)
    print(f"  RÉSUMÉ API : {passed}/{total} tests PASSÉS")
    print("=" * 70)
    print("  " + ("TOUS LES TESTS PASSÉS" if failed == 0 else "CERTAINS TESTS ONT ÉCHOUÉ"))
    print("=" * 70)
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
