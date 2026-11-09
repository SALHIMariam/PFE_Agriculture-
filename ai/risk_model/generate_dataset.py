"""
Générateur de dataset synthétique pour le modèle de prédiction de risque
de propagation (AgriDetect - AI Disease Spread Prediction).

Principe (même approche que le moteur de recommandation existant) :
un générateur basé sur des règles agronomiques croise maladies x gouvernorats
x mois x météo x historique de cas, et calcule un risk_score (0-100) qui sert
de label d'entraînement pour LightGBM.

Sortie : dataset_risk.csv
"""

import random
import numpy as np
import pandas as pd

from tunisia_config import GOVERNORATES, NEIGHBORS, NORTH_MONTHLY, ZONE_OFFSET, SEASON_BY_MONTH
from disease_config import DISEASES, PATHOGEN_PROFILE

RANDOM_SEED = 42
REPLICATES_PER_COMBO = 2  # variations météo par combinaison (disease, gov, month)

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


def sample_weather(zone: str, month: int) -> dict:
    t_mean, t_std, h_mean, h_std, r_mean, r_std, w_mean = NORTH_MONTHLY[month]
    t_delta, h_delta, r_factor, w_delta = ZONE_OFFSET[zone]

    temperature = np.random.normal(t_mean + t_delta, t_std)
    humidity = np.clip(np.random.normal(h_mean + h_delta, h_std), 5, 100)
    rainfall = max(0.0, np.random.normal(r_mean * r_factor, max(r_std * r_factor, 1)))
    wind = max(2.0, np.random.normal(w_mean + w_delta, 3))

    return {
        "temperature": round(float(temperature), 1),
        "humidity": round(float(humidity), 1),
        "rainfall": round(float(rainfall), 1),
        "wind_speed": round(float(wind), 1),
    }


def sample_case_history(disease: str, pathogen_type: str, pressure_factor: float) -> dict:
    """Génère un historique de cas sur 30 jours avec une tendance (hausse/stable/baisse)."""
    if pathogen_type == "healthy":
        base = np.random.poisson(2)
        return {"week1": base, "week2": base, "week3": base}

    base_intensity = {
        "fungal": 14, "oomycete": 12, "rust": 10, "bacterial": 9,
        "viral_vector": 8, "pest": 8, "nutritional": 6,
    }.get(pathogen_type, 8)

    week3 = max(0, np.random.poisson(base_intensity * pressure_factor))
    trend1 = np.random.uniform(0.6, 1.6)
    trend2 = np.random.uniform(0.6, 1.6)
    week2 = max(0, int(round(week3 * trend1)))
    week1 = max(0, int(round(week2 * trend2)))

    return {"week1": week1, "week2": week2, "week3": week3}


def compute_risk_score(pathogen_type: str, temperature: float, humidity: float,
                        rainfall: float, growth_rate: float, nearby_pressure: float,
                        avg_severity: float, season: str) -> float:
    if pathogen_type == "healthy":
        return float(np.clip(np.random.normal(5, 4), 0, 15))

    profile = PATHOGEN_PROFILE[pathogen_type]
    t_min, t_max = profile["t_opt"]
    score = 0.0

    # Température : proche de l'optimum du pathogène -> risque plus élevé
    if t_min <= temperature <= t_max:
        score += 22
    else:
        dist = min(abs(temperature - t_min), abs(temperature - t_max))
        score += max(0, 22 - dist * 1.8)

    # Humidité
    if profile["dry_favored"]:
        score += max(0, (60 - humidity) * 0.35)  # sécheresse favorise virus/acariens
    else:
        if humidity >= profile["h_min"]:
            score += min(24, (humidity - profile["h_min"]) * 0.9)

    # Pluie (positive pour champignons/bactéries, négative pour vecteurs/acariens)
    score += rainfall * profile["rain_boost"] * 0.5

    # Dynamique des cas (tendance locale)
    score += min(20, growth_rate * 8)

    # Pression régionale (cas dans les gouvernorats voisins)
    score += min(16, nearby_pressure * 0.14)

    # Sévérité moyenne détectée par EfficientNet
    score += avg_severity * 10

    # Bonus saisonnier léger pour les maladies fongiques au printemps/automne
    if pathogen_type in ("fungal", "rust", "oomycete") and season in ("Spring", "Autumn"):
        score += 4

    score += np.random.normal(0, 4)  # bruit réaliste
    return float(np.clip(score, 0, 100))


