<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Tunisia governorates
    |--------------------------------------------------------------------------
    |
    | Centroid coordinates and climate zone for each of the 24 governorates.
    | zone: nord (humide) | centre (semi-aride) | sud (aride).
    | Shared by the HeatmapService and the demo data seeder.
    |
    */
    'governorates' => [
        'Tunis'        => ['lat' => 36.80, 'lng' => 10.18, 'zone' => 'nord'],
        'Ariana'       => ['lat' => 36.86, 'lng' => 10.19, 'zone' => 'nord'],
        'Ben Arous'    => ['lat' => 36.75, 'lng' => 10.22, 'zone' => 'nord'],
        'Manouba'      => ['lat' => 36.81, 'lng' => 10.10, 'zone' => 'nord'],
        'Nabeul'       => ['lat' => 36.45, 'lng' => 10.74, 'zone' => 'nord'],
        'Zaghouan'     => ['lat' => 36.40, 'lng' => 10.14, 'zone' => 'nord'],
        'Bizerte'      => ['lat' => 37.27, 'lng' => 9.87, 'zone' => 'nord'],
        'Béja'         => ['lat' => 36.73, 'lng' => 9.18, 'zone' => 'nord'],
        'Jendouba'     => ['lat' => 36.50, 'lng' => 8.78, 'zone' => 'nord'],
        'Le Kef'       => ['lat' => 36.17, 'lng' => 8.70, 'zone' => 'nord'],
        'Siliana'      => ['lat' => 36.08, 'lng' => 9.37, 'zone' => 'nord'],
        'Kairouan'     => ['lat' => 35.68, 'lng' => 10.10, 'zone' => 'centre'],
        'Kasserine'    => ['lat' => 35.17, 'lng' => 8.83, 'zone' => 'centre'],
        'Sidi Bouzid'  => ['lat' => 35.04, 'lng' => 9.48, 'zone' => 'centre'],
        'Sousse'       => ['lat' => 35.83, 'lng' => 10.63, 'zone' => 'centre'],
        'Monastir'     => ['lat' => 35.77, 'lng' => 10.83, 'zone' => 'centre'],
        'Mahdia'       => ['lat' => 35.50, 'lng' => 11.06, 'zone' => 'centre'],
        'Sfax'         => ['lat' => 34.74, 'lng' => 10.76, 'zone' => 'centre'],
        'Gafsa'        => ['lat' => 34.42, 'lng' => 8.78, 'zone' => 'centre'],
        'Tozeur'       => ['lat' => 33.92, 'lng' => 8.13, 'zone' => 'sud'],
        'Kebili'       => ['lat' => 33.70, 'lng' => 8.97, 'zone' => 'sud'],
        'Gabès'        => ['lat' => 33.88, 'lng' => 10.10, 'zone' => 'sud'],
        'Médenine'     => ['lat' => 33.35, 'lng' => 10.50, 'zone' => 'sud'],
        'Tataouine'    => ['lat' => 32.93, 'lng' => 10.45, 'zone' => 'sud'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Governorate neighbors
    |--------------------------------------------------------------------------
    |
    | Real geographic adjacency (simplified), one entry per governorate above.
    | Ported 1:1 from ai/risk_model/tunisia_config.py's NEIGHBORS dict, with
    | keys/values translated to match this file's spellings ('Kef' -> 'Le Kef',
    | 'Kébili' -> 'Kebili'). Used by RiskForecastService to compute
    | cross-governorate disease pressure ("nearby_cases").
    |
    */
    'neighbors' => [
        'Tunis'        => ['Ariana', 'Ben Arous', 'Manouba'],
        'Ariana'       => ['Tunis', 'Manouba', 'Bizerte'],
        'Ben Arous'    => ['Tunis', 'Nabeul', 'Zaghouan'],
        'Manouba'      => ['Tunis', 'Ariana', 'Bizerte', 'Béja'],
        'Nabeul'       => ['Ben Arous', 'Zaghouan', 'Sousse'],
        'Zaghouan'     => ['Ben Arous', 'Nabeul', 'Siliana', 'Kairouan'],
        'Bizerte'      => ['Ariana', 'Manouba', 'Béja'],
        'Béja'         => ['Manouba', 'Bizerte', 'Jendouba', 'Le Kef', 'Siliana'],
        'Jendouba'     => ['Béja', 'Le Kef'],
        'Le Kef'       => ['Béja', 'Jendouba', 'Siliana', 'Kasserine'],
        'Siliana'      => ['Béja', 'Le Kef', 'Zaghouan', 'Kairouan', 'Kasserine'],
        'Kairouan'     => ['Zaghouan', 'Siliana', 'Kasserine', 'Sidi Bouzid', 'Sfax', 'Sousse', 'Mahdia'],
        'Kasserine'    => ['Le Kef', 'Siliana', 'Kairouan', 'Sidi Bouzid', 'Gafsa'],
        'Sidi Bouzid'  => ['Kairouan', 'Kasserine', 'Gafsa', 'Sfax', 'Gabès'],
        'Sousse'       => ['Nabeul', 'Kairouan', 'Monastir'],
        'Monastir'     => ['Sousse', 'Mahdia'],
        'Mahdia'       => ['Monastir', 'Sousse', 'Sfax', 'Kairouan'],
        'Sfax'         => ['Mahdia', 'Kairouan', 'Sidi Bouzid', 'Gabès'],
        'Gafsa'        => ['Kasserine', 'Sidi Bouzid', 'Tozeur', 'Gabès', 'Kebili'],
        'Tozeur'       => ['Gafsa', 'Kebili'],
        'Kebili'       => ['Gafsa', 'Tozeur', 'Gabès', 'Médenine'],
        'Gabès'        => ['Sfax', 'Sidi Bouzid', 'Gafsa', 'Kebili', 'Médenine'],
        'Médenine'     => ['Gabès', 'Kebili', 'Tataouine'],
        'Tataouine'    => ['Médenine'],
    ],
];
