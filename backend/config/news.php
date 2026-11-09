<?php

return [
    /*
    |--------------------------------------------------------------------------
    | News ingestion sources
    |--------------------------------------------------------------------------
    |
    | RSS feeds polled by NewsIngestionService. Google News query feeds are
    | scoped to French-language agriculture news (Tunisia + general). Add
    | curated specialized feeds here as they're vetted.
    |
    */
    'sources' => [
        [
            'name' => 'Google News — Agriculture Tunisie',
            'url' => 'https://news.google.com/rss/search?q=agriculture+tunisie+maladie+plante&hl=fr&gl=TN&ceid=TN:fr',
        ],
        [
            'name' => 'Google News — Maladies des cultures',
            'url' => 'https://news.google.com/rss/search?q=maladie+culture+traitement+agricole&hl=fr&gl=FR&ceid=FR:fr',
        ],
        [
            'name' => 'Google News — Alertes phytosanitaires',
            'url' => 'https://news.google.com/rss/search?q=alerte+phytosanitaire+ravageur&hl=fr&gl=FR&ceid=FR:fr',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Categories
    |--------------------------------------------------------------------------
    */
    'categories' => ['new_disease', 'new_treatment', 'trend', 'alert', 'info'],

    /*
    |--------------------------------------------------------------------------
    | Minimum relevance score served to the frontend
    |--------------------------------------------------------------------------
    */
    'min_relevance_score' => 0.5,

    /*
    |--------------------------------------------------------------------------
    | The 9 canonical crops (shared convention with tunisia.php / heatmap)
    |--------------------------------------------------------------------------
    */
    'crops' => [
        'Apple', 'Bean', 'Corn', 'Cucumber', 'Grape', 'Groundnut', 'Potato', 'Tomato', 'Wheat',
    ],

    /*
    |--------------------------------------------------------------------------
    | Règles de classification (source de vérité partagée avec le Python)
    |--------------------------------------------------------------------------
    |
    | Mots-clés des cultures, maladies (classes exactes du CNN), catégories,
    | contexte agricole et barème de score. Le même fichier est lu par
    | ai/news/enrich.py (service IA) et par NewsAiClient::fallbackEnrich :
    | les deux couches ne peuvent donc plus diverger.
    |
    */
    'keywords_path' => env('NEWS_KEYWORDS_PATH', base_path('../ai/news/keywords.json')),

    /*
    |--------------------------------------------------------------------------
    | Enrichissement des articles retenus (lien réel, image, résumé)
    |--------------------------------------------------------------------------
    |
    | Pour les articles au-dessus du seuil de pertinence uniquement : résolution
    | du lien Google News vers l'article source, puis lecture de og:image et
    | og:description sur la page de l'article. Best-effort : en cas d'échec on
    | garde le lien Google News et la description du flux.
    |
    */
    'resolve_links' => env('NEWS_RESOLVE_LINKS', true),
    'fetch_timeout' => 8,

];
