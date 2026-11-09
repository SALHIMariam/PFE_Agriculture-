from fastapi.testclient import TestClient

from news.enrich import enrich
from news.router import router
from fastapi import FastAPI

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_enrich_detects_crop_disease_and_category():
    result = enrich(
        title="Alerte : le mildiou progresse sur les cultures de tomate",
        description="Les agriculteurs sont invités à surveiller leurs parcelles de tomate.",
        link="https://example.test/a",
    )

    assert result["crop"] == "Tomato"
    assert result["disease_class"] == "Tomato__late_blight"
    assert result["category"] == "alert"
    assert 0.0 <= result["relevance_score"] <= 1.0


def test_enrich_defaults_to_info_category_without_keywords():
    result = enrich(
        title="Foire agricole régionale ce week-end",
        description="Un événement convivial pour les familles.",
        link="https://example.test/b",
    )

    assert result["category"] == "info"
    assert result["crop"] is None
    assert result["disease_class"] is None


def test_enrich_strips_html_and_entities_from_google_news_descriptions():
    result = enrich(
        title="Alerte rouille sur blé",
        description='<a href="https://news.google.com/x">Rouille du bl&#233; signal&#233;e</a>&nbsp;&#183; Le Monde',
        link="https://example.test/html",
    )

    assert "<a" not in result["summary"]
    assert "&#233;" not in result["summary"]
    assert "Rouille du blé signalée" in result["summary"]


def test_enrich_never_invents_a_summary_beyond_source_text():
    description = "Texte source très court."
    result = enrich(title="Titre", description=description, link="https://example.test/c")

    assert result["summary"] == description


def test_enrich_endpoint_returns_valid_payload():
    response = client.post(
        "/news/enrich",
        json={
            "title": "Rouille détectée sur blé",
            "description": "Foyers signalés dans le nord.",
            "link": "https://example.test/d",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["crop"] == "Wheat"
    # « Foyers » (pluriel de « foyer ») est un mot-clé d'alerte.
    assert body["category"] == "alert"
    # « rouille » seule ne désigne aucune classe CNN du blé (seule la rouille
    # jaune existe) : pas de classe inventée.
    assert body["disease_class"] is None
    assert "summary" in body


# --- Faux positifs corrigés : correspondance par mots entiers -------------


def test_ble_inside_other_words_is_not_wheat():
    result = enrich(
        title="MICI : et si cette plante pouvait prévenir les troubles digestifs ?",
        description="Une piste redoutable selon une étude.",
        link="https://example.test/mici",
    )
    assert result["crop"] is None


def test_conjunction_mais_is_not_corn():
    result = enrich(title="Pluies tardives, mais récolte sauvée", description="", link="https://example.test/m")
    assert result["crop"] is None


def test_potato_is_matched_before_apple():
    result = enrich(title="Le mildiou menace les pommes de terre", description="", link="https://example.test/p")
    assert result["crop"] == "Potato"
    assert result["disease_class"] == "Potato__late_blight"


def test_disease_class_is_never_invented():
    # « virus » seul ne correspond à aucune classe CNN de la vigne.
    result = enrich(title="Un virus touche la vigne", description="", link="https://example.test/v")
    assert result["crop"] == "Grape"
    assert result["disease_class"] is None


def test_every_mapped_class_exists_in_the_cnn():
    import json
    from pathlib import Path

    from news.enrich import RULES

    cnn = set(json.loads((Path(__file__).resolve().parents[1] / "models" / "class_names.json").read_text(encoding="utf-8")))
    mapped = {cls for rule in RULES["diseases"] for cls in rule["classes"].values()}
    assert mapped <= cnn, mapped - cnn


# --- Score de pertinence -----------------------------------------------------


def test_non_agricultural_article_stays_below_threshold():
    result = enrich(title="Hausse des prix de l'immobilier", description="Un rapport annuel.", link="https://example.test/i")
    assert result["relevance_score"] < 0.5


def test_general_agricultural_article_passes_threshold():
    result = enrich(title="Les agriculteurs tunisiens face à la sécheresse", description="", link="https://example.test/g")
    assert result["crop"] is None
    assert result["relevance_score"] >= 0.5


def test_crop_disease_and_category_rank_highest():
    result = enrich(title="Alerte : mildiou sur la tomate", description="", link="https://example.test/t")
    assert result["relevance_score"] == 1.0


# --- Parité Python / fallback PHP -------------------------------------------
# Les mêmes cas sont rejoués par backend/tests/Feature/NewsApiTest.php
# (test_fallback_matches_python_on_shared_parity_cases).


def test_shared_parity_cases():
    import json
    from pathlib import Path

    cases = json.loads(Path(__file__).with_name("parity_cases.json").read_text(encoding="utf-8"))
    for case in cases:
        result = enrich(case["title"], case["description"], "https://example.test/parity")
        got = {key: result[key] for key in case["expect"]}
        assert got == case["expect"], case["title"]
