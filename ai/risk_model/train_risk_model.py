"""
Entraînement du modèle de prédiction de risque de propagation (AgriDetect).
Benchmark 5 régressseurs (même méthodologie que le moteur de recommandation
existant), sélectionne le meilleur, exporte les artefacts pour FastAPI.

Sorties :
  risk_model.pkl        -> meilleur modèle entraîné
  risk_encoders.pkl      -> LabelEncoders pour les colonnes catégorielles
  risk_feature_names.pkl -> ordre exact des features attendu par le modèle
  benchmark_results.csv  -> comparaison des 5 modèles
"""

import time
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from catboost import CatBoostRegressor

CATEGORICAL_COLS = ["disease", "crop", "governorate", "climate_zone", "season"]
NUMERIC_COLS = [
    "month", "temperature", "humidity", "rainfall", "wind_speed",
    "cases_7d", "cases_14d", "cases_30d", "growth_rate", "avg_severity", "nearby_cases",
]
TARGET = "risk_score"


def load_and_encode(path="dataset_risk.csv"):
    df = pd.read_csv(path)
    encoders = {}
    for col in CATEGORICAL_COLS:
        le = LabelEncoder()
        df[col + "_enc"] = le.fit_transform(df[col])
        encoders[col] = le

    feature_cols = [c + "_enc" for c in CATEGORICAL_COLS] + NUMERIC_COLS
    X = df[feature_cols]
    y = df[TARGET]
    return X, y, encoders, feature_cols, df


def evaluate(model, X_test, y_test):
    pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, pred)
    rmse = np.sqrt(mean_squared_error(y_test, pred))
    r2 = r2_score(y_test, pred)
    return mae, rmse, r2


def main():
    X, y, encoders, feature_cols, df = load_and_encode()
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    models = {
        "DecisionTree": DecisionTreeRegressor(max_depth=10, random_state=42),
        "RandomForest": RandomForestRegressor(n_estimators=300, max_depth=14, n_jobs=-1, random_state=42),
        "XGBoost": XGBRegressor(n_estimators=400, max_depth=6, learning_rate=0.05,
                                 subsample=0.9, colsample_bytree=0.9, random_state=42, n_jobs=-1),
        "LightGBM": LGBMRegressor(n_estimators=500, max_depth=-1, num_leaves=63,
                                   learning_rate=0.05, random_state=42, n_jobs=-1, verbose=-1),
        "CatBoost": CatBoostRegressor(iterations=500, depth=8, learning_rate=0.05,
                                       random_state=42, verbose=False),
    }

    results = []
    trained = {}
    for name, model in models.items():
        t0 = time.time()
        model.fit(X_train, y_train)
        train_time = time.time() - t0
        mae, rmse, r2 = evaluate(model, X_test, y_test)
        results.append({"model": name, "MAE": round(mae, 2), "RMSE": round(rmse, 2),
                         "R2": round(r2, 4), "train_time_s": round(train_time, 2)})
        trained[name] = model
        print(f"{name:14s}  MAE={mae:6.2f}  RMSE={rmse:6.2f}  R2={r2:.4f}  ({train_time:.2f}s)")

    results_df = pd.DataFrame(results).sort_values("MAE")
    results_df.to_csv("benchmark_results.csv", index=False)
    print("\n=== Classement (par MAE croissant) ===")
    print(results_df.to_string(index=False))

    # Choix final : LightGBM, cohérent avec le reste de la stack AgriDetect
    # (déjà utilisé pour le moteur de recommandation) — sauf s'il est nettement
    # dominé par un autre modèle sur le MAE.
    best_by_mae = results_df.iloc[0]["model"]
    lgbm_row = results_df[results_df["model"] == "LightGBM"].iloc[0]
    best_row = results_df.iloc[0]
    gap = lgbm_row["MAE"] - best_row["MAE"]
    chosen = "LightGBM" if gap <= 0.5 else best_by_mae
    print(f"\nModèle retenu : {chosen} (MAE le plus bas = {best_by_mae}, écart LightGBM = {gap:.2f})")

    final_model = trained[chosen]

    # Feature importance (native)
    if hasattr(final_model, "feature_importances_"):
        importances = pd.Series(final_model.feature_importances_, index=feature_cols)
        importances = importances.sort_values(ascending=False)
        print("\nTop 8 features (importance native) :")
        print(importances.head(8).to_string())

    joblib.dump(final_model, "risk_model.pkl")
    joblib.dump(encoders, "risk_encoders.pkl")
    joblib.dump(feature_cols, "risk_feature_names.pkl")
    print(f"\nModèle exporté : risk_model.pkl ({chosen})")
    print("Encoders exportés : risk_encoders.pkl")
    print("Feature order exportée : risk_feature_names.pkl")

    return chosen, results_df


if __name__ == "__main__":
    main()
