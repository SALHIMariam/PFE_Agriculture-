<?php

return [
    // Seuil au-delà duquel une prédiction IA est considérée "haute confiance"
    // dans la matrice de fiabilité et les buckets de calibration.
    'confidence_threshold' => (float) env('AI_CONFIDENCE_THRESHOLD', 0.7),

    // Seuil au-delà duquel une prédiction rejetée par l'expert est qualifiée
    // d'"overconfidence" (l'IA était très sûre d'elle et avait tort).
    'overconfidence_threshold' => (float) env('AI_OVERCONFIDENCE_THRESHOLD', 0.9),

    // Nombre minimum de cas pour qu'une maladie ait un statut de fiabilité
    // significatif (sous ce seuil : "insufficient_data", jamais de verdict).
    'min_sample_size' => (int) env('AI_MIN_SAMPLE_SIZE', 5),
];
