"""
Entraînement et comparaison des cinq algorithmes exigés par le cahier
des charges : Decision Tree, Random Forest, XGBoost, LightGBM, CatBoost.

Pipeline complet dans un seul objet sklearn :
    imputation -> encodage ordinal -> modèle

L'artefact joblib est donc autonome : aucun encodeur séparé à maintenir,
aucun risque de décalage entre entraînement et service.

Sur le jeu de 936 lignes la cible est déterministe (voir dataset.py) : tous
les modèles convergent vers ~100%. Le comparatif garde son intérêt pour
montrer la complexité nécessaire à chaque famille d'algorithmes, pas pour
départager des performances prédictives.
"""
from __future__ import annotations

import json
import time
import warnings
from dataclasses import dataclass, field

import joblib
import numpy as np
import pandas as pd
from scipy.stats import loguniform, randint, uniform
from sklearn.base import BaseEstimator, ClassifierMixin, clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    cohen_kappa_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    top_k_accuracy_score,
)
from sklearn.model_selection import KFold, RandomizedSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OrdinalEncoder
from sklearn.tree import DecisionTreeClassifier

from src import config

warnings.filterwarnings("ignore")


# ---------------------------------------------------------------------------
# Prétraitement
# ---------------------------------------------------------------------------
def build_preprocessor(numeric_features: list[str]) -> ColumnTransformer:
    """
    Encodage ordinal plutôt que one-hot : les cinq candidats sont tous des
    modèles à base d'arbres. Un one-hot sur Governorate (24) + Predicted_Class
    (39) + Disease (30) produirait ~90 colonnes binaires creuses que les arbres
    découpent une par une. Les codes ordinaux permettent à un seul split
    d'isoler un groupe de modalités.

    `unknown_value=-1` fait qu'un gouvernorat inconnu en production dégrade
    proprement au lieu de lever une exception.
    """
    categorical = Pipeline([
        ("impute", SimpleImputer(strategy="constant", fill_value="Inconnu")),
        ("encode", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)),
    ])
    numeric = Pipeline([("impute", SimpleImputer(strategy="median"))])

    return ColumnTransformer(
        transformers=[
            ("cat", categorical, config.CATEGORICAL_FEATURES),
            ("num", numeric, numeric_features),
        ],
        remainder="drop",
    )


class StringLabelClassifier(BaseEstimator, ClassifierMixin):
    """
    Adaptateur pour XGBoost, qui n'accepte plus de cibles textuelles.
    L'encodage reste confiné ici : le contrat `.classes_` du reste du code
    n'est pas modifié et aucun encodeur supplémentaire ne part en production.
    """

    def __init__(self, estimator=None):
        self.estimator = estimator

    def fit(self, X, y):
        self.encoder_ = LabelEncoder().fit(y)
        self.classes_ = self.encoder_.classes_
        self.estimator_ = clone(self.estimator)
        self.estimator_.fit(X, self.encoder_.transform(y))
        return self

    def predict(self, X):
        return self.encoder_.inverse_transform(self.estimator_.predict(X))

    def predict_proba(self, X):
        return self.estimator_.predict_proba(X)

    @property
    def feature_importances_(self):
        return self.estimator_.feature_importances_


# ---------------------------------------------------------------------------
# Les cinq candidats
# ---------------------------------------------------------------------------
def _decision_tree():
    return DecisionTreeClassifier(random_state=config.RANDOM_STATE), {
        "model__max_depth": randint(4, 30),
        "model__min_samples_split": randint(2, 12),
        "model__min_samples_leaf": randint(1, 6),
        "model__criterion": ["gini", "entropy"],
    }


def _random_forest():
    return RandomForestClassifier(random_state=config.RANDOM_STATE, n_jobs=-1), {
        "model__n_estimators": randint(100, 300),
        "model__max_depth": randint(6, 30),
        "model__min_samples_split": randint(2, 10),
        "model__min_samples_leaf": randint(1, 4),
        "model__max_features": ["sqrt", "log2", None],
    }


def _xgboost():
    from xgboost import XGBClassifier

    model = XGBClassifier(
        random_state=config.RANDOM_STATE, n_jobs=-1, tree_method="hist",
        objective="multi:softprob", eval_metric="mlogloss", verbosity=0,
    )
    return StringLabelClassifier(estimator=model), {
        "model__estimator__n_estimators": randint(100, 300),
        "model__estimator__max_depth": randint(3, 10),
        "model__estimator__learning_rate": loguniform(0.05, 0.4),
        "model__estimator__subsample": uniform(0.7, 0.3),
        "model__estimator__colsample_bytree": uniform(0.7, 0.3),
    }


def _lightgbm():
    from lightgbm import LGBMClassifier

    return LGBMClassifier(
        random_state=config.RANDOM_STATE, n_jobs=-1,
        objective="multiclass", verbose=-1,
    ), {
        "model__n_estimators": randint(100, 300),
        "model__num_leaves": randint(15, 80),
        "model__max_depth": randint(3, 12),
        "model__learning_rate": loguniform(0.05, 0.4),
        "model__min_child_samples": randint(2, 15),
    }


