"""
CopilotEngine — cœur du service Assistant AI.
Six modules, chacun une méthode pure et testable :
  1. safety_guard      -> l'IA doit-elle proposer une réponse automatique ?
  2. triage_score      -> priorité /100 pour l'ordre de traitement
  3. knowledge         -> fiche agronomique de la maladie
  4. response_draft    -> brouillon de réponse au Farmer
  5. response_confidence -> fiabilité de la réponse proposée
  6. build             -> orchestre le tout et fusionne le contexte
"""
from typing import Dict, List

import config
import knowledge_base as kb
from schemas import (
    CopilotRequest, CopilotResponse,
    Safety, Priority, Confidence, Draft, Knowledge,
)


def _pct(x: float) -> int:
    return int(round(x * 100))


class CopilotEngine:

    # ------------------------------------------------------------------ #
    # 1. SAFETY GUARD                                                    #
    # ------------------------------------------------------------------ #
    def safety_guard(self, req: CopilotRequest) -> Safety:
        # a) diagnostic pas assez sûr
        if req.confidence < config.SAFETY["min_confidence"]:
            return Safety(
                verdict="uncertain",
                reason=f"Confiance {_pct(req.confidence)}% inférieure au seuil "
                       f"{_pct(config.SAFETY['min_confidence'])}%.",
                auto_reply_allowed=False,
            )

        # b) top-1 et top-2 trop proches (ambigu)
        if len(req.top3) >= 2:
            margin = req.top3[0].score - req.top3[1].score
            if margin < config.SAFETY["min_margin"]:
                return Safety(
                    verdict="uncertain",
                    reason=f"Écart de {_pct(margin)}% entre les deux hypothèses : "
                           f"diagnostic ambigu.",
                    auto_reply_allowed=False,
                )

        # c) classe hors du domaine connu
        if not kb.is_healthy(req.predicted_class) and \
           req.predicted_class not in kb.known_classes():
            return Safety(
                verdict="out_of_domain",
                reason="Classe non reconnue dans la base de connaissances.",
                auto_reply_allowed=False,
            )

        return Safety(
            verdict="ok",
            reason="Diagnostic suffisamment fiable pour une proposition automatique.",
            auto_reply_allowed=True,
        )

    # ------------------------------------------------------------------ #
    # 2. TRIAGE SCORE                                                    #
    # ------------------------------------------------------------------ #
    def triage_score(self, req: CopilotRequest, severity: str) -> Priority:
        w = config.TRIAGE_WEIGHTS
        factors: Dict[str, int] = {}

        # gravité de la maladie
        sev = config.SEVERITY_SCORE.get(severity, 0.5)
        factors["severity"] = int(round(sev * w["severity"]))

        # risque de propagation
        risk = config.RISK_LEVEL_SCORE.get(req.risk_level or "low", 0.0)
        factors["risk_level"] = int(round(risk * w["risk_level"]))

        # certitude du diagnostic (une plante saine très sûre ne doit pas
        # monter en priorité : on pondère par la sévérité)
        conf_component = req.confidence * (0.3 + 0.7 * sev)
        factors["confidence"] = int(round(conf_component * w["confidence"]))

        # pression régionale (cas similaires en attente)
        pressure = min(req.pending_similar_count, 10) / 10.0
        factors["regional_pressure"] = int(round(pressure * w["regional_pressure"]))

        # statut en attente
        factors["pending_status"] = w["pending_status"]

        score = min(100, sum(factors.values()))

        if score >= config.PRIORITY_BANDS["urgent"]:
            level = "urgent"
        elif score >= config.PRIORITY_BANDS["important"]:
            level = "important"
        else:
            level = "normal"

        return Priority(score=score, level=level, factors=factors)

    # ------------------------------------------------------------------ #
    # 3. KNOWLEDGE                                                       #
    # ------------------------------------------------------------------ #
    def knowledge(self, req: CopilotRequest) -> Knowledge:
        fiche = kb.lookup(req.predicted_class)
        return Knowledge(
            disease_fr=fiche["disease_fr"],
            severity=fiche["severity"],
            symptoms=fiche["symptoms"],
            treatment=fiche["treatment"],
            prevention=fiche["prevention"],
            warnings=fiche["warnings"],
            found=fiche["found"],
        )

    # ------------------------------------------------------------------ #
    # 5. RESPONSE CONFIDENCE  (calculée avant le brouillon)              #
    # ------------------------------------------------------------------ #
    def response_confidence(self, req: CopilotRequest, fiche_found: bool) -> Confidence:
        cfg = config.RESPONSE_CONFIDENCE
        sources_used: List[str] = ["diagnostic"]

        present = {
            "recommendation": req.recommendation is not None,
            "knowledge_base": fiche_found,
            "farmer_history": req.history_count > 0,
            "weather": req.weather is not None,
        }
        for name, ok in present.items():
            if ok:
                sources_used.append(name)

        coverage = sum(present.values()) / len(cfg["optional_sources"])
        raw = cfg["diagnosis_weight"] * req.confidence + cfg["coverage_weight"] * coverage
        score = _pct(raw)

        if score >= cfg["high_band"]:
            level = "high"
        elif score >= cfg["medium_band"]:
            level = "medium"
        else:
            level = "low"

        return Confidence(score=score, level=level, sources_used=sources_used)

    # ------------------------------------------------------------------ #
    # 4 + 6. RESPONSE DRAFT (fusion du contexte Farmer)                  #
    # ------------------------------------------------------------------ #
    def response_draft(self, req: CopilotRequest, safety: Safety,
                       know: Knowledge) -> Draft:
        name = req.farmer_name or "Bonjour"
        greeting = f"Bonjour {req.farmer_name}," if req.farmer_name else "Bonjour,"
        conf_pct = _pct(req.confidence)

        # Cas bloqué par le Safety Guard : brouillon "à valider par l'expert"
        if not safety.auto_reply_allowed:
            body = (
                f"{greeting}\n\n"
                f"L'analyse de votre plante n'a pas permis d'établir un diagnostic "
                f"avec une certitude suffisante. Votre cas a été transmis à un "
                f"expert agronome pour un examen approfondi. Vous recevrez une "
                f"réponse détaillée prochainement.\n\n"
                f"Merci de votre patience."
            )
            return Draft(language="fr", subject="Analyse en cours d'examen", body=body)

        # Plante saine
        if know.severity == "none":
            prevention = _bullets(know.prevention)
            body = (
                f"{greeting}\n\n"
                f"Bonne nouvelle : l'analyse de votre plante n'a détecté aucune "
                f"maladie (confiance {conf_pct}%). Votre culture est en bonne santé.\n\n"
                f"Pour la maintenir ainsi :\n{prevention}\n\n"
                f"{_followup_line(know.followup_days if hasattr(know, 'followup_days') else config.DEFAULT_FOLLOWUP_DAYS)}"
            )
            return Draft(language="fr", subject="Résultat de votre analyse — plante saine",
                        body=body)

        # Maladie détectée : réponse personnalisée
        conf_sentence = _confidence_sentence(req.confidence)
        gov = f" dans la région de {req.governorate}" if req.governorate else ""
        weather_note = _weather_note(req)

        treatment = _treatment_block(req, know)
        prevention = _bullets(know.prevention)
        warnings = _warnings_block(know.warnings)
        history_note = _history_note(req.history_count)

        body = (
            f"{greeting}\n\n"
            f"L'analyse de votre feuille indique une probabilité de "
            f"{know.disease_fr} (confiance {conf_pct}%). {conf_sentence}\n\n"
            f"Mesures recommandées{gov} :\n{treatment}\n\n"
            f"Prévention :\n{prevention}\n"
            f"{warnings}"
            f"{weather_note}"
            f"{history_note}\n"
            f"{_followup_line(_followup_days(know))}"
        )
        return Draft(language="fr",
                    subject=f"Résultat de votre analyse — {know.disease_fr}",
                    body=body)

    # ------------------------------------------------------------------ #
    # ORCHESTRATION                                                      #
    # ------------------------------------------------------------------ #
    def build(self, req: CopilotRequest) -> CopilotResponse:
        safety = self.safety_guard(req)
        know = self.knowledge(req)
        priority = self.triage_score(req, know.severity)
        confidence = self.response_confidence(req, know.found)
        draft = self.response_draft(req, safety, know)
        return CopilotResponse(
            analysis_id=req.analysis_id,
            safety=safety,
            priority=priority,
            confidence=confidence,
            draft=draft,
            knowledge=know,
        )


