"""
Configuration centrale du service Assistant AI.
Tous les seuils et poids sont ici pour être ajustés sans toucher à la logique.
"""

# ---------------------------------------------------------------------------
# 1. SAFETY GUARD — quand l'IA ne doit PAS proposer de réponse automatique
# ---------------------------------------------------------------------------
SAFETY = {
    # En dessous de ce niveau de confiance top-1, le diagnostic est jugé incertain
    "min_confidence": 0.60,
    # Écart minimal entre top-1 et top-2 ; en dessous, les deux maladies sont
    # trop proches pour trancher automatiquement
    "min_margin": 0.15,
}

# ---------------------------------------------------------------------------
# 2. TRIAGE — poids de chaque composante du Priority Score (total = 100)
# ---------------------------------------------------------------------------
TRIAGE_WEIGHTS = {
    "severity": 25,          # gravité de la maladie (base de connaissances)
    "risk_level": 25,        # risque de propagation (modèle de risque)
    "confidence": 20,        # certitude du diagnostic CNN
    "regional_pressure": 15,  # nombre de cas similaires en attente dans la région
    "pending_status": 15,    # analyse en attente de validation
}

# Conversion du niveau de risque textuel en fraction (0..1)
RISK_LEVEL_SCORE = {
    "low": 0.0,
    "medium": 0.4,
    "high": 0.7,
    "very_high": 1.0,
}

# Conversion du niveau de sévérité de la maladie en fraction (0..1)
SEVERITY_SCORE = {
    "none": 0.0,        # plante saine
    "low": 0.35,
    "medium": 0.6,
    "high": 0.85,
    "critical": 1.0,
}

# Bornes des paliers de priorité affichés à l'Expert
PRIORITY_BANDS = {
    "urgent": 70,       # >= 70  -> rouge
    "important": 40,    # >= 40  -> orange
    # sinon              < 40   -> vert (normal)
}

# ---------------------------------------------------------------------------
# 3. CONFIDENCE DE LA RÉPONSE — 60% certitude diagnostic + 40% couverture sources
# ---------------------------------------------------------------------------
RESPONSE_CONFIDENCE = {
    "diagnosis_weight": 0.60,
    "coverage_weight": 0.40,
    # Sources optionnelles comptées dans la couverture (le diagnostic est
    # toujours présent, il n'est donc pas compté ici)
    "optional_sources": ["recommendation", "knowledge_base", "farmer_history", "weather"],
    "high_band": 75,    # >= 75 -> haute confiance
    "medium_band": 50,  # >= 50 -> confiance moyenne, sinon faible
}

# ---------------------------------------------------------------------------
# 4. SUIVI par défaut proposé au Farmer (jours) si non défini dans la fiche
# ---------------------------------------------------------------------------
DEFAULT_FOLLOWUP_DAYS = 7

# Nombre minimal de cas pour déclencher une alerte "réponse groupée" (batch)
BATCH_MIN_CASES = 3
