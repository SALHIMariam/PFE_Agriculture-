"""
Configuration géographique des 24 gouvernorats tunisiens.
Cohérent avec config/tunisia.php déjà utilisé par la heatmap AgriDetect.
"""

GOVERNORATES = {
    "Tunis":        {"lat": 36.8065, "lng": 10.1815, "zone": "North"},
    "Ariana":       {"lat": 36.8625, "lng": 10.1956, "zone": "North"},
    "Ben Arous":    {"lat": 36.7533, "lng": 10.2282, "zone": "North"},
    "Manouba":      {"lat": 36.8081, "lng": 10.0972, "zone": "North"},
    "Nabeul":       {"lat": 36.4561, "lng": 10.7376, "zone": "North"},
    "Zaghouan":     {"lat": 36.4028, "lng": 10.1425, "zone": "North"},
    "Bizerte":      {"lat": 37.2744, "lng": 9.8739,  "zone": "North"},
    "Béja":         {"lat": 36.7256, "lng": 9.1817,  "zone": "North"},
    "Jendouba":     {"lat": 36.5011, "lng": 8.7803,  "zone": "North"},
    "Kef":          {"lat": 36.1826, "lng": 8.7148,  "zone": "North"},
    "Siliana":      {"lat": 36.0844, "lng": 9.3708,  "zone": "North"},
    "Sousse":       {"lat": 35.8256, "lng": 10.6369, "zone": "Center"},
    "Monastir":     {"lat": 35.7643, "lng": 10.8113, "zone": "Center"},
    "Mahdia":       {"lat": 35.5047, "lng": 11.0622, "zone": "Center"},
    "Sfax":         {"lat": 34.7406, "lng": 10.7603, "zone": "Center"},
    "Kairouan":     {"lat": 35.6781, "lng": 10.0963, "zone": "Center"},
    "Kasserine":    {"lat": 35.1676, "lng": 8.8365,  "zone": "Center"},
    "Sidi Bouzid":  {"lat": 35.0381, "lng": 9.4858,  "zone": "Center"},
    "Gafsa":        {"lat": 34.4250, "lng": 8.7842,  "zone": "South"},
    "Tozeur":       {"lat": 33.9197, "lng": 8.1335,  "zone": "South"},
    "Kébili":       {"lat": 33.7044, "lng": 8.9690,  "zone": "South"},
    "Gabès":        {"lat": 33.8815, "lng": 10.0982, "zone": "South"},
    "Médenine":     {"lat": 33.3399, "lng": 10.4959, "zone": "South"},
    "Tataouine":    {"lat": 32.9297, "lng": 10.4518, "zone": "South"},
}

# Gouvernorats limitrophes (adjacence géographique réelle, simplifiée)
NEIGHBORS = {
    "Tunis":        ["Ariana", "Ben Arous", "Manouba"],
    "Ariana":       ["Tunis", "Manouba", "Bizerte"],
    "Ben Arous":    ["Tunis", "Nabeul", "Zaghouan"],
    "Manouba":      ["Tunis", "Ariana", "Bizerte", "Béja"],
    "Nabeul":       ["Ben Arous", "Zaghouan", "Sousse"],
    "Zaghouan":     ["Ben Arous", "Nabeul", "Siliana", "Kairouan"],
    "Bizerte":      ["Ariana", "Manouba", "Béja"],
    "Béja":         ["Manouba", "Bizerte", "Jendouba", "Kef", "Siliana"],
    "Jendouba":     ["Béja", "Kef"],
    "Kef":          ["Béja", "Jendouba", "Siliana", "Kasserine"],
    "Siliana":      ["Béja", "Kef", "Zaghouan", "Kairouan", "Kasserine"],
    "Sousse":       ["Nabeul", "Kairouan", "Monastir"],
    "Monastir":     ["Sousse", "Mahdia"],
    "Mahdia":       ["Monastir", "Sousse", "Sfax", "Kairouan"],
    "Sfax":         ["Mahdia", "Kairouan", "Sidi Bouzid", "Gabès"],
    "Kairouan":     ["Zaghouan", "Siliana", "Kasserine", "Sidi Bouzid", "Sfax", "Sousse", "Mahdia"],
    "Kasserine":    ["Kef", "Siliana", "Kairouan", "Sidi Bouzid", "Gafsa"],
    "Sidi Bouzid":  ["Kairouan", "Kasserine", "Gafsa", "Sfax", "Gabès"],
    "Gafsa":        ["Kasserine", "Sidi Bouzid", "Tozeur", "Gabès", "Kébili"],
    "Tozeur":       ["Gafsa", "Kébili"],
    "Kébili":       ["Gafsa", "Tozeur", "Gabès", "Médenine"],
    "Gabès":        ["Sfax", "Sidi Bouzid", "Gafsa", "Kébili", "Médenine"],
    "Médenine":     ["Gabès", "Kébili", "Tataouine"],
    "Tataouine":    ["Médenine"],
}

# Courbes météo mensuelles moyennes par zone climatique (Nord = référence)
# month -> (temp_mean, temp_std, humidity_mean, humidity_std, rainfall_mean_mm, rainfall_std, wind_mean)
NORTH_MONTHLY = {
    1:  (12, 3, 78, 6, 60, 20, 14), 2:  (13, 3, 75, 6, 55, 18, 14),
    3:  (15, 3, 70, 6, 45, 15, 13), 4:  (18, 3, 68, 6, 35, 12, 12),
    5:  (22, 3, 65, 6, 20, 8,  11), 6:  (26, 3, 60, 6, 8,  5,  10),
    7:  (29, 3, 55, 6, 2,  3,  10), 8:  (30, 3, 58, 6, 3,  3,  10),
    9:  (27, 3, 65, 6, 15, 8,  11), 10: (23, 3, 70, 6, 35, 12, 12),
    11: (17, 3, 75, 6, 55, 15, 13), 12: (13, 3, 80, 6, 65, 20, 14),
}

ZONE_OFFSET = {
    # (temp_delta, humidity_delta, rainfall_factor, wind_delta)
    "North":  (0,  0,   1.0,  0),
    "Center": (3, -10,  0.55, 1),
    "South":  (7, -28,  0.15, 2),
}

SEASON_BY_MONTH = {
    12: "Winter", 1: "Winter", 2: "Winter",
    3: "Spring", 4: "Spring", 5: "Spring",
    6: "Summer", 7: "Summer", 8: "Summer",
    9: "Autumn", 10: "Autumn", 11: "Autumn",
}