def _catboost():
    from catboost import CatBoostClassifier

    return CatBoostClassifier(
        random_seed=config.RANDOM_STATE, loss_function="MultiClass",
        verbose=0, allow_writing_files=False, thread_count=-1,
    ), {
        "model__iterations": randint(150, 400),
        "model__depth": randint(4, 9),
        "model__learning_rate": loguniform(0.05, 0.4),
        "model__l2_leaf_reg": loguniform(1.0, 8.0),
    }


BUILDERS = {
    "DecisionTree": _decision_tree,
    "RandomForest": _random_forest,
    "XGBoost": _xgboost,
    "LightGBM": _lightgbm,
    "CatBoost": _catboost,
}

N_ITER = {"DecisionTree": 12, "RandomForest": 6, "XGBoost": 6,
          "LightGBM": 8, "CatBoost": 4}


@dataclass
class Result:
    name: str
    cv_score: float
    fit_seconds: float
    best_params: dict
    metrics: dict = field(default_factory=dict)
    pipeline: object | None = None


# ---------------------------------------------------------------------------
# Évaluation
# ---------------------------------------------------------------------------
def evaluate(y_true, y_pred, proba=None, classes=None) -> dict:
    from src.knowledge_base import load_knowledge_base

    kb = load_knowledge_base()
    id_to_case = {rid: kb.get(rid)["Case"] for rid in kb.ids}
    id_to_class = {rid: kb.get(rid)["Predicted_Class"] for rid in kb.ids}

    # CatBoost renvoie un tableau (n, 1) en multiclasse — on aplatit.
    y_true = np.asarray(y_true).ravel()
    y_pred = np.asarray(y_pred).ravel()

    m = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision_macro": float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "f1_weighted": float(f1_score(y_true, y_pred, average="weighted", zero_division=0)),
        "cohen_kappa": float(cohen_kappa_score(y_true, y_pred)),
    }

    # Certains packages n'ont qu'une seule combinaison possible et peuvent donc
    # être absents du jeu d'entraînement. Le top-k n'est alors calculable que
    # sur les lignes dont la vraie étiquette est connue du modèle ; les autres
    # sont comptées comme des échecs, ce qui est la lecture honnête.
    if proba is not None and classes is not None and proba.shape[1] >= 3:
        idx = {c: i for i, c in enumerate(classes)}
        known = np.array([v in idx for v in y_true])
        if known.any():
            y_idx = np.array([idx[v] for v in y_true[known]])
            top3_known = top_k_accuracy_score(
                y_idx, proba[known], k=3, labels=np.arange(len(classes))
            )
            m["top_3_accuracy"] = float(top3_known * known.mean())
            m["n_labels_unseen_in_training"] = int((~known).sum())

    # Décompositions utiles : le modèle a-t-il trouvé la bonne culture, et le bon cas ?
    m["crop_accuracy"] = float(accuracy_score(
        [id_to_class[v] for v in y_true], [id_to_class[v] for v in y_pred]))
    m["case_accuracy"] = float(accuracy_score(
        [id_to_case[v] for v in y_true], [id_to_case[v] for v in y_pred]))
    return m


def case_confusion(y_true, y_pred) -> pd.DataFrame:
    from src.knowledge_base import load_knowledge_base

    kb = load_knowledge_base()
    y_true = np.asarray(y_true).ravel()
    y_pred = np.asarray(y_pred).ravel()
    t = [kb.get(v)["Case"] for v in y_true]
    p = [kb.get(v)["Case"] for v in y_pred]
    labels = ["CAS_1", "CAS_2", "CAS_3", "CAS_4"]
    cm = confusion_matrix(t, p, labels=labels)
    return pd.DataFrame(cm, index=[f"vrai_{l}" for l in labels],
                        columns=[f"pred_{l}" for l in labels])


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------
def load_dataset(with_month: bool = False) -> pd.DataFrame:
    if not config.DATASET_FILE.exists():
        from src.dataset import save

        save(with_month=with_month)
    return pd.read_csv(config.DATASET_FILE)


