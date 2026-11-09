"""
Tests.

La priorité n'est pas la couverture de code mais les défaillances qui
nuiraient réellement à un agriculteur : recommander la mauvaise culture,
proposer un traitement sur une plante saine, ou conseiller un fongicide
contre un virus.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src import config
from src.api import app
from src.compatibility import MATRIX, compatibility_level, is_region_favorable
from src.knowledge_base import load_knowledge_base
from src.recommender import RecommendationRequest, Recommender


@pytest.fixture(scope="module")
def kb():
    return load_knowledge_base()


@pytest.fixture(scope="module")
def rec():
    return Recommender()


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


# ------------------------------------------------------------------ taxonomie
def test_39_classes():
    assert len(config.CLASSES) == 39
    assert len(set(config.CLASSES)) == 39


def test_24_gouvernorats():
    assert len(config.GOVERNORATES) == 24
    assert set(config.GOVERNORATE_ZONE.values()) == {"Nord", "Centre", "Sud"}


def test_9_plantes_avec_classe_saine():
    assert len(config.PLANTS) == 9
    plantes_saines = {config.split_class(c)[0] for c in config.HEALTHY_CLASSES}
    assert plantes_saines == set(config.PLANTS)


@pytest.mark.parametrize("brut,attendu", [
    ("Tomato__early_blight", "Tomato__early_blight"),
    ("Tomato_early_blight", "Tomato__early_blight"),
    ("  apple__scab  ", "Apple__scab"),
])
def test_normalisation_classe(brut, attendu):
    assert config.normalize_class(brut) == attendu


@pytest.mark.parametrize("brut,attendu", [
    ("bizerte", "Bizerte"), ("BÉJA", "Beja"), ("  Sidi Bouzid ", "Sidi Bouzid"),
])
def test_normalisation_gouvernorat(brut, attendu):
    assert config.normalize_governorate(brut) == attendu


def test_classe_inconnue_rejetee():
    with pytest.raises(ValueError):
        config.normalize_class("Banana__panama")


# --------------------------------------------------------------- compatibilité
def test_matrice_complete():
    assert len(MATRIX) == 9
    for plant in config.PLANTS:
        assert set(MATRIX[plant]) == set(config.GOVERNORATES)


def test_sud_defavorable_aux_cultures_exigeantes():
    """Le pommier a besoin de froid hivernal — impossible dans le Sud saharien."""
    for gov in ("Tozeur", "Kebili", "Tataouine"):
        assert not is_region_favorable("Apple", gov)


def test_nord_favorable_au_ble():
    for gov in ("Beja", "Jendouba", "Kef"):
        assert compatibility_level("Wheat", gov) == 2


def test_exceptions_appliquees():
    """Gabès est au Sud mais ses oasis maraîchères conviennent à la tomate."""
    assert config.GOVERNORATE_ZONE["Gabes"] == "Sud"
    assert compatibility_level("Tomato", "Gabes") == 2
    assert compatibility_level("Groundnut", "Sfax") == 2


# ------------------------------------------------------- base de connaissances
def test_78_packages(kb):
    kb.validate()
    assert len(kb) == 39 * 2


def test_plante_saine_jamais_de_traitement(kb):
    """Exigence dure du cahier des charges."""
    for cls in config.HEALTHY_CLASSES:
        for case in ("CAS_1", "CAS_3"):
            pkg = kb.package_for(cls, case)
            assert pkg["Etat_Plante"] == "Saine"
            assert pkg["Treatment_Chemical"] == []
            assert pkg["Treatment_Biological"] == []
            assert pkg["Treatment_Organic"] == []
            assert pkg["Maintenance"] and pkg["Expected_Productivity"]


def test_packages_maladie_complets(kb):
    requis = {"Description", "Symptoms", "Treatment_Chemical", "Treatment_Biological",
              "Treatment_Organic", "Irrigation", "Fertilization", "Pruning",
              "Prevention", "Monitoring", "Recovery_Time", "Warnings", "References"}
    for cls in config.CLASSES:
        if config.is_healthy(cls):
            continue
        for case in ("CAS_2", "CAS_4"):
            pkg = kb.package_for(cls, case)
            assert requis <= set(pkg), f"{cls}/{case} incomplet"


def test_problemes_non_fongiques_avertissent(kb):
    """Un fongicide contre un virus, c'est de l'argent perdu."""
    for cls in ("Tomato__yellow_leaf_curl_virus",
                "Corn__maize_streak_virus_disease",
                "Tomato__spider_mites_two_spotted_spider_mite",
                "Groundnut__nutrition_deficiency",
                "Tomato__bacterial_spot"):
        texte = " ".join(kb.package_for(cls, "CAS_2")["Warnings"]).lower()
        assert "fungicide" in texte or "not a fungus" in texte or "do not spray" in texte


# -------------------------------------------------------------------- 4 cas
def test_les_4_cas_sont_atteignables(rec):
    obtenus = set()
    for cls in config.CLASSES:
        for gov in config.GOVERNORATES:
            out = rec.recommend(RecommendationRequest(cls, gov))
            obtenus.add(out["cas"])
    assert obtenus == {"CAS_1", "CAS_2", "CAS_3", "CAS_4"}


def test_cas_coherent_avec_entrees(rec):
    """Le cas retourné doit correspondre exactement à (état plante, région)."""
    for cls in config.CLASSES:
        plant, _ = config.split_class(cls)
        saine = config.is_healthy(cls)
        for gov in config.GOVERNORATES:
            favorable = is_region_favorable(plant, gov)
            attendu = ("CAS_1" if favorable else "CAS_3") if saine \
                else ("CAS_2" if favorable else "CAS_4")
            assert rec.recommend(RecommendationRequest(cls, gov))["cas"] == attendu


def test_jamais_de_croisement_de_culture(rec):
    """La seule défaillance sans excuse acceptable."""
    for cls in config.CLASSES:
        for gov in ("Tunis", "Sfax", "Tozeur"):
            out = rec.recommend(RecommendationRequest(cls, gov))
            assert out["predicted_class"] == cls
            assert out["plante"] == config.PLANTS_FR[config.split_class(cls)[0]]


def test_cas_defavorable_ajoute_conseils_adaptation(rec):
    out = rec.recommend(RecommendationRequest("Apple__healthy", "Tozeur"))
    assert out["cas"] == "CAS_3"
    assert out["conseils_adaptation"]
    assert "Tozeur" in out["avertissements"][0]


def test_cas_4_est_critique(rec):
    out = rec.recommend(RecommendationRequest("Apple__scab", "Tozeur"))
    assert out["cas"] == "CAS_4"
    assert out["niveau_risque"] == "Critique"
    assert out["intervalle_surveillance_jours"] == 2


def test_confiance_faible_signalee(rec):
    out = rec.recommend(RecommendationRequest("Grape__black_rot", "Nabeul", confidence=0.42))
    assert out["diagnostic_peu_fiable"] is True
    assert "fiable" in out["avertissements"][0].lower()


# ----------------------------------------------------------------------- API
def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["n_packages"] == 78
    assert body["n_classes"] == 39
    assert body["n_gouvernorats"] == 24


def test_endpoint_recommendation(client):
    r = client.post("/recommendation", json={
        "class": "Tomato__late_blight", "governorate": "Bizerte", "confidence": 0.97,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["cas"] == "CAS_2"
    assert body["maladie"] == "Tomato Late Blight"
    for cle in ("recommendation_id", "traitements", "prevention", "irrigation",
                "fertilisation", "surveillance", "avertissements", "region"):
        assert cle in body


def test_endpoint_classes_et_gouvernorats(client):
    assert client.get("/classes").json()["total"] == 39
    assert client.get("/governorates").json()["total"] == 24


def test_endpoint_compatibilite(client):
    r = client.get("/compatibility/Apple/Tozeur")
    assert r.status_code == 200
    assert r.json()["favorable"] is False
    assert client.get("/compatibility").json()["matrice"]["Wheat"]["Beja"] == "Favorable"


def test_classe_inconnue_422(client):
    assert client.post("/recommendation", json={
        "class": "Mango__anthracnose", "governorate": "Tunis"}).status_code == 422


def test_gouvernorat_inconnu_422(client):
    assert client.post("/recommendation", json={
        "class": "Apple__scab", "governorate": "Marseille"}).status_code == 422


def test_batch(client):
    r = client.post("/recommendation/batch", json={"items": [
        {"class": "Tomato__healthy", "governorate": "Nabeul"},
        {"class": "Wheat__stripe_rust", "governorate": "Tozeur"},
    ]})
    assert r.status_code == 200
    assert r.json()["total"] == 2
