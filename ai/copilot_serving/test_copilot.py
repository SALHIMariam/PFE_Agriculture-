"""
Tests du service Assistant AI.
Lancement :  python -m pytest -v
"""
from fastapi.testclient import TestClient

from main import app
from engine import CopilotEngine
from schemas import CopilotRequest, TopClass, Weather, Recommendation

client = TestClient(app)
engine = CopilotEngine()


def _req(**kw):
    base = dict(
        analysis_id=1,
        predicted_class="Tomato__early_blight",
        confidence=0.94,
        top3=[
            TopClass(label="Tomato__early_blight", score=0.94),
            TopClass(label="Tomato__late_blight", score=0.04),
            TopClass(label="Tomato__septoria_leaf_spot", score=0.02),
        ],
        governorate="Sfax",
        farmer_name="Ali",
    )
    base.update(kw)
    return CopilotRequest(**base)


# ----------------------------- Safety Guard ----------------------------- #

def test_safety_ok_when_confident():
    s = engine.safety_guard(_req())
    assert s.verdict == "ok" and s.auto_reply_allowed is True


def test_safety_blocks_low_confidence():
    s = engine.safety_guard(_req(confidence=0.52,
                                 top3=[TopClass(label="Tomato__early_blight", score=0.52),
                                       TopClass(label="Tomato__late_blight", score=0.30)]))
    assert s.verdict == "uncertain" and s.auto_reply_allowed is False


def test_safety_blocks_ambiguous_margin():
    s = engine.safety_guard(_req(confidence=0.55,
                                 top3=[TopClass(label="Tomato__early_blight", score=0.52),
                                       TopClass(label="Tomato__late_blight", score=0.43)]))
    assert s.verdict == "uncertain"


def test_safety_out_of_domain():
    s = engine.safety_guard(_req(predicted_class="Alien__unknown_disease",
                                 confidence=0.99,
                                 top3=[TopClass(label="Alien__unknown_disease", score=0.99),
                                       TopClass(label="X__y", score=0.01)]))
    assert s.verdict == "out_of_domain"


# ------------------------------- Triage -------------------------------- #

def test_triage_disease_high_priority():
    p = engine.triage_score(_req(risk_level="high", pending_similar_count=27), "high")
    assert p.level in ("urgent", "important") and p.score >= 40


def test_triage_healthy_low_priority():
    p = engine.triage_score(_req(predicted_class="Tomato__healthy", confidence=0.99), "none")
    assert p.level == "normal" and p.score < 40


# ----------------------------- Knowledge ------------------------------- #

def test_knowledge_found():
    k = engine.knowledge(_req())
    assert k.found is True and "Alternariose" in k.disease_fr


def test_knowledge_fallback():
    k = engine.knowledge(_req(predicted_class="Corn__unknown_thing"))
    assert k.found is False


# --------------------------- Response draft ---------------------------- #

def test_draft_contains_disease_and_name():
    r = engine.build(_req())
    assert "Ali" in r.draft.body and "Alternariose" in r.draft.body


def test_draft_blocked_when_uncertain():
    r = engine.build(_req(confidence=0.52,
                          top3=[TopClass(label="Tomato__early_blight", score=0.52),
                                TopClass(label="Tomato__late_blight", score=0.30)]))
    assert r.safety.auto_reply_allowed is False
    assert "expert" in r.draft.body.lower()


def test_draft_healthy_message():
    r = engine.build(_req(predicted_class="Tomato__healthy", confidence=0.99,
                          top3=[TopClass(label="Tomato__healthy", score=0.99),
                                TopClass(label="Tomato__early_blight", score=0.01)]))
    assert "bonne santé" in r.draft.body.lower()


# ------------------------- Response confidence ------------------------- #

def test_confidence_rises_with_sources():
    low = engine.response_confidence(_req(), fiche_found=True)
    high = engine.response_confidence(
        _req(recommendation=Recommendation(id="R023", treatment="Fongicide"),
             weather=Weather(humidity=75), history_count=3),
        fiche_found=True)
    assert high.score > low.score
    assert "recommendation" in high.sources_used


# --------------------------------- API --------------------------------- #

def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_prepare_endpoint():
    payload = {
        "analysis_id": 1842,
        "predicted_class": "Tomato__early_blight",
        "confidence": 0.94,
        "top3": [
            {"label": "Tomato__early_blight", "score": 0.94},
            {"label": "Tomato__late_blight", "score": 0.04},
        ],
        "governorate": "Sfax",
        "farmer_name": "Ali",
        "recommendation": {"id": "R023", "treatment": "Fongicide au mancozèbe"},
        "weather": {"humidity": 78, "temperature": 29},
        "risk_level": "high",
        "history_count": 3,
        "pending_similar_count": 27,
    }
    r = client.post("/copilot/prepare", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["safety"]["verdict"] == "ok"
    assert data["priority"]["level"] in ("urgent", "important", "normal")
    assert data["confidence"]["level"] in ("high", "medium", "low")
    assert "R023" not in data["draft"]["body"]  # l'id ne fuit pas au Farmer
    assert "Fongicide au mancozèbe" in data["draft"]["body"]