def train_all(df=None, models=None, test_size=0.25, verbose=True):
    df = load_dataset() if df is None else df

    numeric_features = list(config.NUMERIC_FEATURES)
    if "Month" in df.columns:
        numeric_features.append("Month")
    feature_cols = config.CATEGORICAL_FEATURES + numeric_features

    X, y = df[feature_cols], df[config.TARGET]
    min_count = int(y.value_counts().min())

    # Certains packages n'ont qu'une seule combinaison possible (une culture
    # défavorable dans un seul gouvernorat). La stratification est alors
    # impossible : on bascule sur un découpage aléatoire.
    stratify = y if min_count >= 2 else None
    if verbose and stratify is None:
        print(f"[!] Support minimum = {min_count} -> découpage non stratifié\n")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=config.RANDOM_STATE, stratify=stratify
    )

    n_splits = max(2, min(5, min_count))
    cv = (StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=config.RANDOM_STATE)
          if min_count >= n_splits
          else KFold(n_splits=5, shuffle=True, random_state=config.RANDOM_STATE))

    if verbose:
        print(f"Entraînement {len(X_train):,} | Test {len(X_test):,} | "
              f"{y.nunique()} packages | CV = {type(cv).__name__}\n")

    results: list[Result] = []
    for name in (models or list(BUILDERS)):
        model, space = BUILDERS[name]()
        pipe = Pipeline([("prep", build_preprocessor(numeric_features)), ("model", model)])

        search = RandomizedSearchCV(
            pipe, param_distributions=space, n_iter=N_ITER.get(name, 6),
            scoring="f1_macro", cv=cv, n_jobs=-1,
            random_state=config.RANDOM_STATE, refit=True, error_score="raise",
        )
        t0 = time.perf_counter()
        search.fit(X_train, y_train)
        elapsed = time.perf_counter() - t0

        best = search.best_estimator_
        y_pred = best.predict(X_test)
        proba = best.predict_proba(X_test) if hasattr(best, "predict_proba") else None
        metrics = evaluate(y_test.to_numpy(), y_pred, proba, getattr(best, "classes_", None))

        results.append(Result(
            name=name, cv_score=float(search.best_score_), fit_seconds=elapsed,
            best_params={k.split("model__")[-1]: _jsonable(v)
                         for k, v in search.best_params_.items()},
            metrics=metrics, pipeline=best,
        ))
        if verbose:
            print(f"{name:<14} cv_f1={search.best_score_:.4f}  "
                  f"acc={metrics['accuracy']:.4f}  f1={metrics['f1_macro']:.4f}  "
                  f"cas={metrics['case_accuracy']:.4f}  ({elapsed:.1f}s)")

    best_result = max(results, key=lambda r: (r.metrics["f1_macro"], -r.fit_seconds))
    if verbose:
        print(f"\nMeilleur modèle : {best_result.name} "
              f"(F1 macro {best_result.metrics['f1_macro']:.4f})")
    return results, best_result, (X_test, y_test)


def _jsonable(v):
    if isinstance(v, np.integer):
        return int(v)
    if isinstance(v, np.floating):
        return float(v)
    return v


def export(best: Result, results: list[Result], test_data=None) -> None:
    joblib.dump(best.pipeline, config.MODEL_FILE, compress=3)

    config.METADATA_FILE.write_text(json.dumps({
        "model_name": best.name,
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "n_packages": int(len(best.pipeline.classes_)),
        "features": config.FEATURES,
        "best_params": best.best_params,
        "cv_f1_macro": best.cv_score,
        "test_metrics": best.metrics,
        "knowledge_base_version": "2.0.0",
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    pd.DataFrame([{
        "modele": r.name,
        "cv_f1_macro": round(r.cv_score, 4),
        "accuracy": round(r.metrics["accuracy"], 4),
        "f1_macro": round(r.metrics["f1_macro"], 4),
        "precision_macro": round(r.metrics["precision_macro"], 4),
        "recall_macro": round(r.metrics["recall_macro"], 4),
        "top_3_accuracy": round(r.metrics.get("top_3_accuracy", float("nan")), 4),
        "case_accuracy": round(r.metrics["case_accuracy"], 4),
        "cohen_kappa": round(r.metrics["cohen_kappa"], 4),
        "temps_s": round(r.fit_seconds, 1),
    } for r in results]).sort_values("f1_macro", ascending=False).to_csv(
        config.COMPARISON_FILE, index=False)

    model = best.pipeline.named_steps["model"]
    inner = getattr(model, "estimator_", model)
    imp = getattr(inner, "feature_importances_", None)
    if imp is not None:
        numeric_features = list(config.NUMERIC_FEATURES)
        names = config.CATEGORICAL_FEATURES + numeric_features
        arr = np.asarray(imp, dtype=float).ravel()
        if arr.size == len(names):
            pd.DataFrame({"feature": names, "importance": arr / (arr.sum() or 1)}) \
                .sort_values("importance", ascending=False) \
                .to_csv(config.REPORTS_DIR / "feature_importance.csv", index=False)

    if test_data is not None:
        X_test, y_test = test_data
        y_pred = best.pipeline.predict(X_test)
        y_pred = np.asarray(y_pred).ravel()
        (config.REPORTS_DIR / "classification_report.txt").write_text(
            classification_report(y_test.to_numpy(), y_pred, zero_division=0), encoding="utf-8")
        case_confusion(y_test.to_numpy(), y_pred).to_csv(
            config.REPORTS_DIR / "confusion_matrix_cas.csv")


def main(models=None):
    df = load_dataset()
    results, best, test_data = train_all(df, models=models)
    export(best, results, test_data)
    print(f"\nModèle      -> {config.MODEL_FILE}")
    print(f"Métadonnées -> {config.METADATA_FILE}")
    print(f"Comparatif  -> {config.COMPARISON_FILE}")
    return best


if __name__ == "__main__":
    main()