def risk_level(score: float) -> str:
    if score < 35:
        return "low"
    if score < 55:
        return "medium"
    if score < 70:
        return "high"
    return "very_high"


def build_dataset() -> pd.DataFrame:
    rows = []

    # Pass 1 : cas locaux (30j) par (disease, gouvernorat, mois) pour calculer la pression régionale
    local_cases_30d = {}
    pressure_by_gov = {gov: np.random.uniform(0.5, 1.6) for gov in GOVERNORATES}

    for disease, (crop, pathogen_type) in DISEASES.items():
        for gov in GOVERNORATES:
            for month in range(1, 13):
                hist = sample_case_history(disease, pathogen_type, pressure_by_gov[gov])
                local_cases_30d[(disease, gov, month)] = hist

    # Pass 2 : génération des lignes finales avec pression des voisins + météo
    for disease, (crop, pathogen_type) in DISEASES.items():
        for gov, geo in GOVERNORATES.items():
            zone = geo["zone"]
            for month in range(1, 13):
                season = SEASON_BY_MONTH[month]
                hist = local_cases_30d[(disease, gov, month)]
                cases_7d = hist["week1"]
                cases_14d = hist["week1"] + hist["week2"]
                cases_30d = hist["week1"] + hist["week2"] + hist["week3"]
                growth_rate = hist["week1"] / max(hist["week2"], 1)

                nearby_cases = sum(
                    local_cases_30d[(disease, n, month)]["week1"]
                    + local_cases_30d[(disease, n, month)]["week2"]
                    for n in NEIGHBORS[gov]
                )
                nearby_pressure = nearby_cases / max(len(NEIGHBORS[gov]), 1)

                for _ in range(REPLICATES_PER_COMBO):
                    weather = sample_weather(zone, month)
                    avg_severity = float(np.clip(np.random.beta(2.5, 2.0), 0.05, 0.99))

                    score = compute_risk_score(
                        pathogen_type, weather["temperature"], weather["humidity"],
                        weather["rainfall"], growth_rate, nearby_pressure,
                        avg_severity, season,
                    )

                    rows.append({
                        "disease": disease,
                        "crop": crop,
                        "governorate": gov,
                        "climate_zone": zone,
                        "month": month,
                        "season": season,
                        "temperature": weather["temperature"],
                        "humidity": weather["humidity"],
                        "rainfall": weather["rainfall"],
                        "wind_speed": weather["wind_speed"],
                        "cases_7d": cases_7d,
                        "cases_14d": cases_14d,
                        "cases_30d": cases_30d,
                        "growth_rate": round(growth_rate, 2),
                        "avg_severity": round(avg_severity, 2),
                        "nearby_cases": round(nearby_pressure, 1),
                        "risk_score": round(score, 1),
                        "risk_level": risk_level(score),
                    })

    return pd.DataFrame(rows)


if __name__ == "__main__":
    df = build_dataset()
    df.to_csv("dataset_risk.csv", index=False)
    print(f"Dataset généré : {len(df)} lignes, {df.shape[1]} colonnes")
    print(f"Diseases: {df['disease'].nunique()} | Governorates: {df['governorate'].nunique()} | Months: {df['month'].nunique()}")
    print("\nDistribution risk_level :")
    print(df["risk_level"].value_counts(normalize=True).round(3))
    print("\nAperçu :")
    print(df.head(5).to_string())