# --------------------------- helpers de rédaction --------------------------- #

def _bullets(items: List[str]) -> str:
    return "\n".join(f"  • {it}" for it in items) if items else "  • —"


def _confidence_sentence(conf: float) -> str:
    if conf >= 0.85:
        return "Ce diagnostic présente une confiance élevée."
    if conf >= 0.70:
        return "Ce diagnostic est probable ; un suivi terrain est conseillé."
    return "Ce diagnostic reste à confirmer par l'observation."


def _treatment_block(req: CopilotRequest, know: Knowledge) -> str:
    # Priorité au traitement fourni par le moteur de recommandation LightGBM,
    # sinon on retombe sur la base de connaissances.
    if req.recommendation and req.recommendation.treatment:
        lines = [f"  • {req.recommendation.treatment}"]
        if req.recommendation.irrigation:
            lines.append(f"  • Irrigation : {req.recommendation.irrigation}")
        return "\n".join(lines)
    t = know.treatment
    return "\n".join([
        f"  • Chimique : {t.get('chemical', '—')}",
        f"  • Biologique : {t.get('biological', '—')}",
        f"  • Organique : {t.get('organic', '—')}",
    ])


def _warnings_block(warnings: List[str]) -> str:
    if not warnings:
        return ""
    body = "\n".join(f"  ⚠ {w}" for w in warnings)
    return f"\nAvertissements :\n{body}\n"


def _weather_note(req: CopilotRequest) -> str:
    w = req.weather
    if not w or w.humidity is None:
        return ""
    if w.humidity >= 70:
        return ("\nLes conditions actuelles (humidité élevée) favorisent le "
                "développement de la maladie : renforcez la surveillance.\n")
    return ""


def _history_note(count: int) -> str:
    if count >= 3:
        return ("\nNous notons plusieurs analyses récentes sur votre exploitation : "
                "une visite de suivi pourrait être utile.\n")
    return ""


def _followup_days(know: Knowledge) -> int:
    # La fiche KB peut porter followup_days ; sinon défaut.
    return getattr(know, "followup_days", None) or config.DEFAULT_FOLLOWUP_DAYS


def _followup_line(days: int) -> str:
    return (f"Une nouvelle analyse dans {days} jours permettra d'évaluer "
            f"l'évolution de la plante.")
