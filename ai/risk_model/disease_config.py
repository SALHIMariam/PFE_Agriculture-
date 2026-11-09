"""
Les 39 classes de maladies d'AgriDetect (best.pt, EfficientNetB0),
mappées à un type de pathogène pour modéliser une sensibilité météo réaliste.

pathogen_type utilisé pour la génération du dataset :
- fungal      : champignons classiques, favorisés par humidité 70-90% + températures douces
- rust        : rouilles, favorisées par humidité modérée + températures plus fraîches
- oomycete    : mildous (late blight, downy mildew), très sensibles à l'humidité/pluie
- bacterial   : bactéries, favorisées par chaleur + humidité + éclaboussures de pluie
- viral_vector: virus transmis par insectes (aleurodes...), favorisés par chaleur + sécheresse
- pest        : ravageurs (acariens), favorisés par chaleur + sécheresse, inhibés par la pluie
- nutritional : carences, indépendantes de la météo
- healthy     : classe saine, risque quasi nul
"""

DISEASES = {
    "Apple__black_rot":                            ("Apple", "fungal"),
    "Apple__cedar_apple_rust":                      ("Apple", "rust"),
    "Apple__healthy":                               ("Apple", "healthy"),
    "Apple__scab":                                  ("Apple", "fungal"),

    "Bean__beans_angular_leaf_spot_disease":        ("Bean", "bacterial"),
    "Bean__beans_healthy_crop":                     ("Bean", "healthy"),
    "Bean__beans_rust_disease":                     ("Bean", "rust"),

    "Corn__common_rust":                            ("Corn", "rust"),
    "Corn__gray_leaf_spot":                         ("Corn", "fungal"),
    "Corn__healthy":                                ("Corn", "healthy"),
    "Corn__maize_streak_virus_disease":             ("Corn", "viral_vector"),
    "Corn__northern_leaf_blight":                   ("Corn", "fungal"),

    "Cucumber__anthracnose":                        ("Cucumber", "fungal"),
    "Cucumber__downy_mildew":                       ("Cucumber", "oomycete"),
    "Cucumber__gummy_stem_blight":                  ("Cucumber", "fungal"),
    "Cucumber__healthy":                            ("Cucumber", "healthy"),
    "Cucumber__powdery_mildew":                     ("Cucumber", "fungal"),

    "Grape__black_measles":                         ("Grape", "fungal"),
    "Grape__black_rot":                             ("Grape", "fungal"),
    "Grape__healthy":                               ("Grape", "healthy"),
    "Grape__leaf_blight":                           ("Grape", "fungal"),

    "Groundnut__early_leaf_spot":                   ("Groundnut", "fungal"),
    "Groundnut__healthy":                           ("Groundnut", "healthy"),
    "Groundnut__late_leaf_spot":                    ("Groundnut", "fungal"),
    "Groundnut__nutrition_deficiency":              ("Groundnut", "nutritional"),
    "Groundnut__rust":                              ("Groundnut", "rust"),

    "Potato__early_blight":                         ("Potato", "fungal"),
    "Potato__healthy":                              ("Potato", "healthy"),
    "Potato__late_blight":                          ("Potato", "oomycete"),

    "Tomato__bacterial_spot":                       ("Tomato", "bacterial"),
    "Tomato__early_blight":                         ("Tomato", "fungal"),
    "Tomato__healthy":                              ("Tomato", "healthy"),
    "Tomato__late_blight":                          ("Tomato", "oomycete"),
    "Tomato__septoria_leaf_spot":                   ("Tomato", "fungal"),
    "Tomato__spider_mites_two_spotted_spider_mite": ("Tomato", "pest"),
    "Tomato__yellow_leaf_curl_virus":               ("Tomato", "viral_vector"),

    "Wheat__healthy":                               ("Wheat", "healthy"),
    "Wheat__septoria":                              ("Wheat", "fungal"),
    "Wheat__stripe_rust":                           ("Wheat", "rust"),
}

assert len(DISEASES) == 39, f"Expected 39 classes, got {len(DISEASES)}"

# Plage optimale (favorable au risque) par type de pathogène
# (temp_min, temp_max, humidity_min_favorable, rain_sensitivity, dry_favored)
PATHOGEN_PROFILE = {
    "fungal":       {"t_opt": (18, 28), "h_min": 65, "rain_boost": 1.0, "dry_favored": False},
    "rust":         {"t_opt": (12, 24), "h_min": 55, "rain_boost": 0.6, "dry_favored": False},
    "oomycete":     {"t_opt": (14, 25), "h_min": 80, "rain_boost": 1.6, "dry_favored": False},
    "bacterial":    {"t_opt": (24, 34), "h_min": 65, "rain_boost": 1.2, "dry_favored": False},
    "viral_vector": {"t_opt": (26, 36), "h_min": 0,  "rain_boost": -0.8, "dry_favored": True},
    "pest":         {"t_opt": (27, 37), "h_min": 0,  "rain_boost": -1.2, "dry_favored": True},
    "nutritional":  {"t_opt": (0, 45),  "h_min": 0,  "rain_boost": 0.0, "dry_favored": False},
    "healthy":      {"t_opt": (0, 45),  "h_min": 0,  "rain_boost": 0.0, "dry_favored": False},
}
