"""
Évaluation complémentaire : métriques de classification par niveau de risque
(dérivées du score de régression) + explicabilité SHAP pour "Why this risk?".
"""

import joblib
import numpy as np
import pandas as pd
import shap
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix, classification_report

from train_risk_model import CATEGORICAL_COLS, NUMERIC_COLS, TARGET


def risk_level(score):
    if score < 35: return "low"
    if score < 55: return "medium"
    if score < 70: return "high"
    return "very_high"


def main():
    df = pd.read_csv("dataset_risk.csv")
    model = joblib.load("risk_model.pkl")
    encoders = joblib.load("risk_encoders.pkl")
    feature_cols = joblib.load("risk_feature_names.pkl")

    for col in CATEGORICAL_COLS:
        df[col + "_enc"] = encoders[col].transform(df[col])

    X = df[feature_cols]
    y = df[TARGET]
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    pred_scores = model.predict(X_test)
    y_true_level = y_test.apply(risk_level)
    y_pred_level = pd.Series(pred_scores, index=y_test.index).apply(risk_level)

    print("=== Métriques de classification (niveau de risque dérivé du score) ===")
    print(f"Accuracy : {accuracy_score(y_true_level, y_pred_level):.4f}")
    print(f"F1-macro : {f1_score(y_true_level, y_pred_level, average='macro'):.4f}")
    print("\nRapport détaillé :")
    print(classification_report(y_true_level, y_pred_level))

    labels = ["low", "medium", "high", "very_high"]
    cm = confusion_matrix(y_true_level, y_pred_level, labels=labels)
    print("Matrice de confusion (lignes=réel, colonnes=prédit) :")
    print(pd.DataFrame(cm, index=labels, columns=labels))

    # --- SHAP : explication d'une prédiction individuelle ---
    print("\n=== Exemple d'explication SHAP : 'Why this risk?' ===")
    explainer = shap.TreeExplainer(model)

    sample_idx = X_test.index[0]
    sample_row = df.loc[[sample_idx]]
    sample_X = X_test.loc[[sample_idx]]
    shap_values = explainer.shap_values(sample_X)

    print(f"Gouvernorat : {sample_row['governorate'].values[0]} | "
          f"Maladie : {sample_row['disease'].values[0]} | "
          f"Risque prédit : {model.predict(sample_X)[0]:.1f}%")

    contributions = pd.Series(shap_values[0], index=feature_cols).sort_values(key=abs, ascending=False)
    print("\nTop 5 facteurs contribuant à ce risque (valeurs SHAP) :")
    print(contributions.head(5).to_string())

    joblib.dump(explainer, "risk_shap_explainer.pkl")
    print("\nExplainer SHAP exporté : risk_shap_explainer.pkl")


if __name__ == "__main__":
    main()
