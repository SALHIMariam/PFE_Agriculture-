"""
Curated agronomic content — the authoritative source for every recommendation.

Design rule: the ML model never generates agronomic text. It selects a
Recommendation_ID; the text below is what the farmer actually receives. This
keeps clinical content reviewable by an agronomist and immune to model drift.

Each entry is keyed by the canonical class name from src.config.CLASSES.
"""
from __future__ import annotations

# Standard references reused across entries.
REF = {
    "eppo": "EPPO Global Database — pest datasheets",
    "frac": "FRAC Code List (fungicide resistance management)",
    "irac": "IRAC Mode of Action Classification",
    "cabi": "CABI Crop Protection Compendium",
    "dgpa": "DGPCQPA Tunisia — homologated plant-protection products list",
    "fao": "FAO Plant Production and Protection guidelines",
}

DISEASES: dict[str, dict] = {
    # ---------------------------------------------------------------- APPLE
    "Apple_black_rot": {
        "disease_name": "Apple Black Rot",
        "pathogen": "Botryosphaeria obtusa (Diplodia seriata)",
        "type": "Fungal",
        "description": (
            "Fungal disease attacking leaves, fruit and wood. It overwinters in mummified "
            "fruit and cankered wood, then releases spores during warm rain events. Frog-eye "
            "leaf spots are the visible stage; the economic damage comes from fruit rot and "
            "limb cankers that girdle branches over successive seasons."
        ),
        "symptoms": [
            "Circular 'frog-eye' leaf spots: purple margin, tan centre",
            "Firm brown fruit rot with concentric rings, often starting at the calyx",
            "Sunken reddish-brown cankers on limbs, bark peeling at the edges",
            "Mummified fruit persisting on the tree through winter",
        ],
        "chemical": [
            "Captan 80 WG at 1.9 kg/ha from pink bud, repeat every 10-14 days in wet weather",
            "Thiophanate-methyl 70 WP (FRAC 1) at petal fall — alternate to avoid resistance",
            "Difenoconazole (FRAC 3) during fruit development, max 3 applications per season",
        ],
        "biological": [
            "Bacillus subtilis QST 713 sprays every 7 days as a preventive rotation partner",
            "Trichoderma harzianum paste on pruning wounds to block canker colonisation",
        ],
        "organic": [
            "Copper hydroxide at silver tip / green tip (dormant to early bud)",
            "Lime sulphur dormant spray to reduce overwintering inoculum",
            "Remove and burn all mummified fruit and cankered wood in winter",
        ],
        "irrigation": [
            "Switch to drip or under-tree micro-sprinklers — never wet the canopy",
            "Irrigate early morning so foliage dries before nightfall",
            "Avoid over-irrigation during ripening: soft fruit is far more infectible",
        ],
        "fertilization": [
            "Balanced NPK; keep nitrogen moderate — lush growth is highly susceptible",
            "Calcium sprays (calcium chloride 0.5%) during fruit sizing to firm the skin",
            "Apply potassium in late season to harden wood before dormancy",
        ],
        "pruning": [
            "Cut cankered limbs 20-30 cm below the visible margin, in dry weather",
            "Disinfect secateurs with 70% alcohol between every cut",
            "Open the canopy for airflow; destroy all prunings off-site — do not compost",
        ],
        "prevention": [
            "Sanitation is the single highest-return action: remove mummies and deadwood",
            "Avoid mechanical wounds; protect large cuts with wound sealant",
            "Maintain vigour — stressed and winter-injured trees are colonised first",
        ],
        "monitoring": [
            "Inspect fruit clusters and limb crotches after every rain event",
            "Flag and map cankered limbs for winter removal",
        ],
        "recovery_time": "Leaf infections stop in 2-3 weeks with control; wood cankers require 1-2 seasons of sanitation",
        "warnings": [
            "Fruit already showing rot cannot be cured — remove it to stop spore production",
            "Respect the pre-harvest interval of every product (Captan: 7 days on apple)",
            "Verify the product is homologated for apple in Tunisia before purchase",
        ],
        "references": [REF["eppo"], REF["frac"], REF["dgpa"]],
    },
    "Apple_cedar_apple_rust": {
        "disease_name": "Cedar Apple Rust",
        "pathogen": "Gymnosporangium juniperi-virginianae",
        "type": "Fungal",
        "description": (
            "A rust requiring two hosts: juniper/cedar and apple. Galls on nearby junipers "
            "swell after spring rain and release spores that infect apple leaves. Without a "
            "juniper within roughly 1-2 km the disease cannot complete its cycle, which makes "
            "host removal the most durable control."
        ),
        "symptoms": [
            "Bright yellow-orange spots on the upper leaf surface, often with a red border",
            "Tube-like fringed structures (aecia) on the underside of the spots",
            "Premature defoliation in heavy years; deformed, spotted fruit",
            "Orange gelatinous galls on nearby juniper after spring rain",
        ],
        "chemical": [
            "Myclobutanil (FRAC 3) from pink bud, repeating at 10-day intervals through spore release",
            "Difenoconazole or tebuconazole as alternates within the same window",
            "Mancozeb 80 WP as a protectant partner early in the season",
        ],
        "biological": [
            "Bacillus subtilis as a low-pressure preventive; limited curative effect on rust",
        ],
        "organic": [
            "Sulphur sprays applied preventively before infection periods",
            "Remove juniper galls in late winter within 1 km where feasible",
            "Plant resistant cultivars (e.g. Liberty, Freedom, Enterprise) on replanting",
        ],
        "irrigation": [
            "Drip irrigation only — spore germination requires 4-6 h of leaf wetness",
            "No overhead watering between green tip and 3 weeks after petal fall",
        ],
        "fertilization": [
            "Standard balanced programme; support defoliated trees with a light foliar feed",
            "Avoid heavy late nitrogen which prolongs susceptible young growth",
        ],
        "pruning": [
            "Thin the canopy so leaves dry quickly after rain",
            "No specific rust pruning needed — the fungus does not form cankers on apple",
        ],
        "prevention": [
            "Break the two-host cycle: remove or replace nearby junipers/cedars",
            "Time all sprays to the spring gall-release window; sprays after that are wasted",
            "Choose resistant rootstock-cultivar combinations for new plantings",
        ],
        "monitoring": [
            "Watch junipers after the first warm spring rains — orange horns mean spores are flying",
            "Scout apple leaves 10-14 days after each release event",
        ],
        "recovery_time": "Current-season lesions persist, but new infection stops within 2-3 weeks; full recovery next flush",
        "warnings": [
            "Sprays applied after the juniper gall window give no benefit — timing is everything",
            "Do not exceed the seasonal cap on DMI fungicides (resistance risk)",
        ],
        "references": [REF["eppo"], REF["cabi"], REF["frac"]],
    },
    "Apple_scab": {
        "disease_name": "Apple Scab",
        "pathogen": "Venturia inaequalis",
        "type": "Fungal",
        "description": (
            "The most economically damaging apple disease in humid climates. Ascospores are "
            "discharged from overwintered leaf litter during spring rain; infection depends on "
            "the combination of temperature and hours of leaf wetness described by the Mills "
            "table. Left uncontrolled it causes total fruit downgrade."
        ),
        "symptoms": [
            "Olive-green velvety lesions on leaves, later turning dark and corky",
            "Leaf puckering and distortion around lesions; early defoliation",
            "Rough scabby corky patches on fruit, sometimes cracking",
            "Lesions on the underside of sepals in early season",
        ],
        "chemical": [
            "Protectant: mancozeb or captan applied before each predicted infection period",
            "Curative (within 72 h of infection): difenoconazole or myclobutanil (FRAC 3)",
            "Post-infection: dodine or an SDHI (FRAC 7) — strictly alternate FRAC groups",
        ],
        "biological": [
            "Bacillus subtilis QST 713 in low-pressure periods and close to harvest",
            "Autumn urea spray on leaf litter (5%) to accelerate microbial breakdown of inoculum",
        ],
        "organic": [
            "Sulphur or copper on a strict 7-day preventive schedule in the primary season",
            "Shred and remove fallen leaves in autumn — the primary inoculum source",
            "Grow scab-resistant (Vf gene) cultivars where replanting",
        ],
        "irrigation": [
            "Eliminate overhead irrigation entirely during the primary infection season",
            "Irrigate at dawn so any wetting period is as short as possible",
        ],
        "fertilization": [
            "Moderate nitrogen — succulent shoots stay susceptible longer",
            "Autumn urea application doubles as sanitation and nutrition",
            "Support defoliated trees with potassium to protect next year's bud set",
        ],
        "pruning": [
            "Winter-prune for an open canopy: faster drying is direct disease control",
            "Remove watersprouts which form dense, humid interior growth",
        ],
        "prevention": [
            "Autumn leaf-litter removal cuts primary inoculum dramatically",
            "Use a Mills-table or weather-station model to time sprays rather than the calendar",
            "Maintain protectant cover on all new growth during rainy spells",
        ],
        "monitoring": [
            "Track leaf wetness hours and temperature to identify infection periods",
            "Scout terminal leaves and fruitlets 10-14 days after each wet event",
        ],
        "recovery_time": "New infection halts within 1-2 weeks of correct spraying; existing fruit scabs are permanent",
        "warnings": [
            "Scabbed fruit cannot be cured — the goal is protecting uninfected tissue",
            "V. inaequalis develops resistance quickly: never apply the same FRAC group twice in a row",
            "Respect pre-harvest intervals; scab sprays often run late into the season",
        ],
        "references": [REF["eppo"], REF["frac"], REF["fao"]],
    },
    # ----------------------------------------------------------------- BEAN
    "Bean_beans_angular_leaf_spot_disease": {
        "disease_name": "Bean Angular Leaf Spot",
        "pathogen": "Pseudocercospora griseola",
        "type": "Fungal",
        "description": (
            "Seed- and residue-borne fungus producing lesions bounded by leaf veins, which "
            "gives them their characteristic angular shape. Yield loss reaches 40-70% when "
            "infection arrives before flowering. Spread is by rain splash and by workers "
            "moving through a wet canopy."
        ),
        "symptoms": [
            "Angular grey-brown lesions delimited by leaf veins",
            "Grey fuzzy sporulation on the underside of lesions in humid weather",
            "Elongated dark lesions on pods and stems",
            "Severe premature defoliation from the lower canopy upward",
        ],
        "chemical": [
            "Azoxystrobin (FRAC 11) at first symptom, repeat after 14 days",
            "Mancozeb 80 WP protectant every 10-14 days under humid conditions",
            "Tebuconazole (FRAC 3) as an alternation partner",
        ],
        "biological": [
            "Trichoderma spp. applied to soil and residue to degrade inoculum",
            "Bacillus subtilis foliar sprays as a preventive rotation partner",
        ],
        "organic": [
            "Copper oxychloride sprays at 7-10 day intervals",
            "Bury or remove infected crop residue immediately after harvest",
            "Use certified disease-free seed — the primary entry route",
        ],
        "irrigation": [
            "Drip or furrow irrigation only; overhead sprinklers spread spores directly",
            "Irrigate in the morning; avoid extending night-time leaf wetness",
            "Widen row spacing to speed canopy drying",
        ],
        "fertilization": [
            "Avoid excess nitrogen — dense canopies hold humidity",
            "Ensure adequate potassium, which strengthens cell walls against penetration",
            "Foliar zinc and manganese support recovery after defoliation",
        ],
        "pruning": [
            "Not applicable — instead, thin the stand and remove the most infected lower leaves",
        ],
        "prevention": [
            "Rotate away from beans for at least 2-3 years",
            "Grow resistant/tolerant varieties where available",
            "Never work the field while foliage is wet",
        ],
        "monitoring": [
            "Scout the lower canopy twice weekly from first trifoliate leaf",
            "Increase to every 2-3 days once flowering begins",
        ],
        "recovery_time": "10-21 days to stop new lesions; existing lesions do not heal",
        "warnings": [
            "Working a wet field is one of the fastest ways to spread this pathogen",
            "Do not save seed from an infected crop",
        ],
        "references": [REF["cabi"], REF["fao"], REF["frac"]],
    },
    "Bean_beans_rust_disease": {
        "disease_name": "Bean Rust",
        "pathogen": "Uromyces appendiculatus",
        "type": "Fungal",
        "description": (
            "An obligate parasite producing rusty pustules that rupture the leaf surface. "
            "Repeated cycles every 10-14 days can defoliate a crop in weeks under moderate "
            "temperatures and long dew periods. Highly responsive to fungicides if caught early."
        ),
        "symptoms": [
            "Small reddish-brown pustules mainly on the leaf underside",
            "Yellow halo surrounding each pustule",
            "Rusty spore powder transferring to hands and clothing",
            "Progressive yellowing and defoliation from the bottom up",
        ],
        "chemical": [
            "Tebuconazole (FRAC 3) at first pustule detection",
            "Azoxystrobin or pyraclostrobin (FRAC 11), alternating groups",
            "Mancozeb as a protectant partner in mixture",
        ],
        "biological": [
            "Bacillus subtilis as a preventive; weak once pustules are established",
        ],
        "organic": [
            "Wettable sulphur every 7-10 days from early symptom",
            "Remove and destroy heavily infected lower leaves",
            "Destroy volunteer bean plants which carry inoculum between seasons",
        ],
        "irrigation": [
            "Avoid overhead irrigation; long dew periods drive germination",
            "Water early in the day; improve drainage to lower canopy humidity",
        ],
        "fertilization": [
            "Balanced NPK; excess nitrogen prolongs susceptible young tissue",
            "Potassium and silicon applications improve epidermal resistance",
        ],
        "pruning": [
            "Not applicable — remove severely infected lower leaves and increase spacing",
        ],
        "prevention": [
            "Plant resistant cultivars; race structure varies so use locally tested material",
            "Rotate crops and destroy residue after harvest",
            "Avoid late plantings that mature in cool humid periods",
        ],
        "monitoring": [
            "Check leaf undersides twice weekly, starting from the lower third",
            "Threshold: treat when pustules exceed roughly 5% of lower leaf area",
        ],
        "recovery_time": "7-14 days for the epidemic to stop; new clean growth within 3 weeks",
        "warnings": [
            "Rust cycles every 10-14 days — a single spray rarely holds a running epidemic",
            "Strobilurin resistance is documented; strictly alternate FRAC groups",
        ],
        "references": [REF["cabi"], REF["frac"], REF["eppo"]],
    },
    # ----------------------------------------------------------------- CORN
    "Corn_common_rust": {
        "disease_name": "Corn Common Rust",
        "pathogen": "Puccinia sorghi",
        "type": "Fungal",
        "description": (
            "Cool-season rust favoured by 16-25 °C and 6+ hours of dew. Spores arrive on wind "
            "rather than surviving locally in residue. Most hybrids carry partial resistance, "
            "so treatment is only economic when infection reaches the ear leaf before "
            "grain fill."
        ),
        "symptoms": [
            "Cinnamon-brown elongated pustules on both leaf surfaces",
            "Pustules scattered across the whole leaf rather than banded",
            "Pustules darkening to black as the crop matures",
            "Leaf chlorosis and early senescence in severe cases",
        ],
        "chemical": [
            "Azoxystrobin + propiconazole at VT-R1 when the ear leaf is affected",
            "Pyraclostrobin (FRAC 11) as a single well-timed application",
            "Treat only when infection reaches the upper canopy before grain fill",
        ],
        "biological": [
            "Limited options; Bacillus-based products give partial suppression only",
        ],
        "organic": [
            "Resistant hybrids are the practical organic control",
            "Wettable sulphur has partial effect in seed-production or garden-scale plots",
        ],
        "irrigation": [
            "Avoid late-evening overhead irrigation that extends the dew period",
            "Maintain even soil moisture — drought-stressed plants senesce faster once infected",
        ],
        "fertilization": [
            "Adequate nitrogen and potassium maintain green leaf area through grain fill",
            "Foliar potassium can support a stressed crop at tasselling",
        ],
        "pruning": [
            "Not applicable to field maize",
        ],
        "prevention": [
            "Choose hybrids with a good common-rust rating — this is the main lever",
            "Avoid very late plantings that reach susceptible stages in cool humid weather",
        ],
        "monitoring": [
            "Scout weekly from V8, focusing on the ear leaf and above",
            "Economic threshold: pustules on the ear leaf before or at tasselling",
        ],
        "recovery_time": "New infection stops in 10-14 days; existing pustules remain until senescence",
        "warnings": [
            "Fungicide after early dough stage rarely pays for itself",
            "Distinguish from southern rust (smaller, orange, mostly upper surface) — thresholds differ",
        ],
        "references": [REF["cabi"], REF["fao"], REF["frac"]],
    },
    "Corn_gray_leaf_spot": {
        "disease_name": "Corn Gray Leaf Spot",
        "pathogen": "Cercospora zeae-maydis",
        "type": "Fungal",
        "description": (
            "Residue-borne fungus and the main yield-limiting foliar maize disease in "
            "continuous-maize, reduced-tillage systems. Lesions are strictly bounded by veins, "
            "producing the characteristic rectangular shape. Losses can exceed 50% when the "
            "ear leaf is destroyed during grain fill."
        ),
        "symptoms": [
            "Long rectangular grey-tan lesions running parallel to the veins",
            "Lesions start on lower leaves and move upward toward the ear leaf",
            "Lesions become translucent when held to the light",
            "Coalescing lesions blight whole leaves, causing stalk cannibalisation and lodging",
        ],
        "chemical": [
            "Propiconazole + azoxystrobin at VT-R1 — the highest-return timing",
            "Pyraclostrobin (FRAC 11) where disease pressure is confirmed",
            "Prothioconazole for extended residual in high-pressure fields",
        ],
        "biological": [
            "Residue-degrading Trichoderma or Bacillus inoculants applied post-harvest",
        ],
        "organic": [
            "Tillage to bury residue and hasten decomposition",
            "Rotation to a non-host crop for at least one full season",
        ],
        "irrigation": [
            "Avoid prolonged canopy wetness; irrigate in the morning",
            "Do not over-irrigate a dense canopy — humidity above 90% drives sporulation",
        ],
        "fertilization": [
            "Sufficient nitrogen to hold green leaf area through grain fill",
            "Potassium reduces stalk cannibalisation and lodging risk after defoliation",
        ],
        "pruning": [
            "Not applicable to field maize",
        ],
        "prevention": [
            "Resistant hybrids plus rotation plus residue management — all three together",
            "Avoid continuous maize under no-till in humid areas",
            "Lower plant population in high-risk fields to improve airflow",
        ],
        "monitoring": [
            "Scout from V10, tracking lesion progress relative to the ear leaf",
            "Threshold: treat at VT-R1 if lesions are within 3 leaves below the ear leaf",
        ],
        "recovery_time": "One well-timed application protects 21-28 days; leaf tissue lost does not recover",
        "warnings": [
            "Timing beats product choice — VT-R1 is the decisive window",
            "Strobilurin resistance is confirmed in C. zeae-maydis; always use a mixture",
        ],
        "references": [REF["cabi"], REF["frac"], REF["fao"]],
    },
    "Corn_maize_streak_virus_disease": {
        "disease_name": "Maize Streak Virus Disease",
        "pathogen": "Maize streak virus (MSV), transmitted by Cicadulina leafhoppers",
        "type": "Viral",
        "description": (
            "A viral disease with no curative treatment. The virus is transmitted persistently "
            "by Cicadulina leafhoppers migrating from wild grasses. Management is entirely "
            "preventive: resistant varieties, vector control and avoiding late plantings next "
            "to grass reservoirs. Plants infected before V6 usually produce nothing."
        ),
        "symptoms": [
            "Fine chlorotic streaks running parallel to the veins, broadening with age",
            "Broken yellow lines giving a striped appearance on young leaves",
            "Severe stunting and poor or absent ear formation",
            "Symptoms most intense on the newest leaves",
        ],
        "chemical": [
            "No chemical cures the virus — target the leafhopper vector only",
            "Imidacloprid seed treatment protects the critical first 3-4 weeks",
            "Foliar pyrethroid at first leafhopper flight if population thresholds are exceeded",
        ],
        "biological": [
            "Conserve natural enemies of leafhoppers (spiders, egg parasitoids)",
            "Beauveria bassiana applications for partial vector suppression",
        ],
        "organic": [
            "Neem oil to reduce leafhopper feeding and settling",
            "Remove grass weeds around the field — the virus reservoir",
            "Rogue and destroy infected plants early to limit further acquisition",
        ],
        "irrigation": [
            "Maintain even moisture — drought stress worsens symptom expression",
            "No irrigation change controls the virus itself",
        ],
        "fertilization": [
            "Adequate nitrogen helps mildly infected plants compensate",
            "Do not over-fertilise: lush young growth attracts more leafhoppers",
        ],
        "pruning": [
            "Not applicable — remove whole infected plants instead",
        ],
        "prevention": [
            "MSV-resistant varieties are the only reliable protection (widely available)",
            "Plant early and uniformly to escape peak leafhopper flights",
            "Clear grass weeds and volunteer maize before planting",
        ],
        "monitoring": [
            "Yellow sticky traps at field margins to detect leafhopper flights",
            "Weekly scouting from emergence to V8 — the critical infection window",
        ],
        "recovery_time": "No recovery. Plants infected before V6 are a total loss; later infection reduces yield only partly",
        "warnings": [
            "Do not spend on fungicides — this is viral and they have zero effect",
            "Roguing after V8 gives little benefit; the priority is protecting the next planting",
        ],
        "references": [REF["cabi"], REF["eppo"], REF["fao"]],
    },
    "Corn_northern_leaf_blight": {
        "disease_name": "Northern Corn Leaf Blight",
        "pathogen": "Exserohilum turcicum",
        "type": "Fungal",
        "description": (
            "Produces large cigar-shaped lesions and thrives in moderate temperatures "
            "(18-27 °C) with extended leaf wetness. It survives in residue, so continuous "
            "maize with reduced tillage sustains it. Yield loss is greatest when lesions "
            "reach the ear leaf before silking."
        ),
        "symptoms": [
            "Long elliptical 'cigar-shaped' grey-green to tan lesions, 3-15 cm",
            "Lesions not limited by veins (unlike gray leaf spot)",
            "Dark olive sporulation in the lesion centre during humid weather",
            "Blighting from lower leaves upward, causing early senescence",
        ],
        "chemical": [
            "Propiconazole or prothioconazole at VT-R1",
            "Azoxystrobin + tebuconazole mixture where pressure is high",
            "A second application 14-21 days later only under sustained wet weather",
        ],
        "biological": [
            "Trichoderma-based residue decomposers applied after harvest",
        ],
        "organic": [
            "Resistant hybrids (Ht genes and partial resistance) are the main tool",
            "Deep tillage to bury infected residue",
        ],
        "irrigation": [
            "Avoid evening irrigation; 6-18 hours of leaf wetness is required for infection",
            "Manage canopy density so leaves dry rapidly",
        ],
        "fertilization": [
            "Balanced nutrition maintains green leaf area during grain fill",
            "Potassium reduces lodging risk in blighted stands",
        ],
        "pruning": [
            "Not applicable to field maize",
        ],
        "prevention": [
            "Hybrid resistance plus rotation plus residue burial",
            "Avoid continuous maize in fields with a blight history",
        ],
        "monitoring": [
            "Scout from V8 weekly; note the highest leaf carrying lesions",
            "Threshold: lesions on or just below the ear leaf before silking",
        ],
        "recovery_time": "Protection lasts 21 days per application; damaged leaf tissue is not recovered",
        "warnings": [
            "Applications after R3 (milk stage) are rarely economic",
            "Confirm identification — NCLB, GLS and southern rust need different thresholds",
        ],
        "references": [REF["cabi"], REF["frac"], REF["eppo"]],
    },
    # ------------------------------------------------------------- CUCUMBER
    "Cucumber_anthracnose": {
        "disease_name": "Cucumber Anthracnose",
        "pathogen": "Colletotrichum orbiculare",
        "type": "Fungal",
        "description": (
            "Seed- and residue-borne fungus spread by splashing water. It attacks leaves, "
            "stems and fruit, and the sunken fruit lesions make produce unmarketable and "
            "cause rapid post-harvest rot. Warm wet conditions (22-27 °C) drive explosive "
            "spread."
        ),
        "symptoms": [
            "Water-soaked spots enlarging to circular tan-brown lesions with dark margins",
            "Lesion centres dropping out, giving a shot-hole appearance",
            "Sunken dark circular lesions on fruit, often with pink spore masses",
            "Elongated lesions on stems and petioles",
        ],
        "chemical": [
            "Chlorothalonil 720 SC preventively every 7-10 days in wet weather",
            "Azoxystrobin (FRAC 11) at first symptom, alternating with a different group",
            "Difenoconazole as a rotation partner",
        ],
        "biological": [
            "Bacillus subtilis or B. amyloliquefaciens sprays every 5-7 days",
            "Trichoderma soil treatment to reduce residue-borne inoculum",
        ],
        "organic": [
            "Copper-based fungicides on a 7-day preventive schedule",
            "Hot-water seed treatment (50 °C for 20 min) to eliminate seed-borne infection",
            "Remove and destroy infected fruit and vines immediately",
        ],
        "irrigation": [
            "Drip irrigation only — splash dispersal is the main spread mechanism",
            "Irrigate in the morning; mulch to prevent soil splash onto leaves",
            "Avoid waterlogging, which weakens plants and favours infection",
        ],
        "fertilization": [
            "Balanced NPK with adequate calcium for firmer fruit tissue",
            "Avoid nitrogen excess that creates a dense humid canopy",
        ],
        "pruning": [
            "Remove infected leaves and fruit in dry conditions, disinfecting tools between plants",
            "Train vines vertically to improve airflow and keep fruit off the soil",
        ],
        "prevention": [
            "Certified disease-free seed and 2-3 year rotation away from cucurbits",
            "Plastic mulch to break the soil-splash pathway",
            "Never handle plants when the foliage is wet",
        ],
        "monitoring": [
            "Inspect fruit and lower leaves every 2-3 days during warm wet spells",
            "Check post-harvest fruit for latent infections appearing in storage",
        ],
        "recovery_time": "New infection stops within 7-14 days; affected fruit never recovers",
        "warnings": [
            "Infected fruit rots rapidly after harvest — do not pack it",
            "Observe pre-harvest intervals carefully; cucumber is harvested continuously",
        ],
        "references": [REF["cabi"], REF["eppo"], REF["dgpa"]],
    },
    "Cucumber_downy_mildew": {
        "disease_name": "Cucumber Downy Mildew",
        "pathogen": "Pseudoperonospora cubensis",
        "type": "Oomycete",
        "description": (
            "An oomycete — not a true fungus, which is why standard fungicides fail against "
            "it. Spores travel long distances on wind and infect within hours of leaf wetness. "
            "An unprotected crop can be defoliated in 7-10 days. Requires oomycete-specific "
            "chemistry and strict resistance management."
        ),
        "symptoms": [
            "Angular yellow patches on the upper leaf surface, bounded by veins",
            "Grey-purple downy sporulation on the corresponding underside",
            "Rapid browning and upward curling of leaves",
            "Fruit remains unmarked but stays small and poorly flavoured from defoliation",
        ],
        "chemical": [
            "Oomycete-specific: cymoxanil, propamocarb, mandipropamid or fluopicolide",
            "Metalaxyl-M only where resistance has not been recorded locally",
            "Mancozeb or chlorothalonil as protectant partners in mixture",
        ],
        "biological": [
            "Bacillus subtilis provides only partial suppression — preventive use only",
            "Seaweed and phosphite products to stimulate host defences",
        ],
        "organic": [
            "Copper products on a strict 5-7 day preventive schedule",
            "Potassium phosphite for systemic defence activation",
            "Remove infected leaves early to slow the epidemic",
        ],
        "irrigation": [
            "Drip only. Any leaf wetness of 2+ hours permits infection",
            "Irrigate at dawn; vent greenhouses aggressively to break humidity",
        ],
        "fertilization": [
            "Maintain potassium and calcium for tissue strength",
            "Avoid nitrogen excess creating dense unventilated canopies",
        ],
        "pruning": [
            "Remove lower and infected leaves to open the canopy",
            "Train vertically with wide spacing",
        ],
        "prevention": [
            "Track regional forecast networks — this pathogen arrives on wind fronts",
            "Start preventive sprays before the disease reaches your area, not after",
            "Grow resistant varieties and avoid overlapping cucurbit plantings",
        ],
        "monitoring": [
            "Daily inspection of leaf undersides during warm humid weather",
            "One confirmed lesion means immediate full-field treatment",
        ],
        "recovery_time": "7-14 days to arrest with correct chemistry; heavily defoliated plants may not recover economically",
        "warnings": [
            "Standard fungicides (mancozeb alone, sulphur, triazoles) do NOT control oomycetes",
            "Resistance to metalaxyl and strobilurins is widespread — always alternate and mix",
            "This is the fastest-moving disease on the list. Delay of 3-4 days can cost the crop",
        ],
        "references": [REF["eppo"], REF["frac"], REF["cabi"]],
    },
    "Cucumber_gummy_stem_blight": {
        "disease_name": "Cucumber Gummy Stem Blight",
        "pathogen": "Stagonosporopsis cucurbitacearum (Didymella bryoniae)",
        "type": "Fungal",
        "description": (
            "Attacks stems, leaves and fruit; the stem-canker phase (black rot) can kill whole "
            "plants by girdling the crown. Seed-borne and residue-borne, it is a persistent "
            "problem in protected cucumber where humidity stays high and pruning wounds are "
            "frequent."
        ),
        "symptoms": [
            "Water-soaked stem cankers exuding an amber gummy ooze",
            "Tan to grey circular leaf lesions, often beginning at the leaf margin",
            "Black pycnidia (tiny dots) visible in older lesions",
            "Crown girdling causing sudden wilting of an otherwise healthy plant",
        ],
        "chemical": [
            "Azoxystrobin or pyraclostrobin (FRAC 11) — rotate strictly, resistance is common",
            "Tebuconazole or difenoconazole (FRAC 3) as alternation partners",
            "Chlorothalonil as a protectant base in the programme",
        ],
        "biological": [
            "Trichoderma harzianum applied to soil and to pruning wounds",
            "Bacillus amyloliquefaciens foliar programme in low-pressure periods",
        ],
        "organic": [
            "Hot-water seed treatment to eliminate seed-borne inoculum",
            "Copper sprays with careful stem coverage",
            "Remove and destroy infected plants including the root ball",
        ],
        "irrigation": [
            "Drip only; keep the crown zone as dry as possible",
            "Avoid irrigating immediately after pruning — open wounds are entry points",
            "Reduce night humidity in greenhouses through heating and venting",
        ],
        "fertilization": [
            "Balanced feeding with adequate calcium for tissue integrity",
            "Avoid excessive nitrogen which produces soft, easily colonised stems",
        ],
        "pruning": [
            "Prune only in dry conditions, mid-morning, so wounds seal fast",
            "Disinfect blades between plants; leave a short stub rather than a flush cut",
            "Treat wounds with a Trichoderma paste in high-pressure situations",
        ],
        "prevention": [
            "Treated seed, 2-3 year cucurbit rotation, full residue removal",
            "Greenhouse humidity management is the single most effective control",
            "Disinfect structures and stakes between cycles",
        ],
        "monitoring": [
            "Inspect stems and leaf axils twice weekly, focusing on pruning wounds",
            "Investigate any sudden single-plant wilt immediately",
        ],
        "recovery_time": "Leaf phase 14 days; stem cankers rarely heal — girdled plants must be removed",
        "warnings": [
            "Strobilurin resistance is widespread in this pathogen — never use them alone",
            "A girdled plant will not recover; remove it to protect its neighbours",
        ],
        "references": [REF["eppo"], REF["frac"], REF["cabi"]],
    },
    "Cucumber_powdery_mildew": {
        "disease_name": "Cucumber Powdery Mildew",
        "pathogen": "Podosphaera xanthii",
        "type": "Fungal",
        "description": (
            "Unusual among foliar diseases: it does NOT need free water and thrives in warm, "
            "dry conditions with high ambient humidity. Very responsive to treatment when "
            "caught early, but resistance to single-site fungicides develops fast because of "
            "its short generation time."
        ),
        "symptoms": [
            "White powdery patches, first on the upper surface of older leaves",
            "Patches coalescing until the whole leaf appears dusted with flour",
            "Leaves yellowing, browning and becoming brittle",
            "Fruit sunburn and poor sizing following canopy loss",
        ],
        "chemical": [
            "Myclobutanil or difenoconazole (FRAC 3) at first symptom",
            "Azoxystrobin (FRAC 11) alternating with a different group",
            "Quinoxyfen or metrafenone in intensive protected production",
        ],
        "biological": [
            "Ampelomyces quisqualis — a specific mycoparasite of powdery mildews",
            "Bacillus subtilis QST 713 on a 7-day preventive schedule",
        ],
        "organic": [
            "Wettable sulphur every 7-10 days (avoid above 30 °C — phytotoxicity risk)",
            "Potassium bicarbonate 0.5% with a wetting agent — good curative knockdown",
            "Milk solution (1:9 with water) has measurable preventive effect at garden scale",
        ],
        "irrigation": [
            "Unlike other diseases, overhead water can suppress spores — but raises other risks",
            "Maintain even soil moisture: drought stress increases susceptibility",
        ],
        "fertilization": [
            "Avoid nitrogen excess — soft young growth is the preferred infection site",
            "Silicon applications measurably reduce infection in cucurbits",
            "Maintain potassium for cell-wall strength",
        ],
        "pruning": [
            "Remove the worst-affected older leaves to reduce inoculum",
            "Open the canopy — dense shaded foliage is where it starts",
        ],
        "prevention": [
            "Resistant varieties are widely available and highly effective",
            "Begin preventive sprays before symptoms during warm dry spells",
            "Space plants for light penetration and airflow",
        ],
        "monitoring": [
            "Check the underside and upper surface of older shaded leaves twice weekly",
            "Treat at the first single colony — it doubles very quickly",
        ],
        "recovery_time": "5-10 days for visible suppression; new growth emerges clean within 2 weeks",
        "warnings": [
            "Do not apply sulphur within 2 weeks of an oil spray, or above 30 °C",
            "Resistance builds fast: never use the same FRAC group more than twice consecutively",
        ],
        "references": [REF["cabi"], REF["frac"], REF["fao"]],
    },
    # ---------------------------------------------------------------- GRAPE
    "Grape_black_measles": {
        "disease_name": "Grape Black Measles (Esca)",
        "pathogen": "Phaeomoniella chlamydospora / Phaeoacremonium spp. complex",
        "type": "Fungal (trunk disease)",
        "description": (
            "A chronic wood disease, not a foliar one. A complex of fungi colonises the trunk "
            "through pruning wounds and slowly degrades the vascular system over years. There "
            "is no curative spray; management is preventive wound protection, and eventually "
            "trunk renewal or vine replacement."
        ),
        "symptoms": [
            "Tiger-stripe interveinal chlorosis and necrosis on leaves",
            "Small dark spots ('measles') on berries, sometimes cracking",
            "Sudden apoplexy: an entire arm or vine collapsing in hot weather",
            "Dark streaking and soft white wood rot visible in a trunk cross-section",
        ],
        "chemical": [
            "No curative product exists. Protect pruning wounds with thiophanate-methyl paste",
            "Wound sealants applied within 24 hours of pruning",
        ],
        "biological": [
            "Trichoderma atroviride wound treatment — the best-supported preventive measure",
            "Trichoderma applied to nursery material before planting",
        ],
        "organic": [
            "Delay pruning until late winter when wounds heal faster",
            "Prune in dry weather; avoid rain within 48 hours of pruning",
            "Remove and burn dead wood and severely affected vines",
        ],
        "irrigation": [
            "Avoid water stress, which triggers the sudden apoplectic collapse",
            "Steady deficit irrigation is better than alternating drought and flooding",
        ],
        "fertilization": [
            "Maintain vine vigour with balanced nutrition — weak vines decline faster",
            "Avoid heavy nitrogen which produces soft, poorly lignified wood",
        ],
        "pruning": [
            "This is the central control point. Prune late, in dry weather, small cuts only",
            "Disinfect tools between vines with 70% alcohol or bleach solution",
            "Apply protectant paste or Trichoderma to every large cut immediately",
            "Consider trunk renewal (re-training from a healthy sucker) on affected vines",
        ],
        "prevention": [
            "Wound protection at pruning is the only proven intervention",
            "Source certified clean planting material — nursery infection is common",
            "Train young vines to minimise the number of large future cuts",
        ],
        "monitoring": [
            "Map and tag symptomatic vines each season — symptoms are intermittent year to year",
            "Inspect trunk cross-sections when removing vines to confirm diagnosis",
        ],
        "recovery_time": "No recovery. Vines decline over 3-10 years; trunk renewal may extend productive life",
        "warnings": [
            "Foliar fungicides have zero effect — do not waste money on them",
            "Symptoms come and go between years; absence of symptoms does not mean the vine is clean",
            "Wet pruning wounds are the main infection route — never prune before rain",
        ],
        "references": [REF["eppo"], REF["cabi"], REF["fao"]],
    },
    "Grape_black_rot": {
        "disease_name": "Grape Black Rot",
        "pathogen": "Guignardia bidwellii",
        "type": "Fungal",
        "description": (
            "Overwinters in mummified berries and infects during warm rain. The critical "
            "window runs from immediately before bloom to 3-4 weeks after fruit set — berries "
            "become resistant once they start softening. Total crop loss is possible in wet "
            "years without protection."
        ),
        "symptoms": [
            "Circular tan leaf spots with a dark border and black pycnidia in the centre",
            "Elongated black lesions on shoots and tendrils",
            "Berries developing a light brown spot, then shrivelling into hard black mummies",
            "Mummified berries staying attached to the cluster",
        ],
        "chemical": [
            "Myclobutanil or tebuconazole (FRAC 3) from pre-bloom to 4 weeks post-set",
            "Mancozeb protectant in the early pre-bloom sprays",
            "Pyraclostrobin (FRAC 11) as a rotation partner",
        ],
        "biological": [
            "Bacillus subtilis in low-pressure years or near harvest for residue reasons",
        ],
        "organic": [
            "Remove ALL mummies from vines and ground during dormant pruning — highest impact action",
            "Copper and sulphur programme through the critical window",
            "Cultivate under the trellis to bury fallen mummies",
        ],
        "irrigation": [
            "Drip only — infection requires 6+ hours of wetness at 20-27 °C",
            "Irrigate at dawn; avoid any canopy wetting from bloom to fruit set",
        ],
        "fertilization": [
            "Balanced nutrition; avoid nitrogen excess that shades and humidifies the fruit zone",
            "Potassium supports berry quality and ripening",
        ],
        "pruning": [
            "Remove mummies, infected canes and tendrils during winter pruning",
            "Leaf-pull in the fruit zone after set to expose clusters to sun and air",
            "Maintain an open canopy through summer shoot positioning",
        ],
        "prevention": [
            "Sanitation of mummies is worth more than any single spray",
            "Protect strictly through the pre-bloom to post-set window",
            "Trellis and canopy management for rapid drying",
        ],
        "monitoring": [
            "Scout leaves 10-14 days after each warm rain from bud break",
            "Inspect clusters closely from bloom through the 4 weeks after set",
        ],
        "recovery_time": "New infection stops in 10-14 days; infected berries are lost permanently",
        "warnings": [
            "Sprays after berries begin softening are largely wasted — the fruit is already resistant",
            "One mummy left in the canopy can re-infect the whole vine next spring",
        ],
        "references": [REF["eppo"], REF["frac"], REF["cabi"]],
    },
    "Grape_leaf_blight": {
        "disease_name": "Grape Leaf Blight (Isariopsis Leaf Spot)",
        "pathogen": "Pseudocercospora vitis",
        "type": "Fungal",
        "description": (
            "A late-season foliar disease favoured by warm humid conditions. It rarely infects "
            "fruit directly, but the defoliation it causes reduces sugar accumulation and, "
            "more importantly, leaves vines with insufficient carbohydrate reserves for winter "
            "hardiness and the following season's growth."
        ),
        "symptoms": [
            "Irregular dark brown to black angular leaf spots",
            "Spots merging into large blighted areas, often along the margin",
            "Olive-grey sporulation on the leaf underside in humid weather",
            "Heavy late-season defoliation starting in the lower canopy",
        ],
        "chemical": [
            "Mancozeb protectant in mid-season where pressure is known",
            "Difenoconazole or tebuconazole (FRAC 3) at first symptom",
            "Azoxystrobin (FRAC 11) as a rotation partner",
        ],
        "biological": [
            "Bacillus subtilis preventive programme in low-pressure sites",
        ],
        "organic": [
            "Copper sprays from mid-season in humid regions",
            "Remove and destroy fallen leaves — the overwintering site",
        ],
        "irrigation": [
            "Drip irrigation; avoid wetting the canopy from mid-season onward",
            "Reduce irrigation as ripening approaches to limit canopy humidity",
        ],
        "fertilization": [
            "Adequate potassium in late season to support ripening despite leaf loss",
            "Avoid late nitrogen — it delays hardening and prolongs susceptibility",
        ],
        "pruning": [
            "Summer shoot thinning and leaf removal in the interior for airflow",
            "Winter removal of fallen leaf debris under the trellis",
        ],
        "prevention": [
            "Canopy management for rapid drying is the main cultural control",
            "Leaf-litter sanitation in autumn reduces next year's inoculum",
        ],
        "monitoring": [
            "Scout the interior lower canopy weekly from mid-season",
            "Increase frequency after warm humid spells",
        ],
        "recovery_time": "New infection stops in 2-3 weeks; lost leaves are not replaced this season",
        "warnings": [
            "Late-season defoliation compromises winter hardiness and next year's crop",
            "Respect pre-harvest intervals — this disease peaks close to harvest",
        ],
        "references": [REF["cabi"], REF["eppo"], REF["frac"]],
    },
    # ------------------------------------------------------------ GROUNDNUT
    "Groundnut_early_leaf_spot": {
        "disease_name": "Groundnut Early Leaf Spot",
        "pathogen": "Passalora arachidicola (Cercospora arachidicola)",
        "type": "Fungal",
        "description": (
            "Appears roughly 30-45 days after sowing, earlier than late leaf spot, and is "
            "distinguished by a yellow halo around each lesion. Combined leaf spot complexes "
            "cause 15-50% pod yield loss through defoliation, which also weakens pegs and "
            "increases pod losses at lifting."
        ),
        "symptoms": [
            "Sub-circular brown spots on the upper leaf surface with a distinct yellow halo",
            "Sporulation mainly on the upper leaf surface (unlike late leaf spot)",
            "Lesions also on petioles and stems",
            "Progressive defoliation from lower leaves upward",
        ],
        "chemical": [
            "Chlorothalonil 720 SC every 14 days from first symptom",
            "Tebuconazole or propiconazole (FRAC 3) alternating with the protectant",
            "Azoxystrobin (FRAC 11) as a third rotation partner",
        ],
        "biological": [
            "Trichoderma or Bacillus applied to residue after harvest",
            "Bacillus subtilis foliar programme in low-pressure situations",
        ],
        "organic": [
            "Copper oxychloride on a 10-14 day schedule",
            "Deep ploughing to bury infected residue",
            "Rotate away from groundnut for 2-3 years",
        ],
        "irrigation": [
            "Avoid sprinkler irrigation — leaf wetness of 10+ hours drives infection",
            "Irrigate in the morning; avoid waterlogging",
        ],
        "fertilization": [
            "Calcium (gypsum) at pegging is critical for pod fill and tissue resilience",
            "Balanced potassium; avoid nitrogen excess (groundnut fixes its own nitrogen)",
        ],
        "pruning": [
            "Not applicable — manage plant density instead to improve airflow",
        ],
        "prevention": [
            "Resistant/tolerant varieties combined with rotation",
            "Remove volunteer groundnut plants which bridge seasons",
            "Optimal plant spacing to avoid a closed humid canopy",
        ],
        "monitoring": [
            "Begin scouting 30 days after sowing, twice weekly",
            "Threshold: treat at roughly 5-10% lower-leaf infection",
        ],
        "recovery_time": "10-14 days to stop new lesions; defoliated leaves are not regrown",
        "warnings": [
            "Defoliation before pod fill causes the greatest yield loss — protect early",
            "Distinguish from late leaf spot (no halo, sporulation underneath) — programmes differ slightly",
        ],
        "references": [REF["cabi"], REF["fao"], REF["frac"]],
    },
    "Groundnut_late_leaf_spot": {
        "disease_name": "Groundnut Late Leaf Spot",
        "pathogen": "Nothopassalora personata (Cercosporidium personatum)",
        "type": "Fungal",
        "description": (
            "Appears later than early leaf spot, typically 50-70 days after sowing, and is "
            "generally the more damaging of the two. Lesions are darker, lack a yellow halo, "
            "and sporulate on the leaf underside. Severe defoliation just before harvest "
            "causes both yield and pod-quality losses."
        ),
        "symptoms": [
            "Dark brown to black circular spots, usually with no yellow halo",
            "Sporulation on the underside of the leaf, giving a rough dark texture",
            "Lesions on petioles, stems and pegs",
            "Rapid, near-complete defoliation late in the season",
        ],
        "chemical": [
            "Chlorothalonil protectant every 14 days from 50 days after sowing",
            "Tebuconazole, propiconazole or hexaconazole (FRAC 3)",
            "Azoxystrobin + difenoconazole mixture in high-pressure situations",
        ],
        "biological": [
            "Bacillus subtilis preventive sprays; residue treatment with Trichoderma",
        ],
        "organic": [
            "Copper oxychloride programme from mid-season",
            "Rotation and deep residue burial",
            "Intercropping with pearl millet reduces spore dispersal in some systems",
        ],
        "irrigation": [
            "Avoid overhead irrigation; long dew periods are the main driver",
            "Maintain even soil moisture through pod fill without waterlogging",
        ],
        "fertilization": [
            "Gypsum at pegging for calcium supply — critical for pod quality",
            "Adequate potassium and sulphur; avoid excess nitrogen",
        ],
        "pruning": [
            "Not applicable — manage density and spacing instead",
        ],
        "prevention": [
            "Tolerant varieties (ICGV series and similar) plus 2-3 year rotation",
            "Post-harvest residue burial; destroy volunteers",
            "Time sowing so pod fill avoids peak humid periods where possible",
        ],
        "monitoring": [
            "Scout from 45 days after sowing, focusing on the leaf underside",
            "Treat at 5-10% leaf area affected on lower leaves",
        ],
        "recovery_time": "14-21 days to arrest; complete defoliation near harvest cannot be reversed",
        "warnings": [
            "Often occurs together with rust — a combined programme is usually needed",
            "Late defoliation causes pods to detach during lifting, adding harvest losses",
        ],
        "references": [REF["cabi"], REF["fao"], REF["eppo"]],
    },
    "Groundnut_nutrition_deficiency": {
        "disease_name": "Groundnut Nutritional Deficiency",
        "pathogen": "Abiotic — nutrient imbalance (commonly Fe, Ca, N, or Mn)",
        "type": "Abiotic",
        "description": (
            "Not an infectious disease. Symptoms come from nutrient shortage or, very often in "
            "calcareous Tunisian soils, from nutrients present but unavailable because of high "
            "pH. Iron chlorosis (interveinal yellowing on young leaves) is the classic case. "
            "Fungicides have no effect and applying them wastes money."
        ),
        "symptoms": [
            "Iron: interveinal yellowing of the YOUNGEST leaves, veins staying green",
            "Nitrogen: uniform pale-green yellowing of the OLDEST leaves first",
            "Calcium: poorly filled 'pops' (empty pods), dark plumule in the seed",
            "Manganese: interveinal chlorosis with small necrotic flecks",
            "Symptoms typically appear in patches following soil variation, not spreading like a disease",
        ],
        "chemical": [
            "No fungicide is appropriate. Correct the nutrient instead",
            "Iron: foliar chelated iron (Fe-EDDHA for calcareous soils) at 0.5-1%, repeat weekly",
            "Nitrogen: verify effective rhizobium nodulation before adding fertiliser N",
        ],
        "biological": [
            "Rhizobium inoculation at sowing to secure biological nitrogen fixation",
            "Mycorrhizal inoculants improve phosphorus and micronutrient uptake",
        ],
        "organic": [
            "Well-decomposed compost to raise organic matter and micronutrient availability",
            "Elemental sulphur or acidifying amendments to lower pH in calcareous soils",
            "Green manure in rotation to improve soil structure and nutrient cycling",
        ],
        "irrigation": [
            "Avoid waterlogging — it blocks root uptake and mimics deficiency symptoms",
            "Keep moisture even: nutrient uptake stops in dry soil regardless of soil fertility",
            "Check irrigation-water bicarbonate levels, a common cause of induced iron chlorosis",
        ],
        "fertilization": [
            "Start with a soil test and a leaf analysis — guessing is expensive",
            "Gypsum (400-600 kg/ha) at pegging is standard practice for calcium supply",
            "Apply micronutrients as foliar chelates for fast correction, soil amendments for the long term",
            "Do not add nitrogen fertiliser without checking nodulation first",
        ],
        "pruning": [
            "Not applicable",
        ],
        "prevention": [
            "Soil analysis before each season, including pH and active limestone",
            "Rhizobium inoculation at sowing on new or long-rotated ground",
            "Choose chlorosis-tolerant varieties for high-pH soils",
        ],
        "monitoring": [
            "Leaf tissue analysis at pegging to catch deficiency before yield is affected",
            "Map the affected patches — a soil pattern confirms an abiotic cause",
        ],
        "recovery_time": "Foliar correction shows response in 7-14 days; soil corrections take a full season",
        "warnings": [
            "Do NOT apply fungicides — this is not an infectious disease",
            "Confirm with a soil or leaf test before spending on inputs; symptoms overlap between nutrients",
            "In calcareous soils, adding more iron sulphate rarely works — use chelated Fe-EDDHA",
        ],
        "references": [REF["fao"], REF["cabi"]],
    },
    "Groundnut_rust": {
        "disease_name": "Groundnut Rust",
        "pathogen": "Puccinia arachidis",
        "type": "Fungal",
        "description": (
            "Produces orange pustules on the leaf underside that rupture to release spores. "
            "It frequently occurs together with late leaf spot, and the combination can cause "
            "over 50% yield loss. Unlike many rusts it has no alternate host, surviving on "
            "volunteers and crop residue."
        ),
        "symptoms": [
            "Orange-brown powdery pustules, predominantly on the leaf underside",
            "Pustules rupturing to release a rusty spore powder",
            "Leaves turning yellow then necrotic but often remaining attached",
            "Pustules on petioles and stems in severe infections",
        ],
        "chemical": [
            "Tebuconazole or hexaconazole (FRAC 3) at first pustule",
            "Chlorothalonil as a protectant partner",
            "Azoxystrobin (FRAC 11) in rotation; repeat at 14-day intervals",
        ],
        "biological": [
            "Limited efficacy against rust; Bacillus products used preventively only",
        ],
        "organic": [
            "Wettable sulphur every 10 days from first symptom",
            "Destroy volunteer groundnut plants and residue after harvest",
        ],
        "irrigation": [
            "Avoid overhead irrigation; morning irrigation to shorten wetness",
            "Even soil moisture through pod fill",
        ],
        "fertilization": [
            "Potassium and calcium for tissue strength and pod fill",
            "Avoid nitrogen excess creating a dense humid canopy",
        ],
        "pruning": [
            "Not applicable — manage density and spacing",
        ],
        "prevention": [
            "Resistant varieties plus rotation plus residue destruction",
            "Avoid staggered plantings that let inoculum bridge between fields",
        ],
        "monitoring": [
            "Inspect leaf undersides twice weekly from 40 days after sowing",
            "Treat at first confirmed pustules — rust accelerates rapidly",
        ],
        "recovery_time": "10-14 days to arrest new infection with correct chemistry",
        "warnings": [
            "Usually mixed with late leaf spot — choose products covering both",
            "Rust cycles fast; a single application is rarely enough in a wet season",
        ],
        "references": [REF["cabi"], REF["fao"], REF["frac"]],
    },
    # --------------------------------------------------------------- POTATO
    "Potato_early_blight": {
        "disease_name": "Potato Early Blight",
        "pathogen": "Alternaria solani",
        "type": "Fungal",
        "description": (
            "A stress-associated disease: it attacks older leaves first and hits hardest where "
            "plants are nitrogen-deficient, drought-stressed or near maturity. Distinguished "
            "from late blight by its concentric 'target-board' rings and its preference for "
            "warm weather with alternating wet and dry periods."
        ),
        "symptoms": [
            "Dark brown lesions with concentric rings, like a target board",
            "Lesions on the OLDEST leaves first, moving upward",
            "Yellow halo surrounding the lesions",
            "Dark sunken lesions on tubers with a raised, well-defined margin",
        ],
        "chemical": [
            "Chlorothalonil or mancozeb protectant every 7-10 days",
            "Azoxystrobin (FRAC 11) or boscalid (FRAC 7) where pressure is high",
            "Difenoconazole in rotation — alternate groups every application",
        ],
        "biological": [
            "Bacillus subtilis or Trichoderma preventive foliar programme",
            "Residue-degrading inoculants applied after harvest",
        ],
        "organic": [
            "Copper fungicides every 7-10 days",
            "Remove and destroy infected lower leaves early",
            "3-year rotation away from solanaceous crops",
        ],
        "irrigation": [
            "Avoid drought stress — this disease exploits stressed plants",
            "Drip irrigation, applied in the morning",
            "Avoid alternating drought and heavy watering, the pattern this fungus favours",
        ],
        "fertilization": [
            "ADEQUATE NITROGEN is a genuine control measure here — deficient plants are far more susceptible",
            "Balanced potassium for tuber quality and skin set",
            "Split nitrogen applications to maintain canopy vigour through bulking",
        ],
        "pruning": [
            "Remove infected lower leaves in dry conditions to reduce inoculum",
        ],
        "prevention": [
            "Maintain plant vigour — nutrition and water management are the first line",
            "Rotation, certified seed tubers, residue destruction",
            "Hill well to prevent spores reaching tubers",
        ],
        "monitoring": [
            "Scout lower leaves weekly from tuber initiation",
            "Increase to every 3 days during warm humid spells",
        ],
        "recovery_time": "7-14 days to arrest; damaged foliage does not recover",
        "warnings": [
            "Do not confuse with late blight — late blight is far more urgent and needs different chemistry",
            "Harvest only after skins are fully set to avoid tuber infection in storage",
        ],
        "references": [REF["cabi"], REF["eppo"], REF["frac"]],
    },
    "Potato_late_blight": {
        "disease_name": "Potato Late Blight",
        "pathogen": "Phytophthora infestans",
        "type": "Oomycete",
        "description": (
            "The most destructive potato disease in the world — the cause of the Irish famine. "
            "An oomycete, so ordinary fungicides do not work. Under cool wet conditions "
            "(15-20 °C, humidity above 90%) it can destroy a field in under a week and infect "
            "tubers in the ground and in storage. This is an emergency-response disease."
        ),
        "symptoms": [
            "Water-soaked dark green to black patches, often starting at leaf tips and margins",
            "White fuzzy sporulation ring on the leaf underside in humid mornings",
            "Rapidly expanding lesions merging into whole-plant collapse",
            "A distinctive foul odour from rotting tissue in heavy infections",
            "Reddish-brown granular rot extending into the tuber flesh",
        ],
        "chemical": [
            "IMMEDIATE oomycete-specific action: cymoxanil, mandipropamid, fluopicolide or propamocarb",
            "Systemic + protectant mixture (e.g. cymoxanil + mancozeb) on a 5-7 day interval",
            "Reduce the interval to 5 days during sustained wet weather",
        ],
        "biological": [
            "Bacillus subtilis is inadequate against an active epidemic — preventive use only",
            "Phosphite products help systemic defence but are not a stand-alone solution",
        ],
        "organic": [
            "Copper on a strict 5-7 day preventive schedule — organic systems must be pre-emptive",
            "Destroy haulm 2-3 weeks before harvest to protect tubers",
            "Destroy cull piles and volunteer potatoes — the main overwintering source",
        ],
        "irrigation": [
            "STOP overhead irrigation immediately if late blight is confirmed",
            "Drip only; reduce total volume until the epidemic is under control",
            "Ensure good drainage — standing water spreads spores to tubers",
        ],
        "fertilization": [
            "Avoid excess nitrogen: dense canopies stay wet and prolong the epidemic",
            "Potassium improves tuber skin resistance to infection",
            "Stop nitrogen once infection is confirmed",
        ],
        "pruning": [
            "Haulm destruction (mechanical or chemical) is the key intervention to protect tubers",
        ],
        "prevention": [
            "Certified seed tubers, resistant varieties, and destruction of cull piles",
            "Follow regional blight-warning services and spray BEFORE the risk period",
            "Hill deeply so soil covers tubers and blocks spore penetration",
        ],
        "monitoring": [
            "DAILY inspection during cool wet weather — this disease moves in hours",
            "Check the base of the canopy where humidity is highest",
            "Inspect harvested tubers before storing; one infected tuber can rot a store",
        ],
        "recovery_time": "5-10 days to control if caught early. Advanced infections often mean total crop loss",
        "warnings": [
            "EMERGENCY: a delay of 2-3 days can cost the entire crop",
            "Ordinary fungicides (sulphur, triazoles, mancozeb alone) will NOT stop it",
            "Never store tubers from an infected field without careful sorting and curing",
            "Notify neighbouring growers — spores travel kilometres on wind",
        ],
        "references": [REF["eppo"], REF["frac"], REF["fao"], REF["cabi"]],
    },
    # --------------------------------------------------------------- TOMATO
    "Tomato_bacterial_spot": {
        "disease_name": "Tomato Bacterial Spot",
        "pathogen": "Xanthomonas vesicatoria / X. euvesicatoria complex",
        "type": "Bacterial",
        "description": (
            "A BACTERIAL disease — fungicides do not control it. It enters through wounds and "
            "natural openings, is spread by splashing water and by handling wet plants, and is "
            "seed-borne. Warm wet weather (24-30 °C) drives it. Management is preventive: "
            "copper programmes, sanitation and avoiding leaf wetness."
        ),
        "symptoms": [
            "Small water-soaked spots becoming dark brown and angular, with a yellow halo",
            "Spots on leaves, stems and fruit alike",
            "Raised scabby lesions on green fruit, making it unmarketable",
            "Defoliation exposing fruit to sunscald",
        ],
        "chemical": [
            "Copper hydroxide + mancozeb tank mix every 7 days — the standard programme",
            "Acibenzolar-S-methyl (a plant defence activator) as a preventive partner",
            "NOTE: conventional fungicides have no effect on bacteria",
        ],
        "biological": [
            "Bacillus subtilis and B. amyloliquefaciens as copper rotation partners",
            "Bacteriophage products where locally available and registered",
        ],
        "organic": [
            "Copper-based products on a strict preventive schedule",
            "Hot-water seed treatment (50 °C for 25 min) to eliminate seed-borne inoculum",
            "Remove and destroy infected plants and all crop debris",
        ],
        "irrigation": [
            "Drip irrigation ONLY. Splash is the primary dispersal route",
            "Never irrigate overhead; mulch to block soil splash",
            "Irrigate in the morning; keep foliage as dry as possible",
        ],
        "fertilization": [
            "Avoid nitrogen excess creating soft susceptible tissue",
            "Calcium supports cell-wall integrity",
            "Balanced potassium for fruit quality",
        ],
        "pruning": [
            "Prune only when foliage is completely dry",
            "Disinfect tools and hands between plants (70% alcohol or 10% bleach)",
            "Do not prune at all during an active outbreak — every wound is an entry point",
        ],
        "prevention": [
            "Certified or hot-water-treated seed — the primary introduction route",
            "2-3 year rotation away from solanaceous crops",
            "Never work in the crop when leaves are wet",
        ],
        "monitoring": [
            "Inspect every 2-3 days in warm humid weather",
            "Check fruit and stems, not just leaves",
        ],
        "recovery_time": "Copper suppresses spread in 10-14 days; existing lesions never heal",
        "warnings": [
            "Fungicides are useless here — this is a bacterium. Confirm the diagnosis before spending",
            "Copper resistance is widespread; rotate with Bacillus and defence activators",
            "Handling wet plants spreads it faster than any weather event",
        ],
        "references": [REF["eppo"], REF["cabi"], REF["dgpa"]],
    },
    "Tomato_early_blight": {
        "disease_name": "Tomato Early Blight",
        "pathogen": "Alternaria linariae (A. solani)",
        "type": "Fungal",
        "description": (
            "Attacks older leaves first and is strongly associated with plant stress and low "
            "nitrogen. Recognisable by concentric target-like rings. It also causes collar rot "
            "on seedlings and stem-end fruit rot. Residue-borne and seed-borne, so rotation "
            "and sanitation matter as much as spraying."
        ),
        "symptoms": [
            "Brown lesions with concentric rings (target board) on lower, older leaves",
            "Yellow halo around the lesions, spreading upward over time",
            "Dark sunken lesions at the stem end of the fruit",
            "Collar rot: dark girdling lesions at the stem base of young plants",
        ],
        "chemical": [
            "Chlorothalonil or mancozeb protectant every 7-10 days",
            "Azoxystrobin (FRAC 11) or difenoconazole (FRAC 3), alternating groups",
            "Boscalid (FRAC 7) in high-pressure situations",
        ],
        "biological": [
            "Bacillus subtilis QST 713 every 7 days as a preventive",
            "Trichoderma applied to soil to reduce residue inoculum and collar rot",
        ],
        "organic": [
            "Copper fungicides on a 7-10 day schedule",
            "Mulch heavily to stop soil splash onto lower leaves",
            "Remove lower leaves up to 30 cm from the ground",
        ],
        "irrigation": [
            "Drip irrigation with mulch — splash from soil is the main initial route",
            "Water in the morning; keep soil moisture even to avoid stress",
        ],
        "fertilization": [
            "ADEQUATE NITROGEN reduces susceptibility — this disease targets weak plants",
            "Balanced potassium and calcium for fruit quality and tissue strength",
            "Split feeding to keep the canopy vigorous through fruiting",
        ],
        "pruning": [
            "Remove lower infected leaves progressively, in dry weather",
            "Stake and train for airflow; do not let the canopy touch the soil",
        ],
        "prevention": [
            "Mulching plus drip plus lower-leaf removal handles most of the pressure",
            "3-year rotation away from solanaceous crops; destroy residue",
            "Use tolerant varieties and healthy transplants",
        ],
        "monitoring": [
            "Weekly scouting of lower leaves from transplanting",
            "Every 3 days once fruit set begins in warm humid weather",
        ],
        "recovery_time": "7-14 days to arrest; new growth stays clean if the programme is maintained",
        "warnings": [
            "Do not confuse with late blight — check for the concentric rings and the lower-leaf pattern",
            "Under-fertilised crops will keep relapsing regardless of the spray programme",
        ],
        "references": [REF["cabi"], REF["frac"], REF["eppo"]],
    },
    "Tomato_late_blight": {
        "disease_name": "Tomato Late Blight",
        "pathogen": "Phytophthora infestans",
        "type": "Oomycete",
        "description": (
            "The same oomycete that devastates potato, and equally destructive on tomato. "
            "Under cool wet conditions it can destroy a crop in 5-7 days. Ordinary fungicides "
            "have no effect. This is the highest-urgency diagnosis in the tomato set and "
            "requires same-day action."
        ),
        "symptoms": [
            "Large water-soaked grey-green patches, typically starting at leaf edges and tips",
            "White downy sporulation on the underside in humid mornings",
            "Dark brown to black lesions on stems and petioles",
            "Firm greasy brown blotches on green fruit, spreading rapidly",
            "Whole-plant collapse within days in favourable weather",
        ],
        "chemical": [
            "IMMEDIATE oomycete chemistry: cymoxanil, mandipropamid, fluopicolide or propamocarb",
            "Systemic + protectant mixture on a 5-7 day interval, shortened to 5 days if wet",
            "Alternate FRAC groups every application — resistance develops fast",
        ],
        "biological": [
            "Insufficient against an active epidemic; preventive use only",
            "Potassium phosphite to support host defences alongside chemistry",
        ],
        "organic": [
            "Copper preventively every 5-7 days — organic control must be pre-emptive",
            "Remove and destroy infected plants immediately (bag them, do not compost)",
            "Increase spacing and use rain shelters or tunnels where possible",
        ],
        "irrigation": [
            "STOP overhead irrigation immediately",
            "Drip only, reduced volume, applied early in the day",
            "Improve drainage and ventilation in protected structures",
        ],
        "fertilization": [
            "Halt nitrogen applications — soft growth accelerates the epidemic",
            "Potassium supports tissue resilience",
        ],
        "pruning": [
            "Remove infected material only in dry conditions, and bag it on the spot",
            "Prune for maximum airflow, but avoid heavy wounding during an outbreak",
        ],
        "prevention": [
            "Resistant varieties, wide spacing, rain protection",
            "Follow regional blight warnings; spray protectively before the risk window",
            "Destroy nearby cull potato piles and volunteers",
        ],
        "monitoring": [
            "DAILY inspection during cool humid weather",
            "Check the lower interior canopy first",
        ],
        "recovery_time": "5-10 days to control if caught at the very first lesions; advanced infection usually means total loss",
        "warnings": [
            "EMERGENCY — act the same day. 48 hours of delay can end the crop",
            "Standard fungicides do NOT work on oomycetes",
            "Spores travel kilometres on wind; inform neighbouring growers",
            "Never compost infected material",
        ],
        "references": [REF["eppo"], REF["frac"], REF["fao"]],
    },
    "Tomato_septoria_leaf_spot": {
        "disease_name": "Tomato Septoria Leaf Spot",
        "pathogen": "Septoria lycopersici",
        "type": "Fungal",
        "description": (
            "Produces many small circular spots with pale centres and dark borders, each "
            "carrying visible black pycnidia. It does not infect fruit, but the defoliation it "
            "causes leads to sunscald and severe yield loss. Residue-borne and spread by "
            "splash."
        ),
        "symptoms": [
            "Numerous small circular spots (2-4 mm) with grey-tan centres and dark margins",
            "Tiny black dots (pycnidia) visible in the spot centres — the diagnostic feature",
            "Starts on the oldest lower leaves and moves upward",
            "Heavy defoliation exposing fruit to sunscald",
            "Fruit is NOT infected (unlike early blight)",
        ],
        "chemical": [
            "Chlorothalonil or mancozeb every 7-10 days from first symptom",
            "Azoxystrobin (FRAC 11) or difenoconazole (FRAC 3) in alternation",
        ],
        "biological": [
            "Bacillus subtilis preventive programme",
            "Trichoderma soil applications to degrade residue inoculum",
        ],
        "organic": [
            "Copper fungicides on a 7-10 day schedule",
            "Mulch to eliminate soil splash",
            "Remove infected lower leaves promptly and destroy them",
        ],
        "irrigation": [
            "Drip irrigation with mulch — splash is the main spread route",
            "Morning irrigation only; never wet the foliage",
        ],
        "fertilization": [
            "Adequate balanced nutrition to maintain canopy vigour",
            "Nitrogen sufficiency helps the plant outgrow lower-leaf losses",
        ],
        "pruning": [
            "Remove the lowest 20-30 cm of foliage; continue upward as infection progresses",
            "Work in dry conditions and disinfect tools",
        ],
        "prevention": [
            "Mulch, drip irrigation and staking cover most of the risk",
            "3-year rotation; destroy all residue and solanaceous weeds (nightshade)",
            "Use disease-free transplants",
        ],
        "monitoring": [
            "Weekly scouting of the lower canopy; every 3 days in humid weather",
            "Track how high up the plant the infection has climbed",
        ],
        "recovery_time": "10-14 days to arrest; defoliated leaves are not replaced",
        "warnings": [
            "Fruit is not directly infected, but defoliation causes sunscald — protect the canopy",
            "Solanaceous weeds around the plot are a persistent reservoir",
        ],
        "references": [REF["cabi"], REF["eppo"], REF["frac"]],
    },
    "Tomato_spider_mites_two_spotted_spider_mite": {
        "disease_name": "Two-Spotted Spider Mite Infestation",
        "pathogen": "Tetranychus urticae (arachnid pest, not a pathogen)",
        "type": "Pest (Acarina)",
        "description": (
            "A PEST, not a disease — fungicides are useless and some (especially certain "
            "broad-spectrum insecticides) make infestations dramatically worse by killing "
            "predatory mites. Populations explode in hot dry conditions above 30 °C, with a "
            "generation completed in as little as 5-7 days. Biological control is often more "
            "effective than chemistry."
        ),
        "symptoms": [
            "Fine pale stippling on the upper leaf surface (feeding punctures)",
            "Fine webbing on leaf undersides and between stems in heavy infestations",
            "Tiny moving specks on the underside — visible with a hand lens",
            "Leaves turning bronze, then dry and brittle; heavy leaf drop",
        ],
        "chemical": [
            "Specific ACARICIDES only: abamectin, spiromesifen, bifenazate or hexythiazox",
            "Rotate IRAC groups every generation — resistance develops extremely fast",
            "AVOID broad-spectrum pyrethroids: they kill predators and cause population flare-ups",
        ],
        "biological": [
            "Phytoseiulus persimilis — a specialist predator, highly effective in protected crops",
            "Amblyseius/Neoseiulus californicus for preventive establishment",
            "Beauveria bassiana entomopathogenic fungus in humid conditions",
        ],
        "organic": [
            "Horticultural oil or insecticidal soap with thorough leaf-UNDERSIDE coverage",
            "Neem oil (azadirachtin) to disrupt development",
            "Forceful water sprays on leaf undersides physically dislodge mites",
            "Raise humidity — mites hate humid conditions, unlike most disease agents",
        ],
        "irrigation": [
            "Increase irrigation and humidity — drought stress is the primary trigger",
            "Overhead misting is genuinely useful here (the opposite of fungal disease advice)",
            "Maintain even soil moisture to keep plants unstressed",
        ],
        "fertilization": [
            "Avoid nitrogen excess — high-N foliage increases mite reproduction rates",
            "Balanced nutrition and silicon improve leaf toughness",
        ],
        "pruning": [
            "Remove and bag the most heavily infested leaves",
            "Improve airflow, but note that a slightly humid microclimate suppresses mites",
        ],
        "prevention": [
            "Avoid drought stress and dusty conditions along field margins",
            "Release predatory mites preventively in protected crops",
            "Control weeds that host mites around the plot",
        ],
        "monitoring": [
            "Hand-lens inspection of leaf undersides twice weekly, more in hot dry spells",
            "Threshold: treat at roughly 5 mites per leaflet, or at the first webbing",
        ],
        "recovery_time": "7-14 days for population knockdown; damaged leaves do not recover",
        "warnings": [
            "This is a PEST — fungicides have no effect whatsoever",
            "Broad-spectrum insecticides make it worse by eliminating natural predators",
            "Resistance appears within a few generations — never repeat the same IRAC group",
            "Coverage of the LEAF UNDERSIDE determines success or failure of any spray",
        ],
        "references": [REF["irac"], REF["cabi"], REF["eppo"]],
    },
    "Tomato_yellow_leaf_curl_virus": {
        "disease_name": "Tomato Yellow Leaf Curl Virus (TYLCV)",
        "pathogen": "TYLCV, transmitted persistently by Bemisia tabaci (whitefly)",
        "type": "Viral",
        "description": (
            "A devastating virus with NO cure. It is transmitted persistently by the whitefly "
            "Bemisia tabaci — an insect that acquires the virus in under an hour and remains "
            "infective for life. Plants infected early are unproductive. All management is "
            "preventive: resistant varieties, whitefly exclusion and vector control."
        ),
        "symptoms": [
            "Severe upward curling and cupping of leaves",
            "Marked yellowing of leaf margins and interveinal areas",
            "Pronounced stunting with shortened internodes, giving a bushy look",
            "Flower drop and almost no fruit set when infection is early",
            "Whiteflies visible on the leaf underside — they fly up when the plant is disturbed",
        ],
        "chemical": [
            "No treatment cures the virus. Control the whitefly vector only",
            "Systemic neonicotinoid at transplanting where permitted and not resistance-compromised",
            "Spiromesifen, pyriproxyfen or flonicamid foliar, rotating IRAC groups",
        ],
        "biological": [
            "Encarsia formosa and Eretmocerus spp. parasitoid wasps in protected crops",
            "Beauveria bassiana for whitefly suppression",
            "Amblyseius swirskii predatory mites feeding on whitefly eggs and nymphs",
        ],
        "organic": [
            "50-mesh insect-proof netting on greenhouse openings — the most effective single measure",
            "Yellow sticky traps at high density for mass trapping and monitoring",
            "Neem oil and insecticidal soap for nymph suppression",
            "UV-reflective silver mulch to disorient incoming whiteflies",
        ],
        "irrigation": [
            "Maintain even moisture — stressed plants show worse symptoms",
            "No irrigation practice affects the virus itself",
        ],
        "fertilization": [
            "Balanced nutrition helps late-infected plants compensate somewhat",
            "Avoid excess nitrogen, which attracts whiteflies and boosts their reproduction",
        ],
        "pruning": [
            "Remove and BAG infected plants — do not carry them through the crop uncovered",
            "Avoid handling infected plants before healthy ones",
        ],
        "prevention": [
            "TYLCV-resistant varieties (Ty-1/Ty-3 genes) are the single most effective tool",
            "Insect-proof netting, double-door entries, whitefly-free transplants",
            "A crop-free break period to interrupt the vector-virus cycle",
            "Rogue infected plants early — every infected plant is a source for the whole field",
        ],
        "monitoring": [
            "Yellow sticky traps checked twice weekly for whitefly numbers",
            "Inspect growing tips of young plants — symptoms appear on new growth first",
        ],
        "recovery_time": "NO recovery. Plants infected before flowering should be removed and replaced",
        "warnings": [
            "Fungicides have zero effect — this is a virus. Do not waste money on them",
            "An infected plant left in place infects the rest of the field via whiteflies",
            "Whitefly resistance to insecticides is widespread — rely on exclusion and resistant varieties",
        ],
        "references": [REF["eppo"], REF["cabi"], REF["irac"]],
    },
    # ---------------------------------------------------------------- WHEAT
    "Wheat_septoria": {
        "disease_name": "Wheat Septoria Leaf Blotch",
        "pathogen": "Zymoseptoria tritici",
        "type": "Fungal",
        "description": (
            "The most damaging wheat foliar disease in Mediterranean and temperate climates. "
            "It has a long latent period (2-4 weeks), so by the time symptoms appear the "
            "infection is already established — which is why protecting the flag leaf "
            "pre-emptively is the decisive intervention. Yield loss can reach 30-50%."
        ),
        "symptoms": [
            "Irregular pale-green to yellow blotches becoming grey-brown",
            "Black pycnidia visible inside the lesions — the key diagnostic",
            "Lesions bounded by leaf veins, giving a rectangular outline",
            "Progression from lower leaves to the flag leaf, driven by rain splash",
        ],
        "chemical": [
            "Protect the FLAG LEAF at GS37-39 — the highest-value spray of the season",
            "SDHI + azole mixtures (e.g. fluxapyroxad + epoxiconazole)",
            "Add a multi-site partner (chlorothalonil or folpet) for resistance management",
            "A second application at GS31 in high-pressure situations",
        ],
        "biological": [
            "Limited commercial options; residue-degrading inoculants after harvest help",
        ],
        "organic": [
            "Resistant varieties are the practical organic control",
            "Later sowing dates reduce autumn infection",
            "Residue burial and rotation away from wheat",
        ],
        "irrigation": [
            "Avoid overhead irrigation during stem extension — splash drives the epidemic upward",
            "Morning irrigation where sprinklers are unavoidable",
        ],
        "fertilization": [
            "Balanced nitrogen — excess creates dense humid canopies and worsens the disease",
            "Split nitrogen to avoid a lush susceptible canopy at stem extension",
            "Adequate potassium and sulphur for tissue strength",
        ],
        "pruning": [
            "Not applicable — manage sowing density instead to limit canopy humidity",
        ],
        "prevention": [
            "Variety resistance rating is the most important single decision",
            "Avoid very early sowing; reduce seed rate in high-risk fields",
            "Rotate and bury residue — the pathogen survives on wheat stubble",
        ],
        "monitoring": [
            "Track rain events and leaf-layer progression from GS31",
            "Assess disease on leaf 3 to decide on the flag-leaf spray",
        ],
        "recovery_time": "One well-timed flag-leaf spray protects 3-4 weeks; damaged tissue is not recovered",
        "warnings": [
            "The long latent period means visible symptoms already understate the infection",
            "Widespread resistance to strobilurins and reduced azole sensitivity — always use mixtures",
            "A late spray after the flag leaf is infected recovers very little yield",
        ],
        "references": [REF["eppo"], REF["frac"], REF["fao"]],
    },
    "Wheat_stripe_rust": {
        "disease_name": "Wheat Stripe Rust (Yellow Rust)",
        "pathogen": "Puccinia striiformis f. sp. tritici",
        "type": "Fungal",
        "description": (
            "A cool-weather rust (10-18 °C) forming distinctive yellow-orange pustules in "
            "stripes between the veins. Spores travel hundreds of kilometres on wind, and new "
            "aggressive races periodically overcome existing varietal resistance. Epidemics "
            "can cause 50%+ losses but respond very well to timely fungicide."
        ),
        "symptoms": [
            "Yellow-orange pustules arranged in narrow stripes along the veins",
            "Stripes most obvious on the upper leaf surface of adult plants",
            "Yellow spore powder rubbing off onto hands and clothing",
            "Severe cases show shrivelled grain and blackened stripes late in the season",
        ],
        "chemical": [
            "Tebuconazole, epoxiconazole or prothioconazole at first pustule detection",
            "SDHI + azole mixtures for extended protection at GS31-39",
            "Repeat after 21 days if cool humid conditions persist",
        ],
        "biological": [
            "No effective commercial biological control for cereal rust",
        ],
        "organic": [
            "Resistant varieties are effectively the only organic option",
            "Variety mixtures and diversified field layouts slow epidemic build-up",
        ],
        "irrigation": [
            "Avoid prolonged canopy wetness; morning irrigation only",
            "Even moisture maintains green leaf area during grain fill",
        ],
        "fertilization": [
            "Avoid nitrogen excess — lush canopies favour rust and stay wet longer",
            "Potassium and sulphur support tissue strength and grain fill",
        ],
        "pruning": [
            "Not applicable — sowing density is the equivalent lever",
        ],
        "prevention": [
            "Choose varieties with current stripe-rust resistance ratings; races shift year to year",
            "Follow regional rust surveillance bulletins — this is a migratory pathogen",
            "Destroy volunteer wheat, which acts as a green bridge between seasons",
        ],
        "monitoring": [
            "Scout weekly from tillering, focusing on cool humid periods",
            "Treat at first pustules — stripe rust can double in under a week",
        ],
        "recovery_time": "10-14 days to arrest; existing pustules stay but stop producing spores",
        "warnings": [
            "New races regularly break existing resistance — never rely on a variety rating alone",
            "Early detection is worth more than any product choice; delayed sprays lose yield permanently",
        ],
        "references": [REF["eppo"], REF["fao"], REF["frac"]],
    },
}

# ---------------------------------------------------------------------------
# Healthy-plant maintenance programmes
# ---------------------------------------------------------------------------
HEALTHY: dict[str, dict] = {
    "Apple_healthy": {
        "plant": "Apple",
        "status_note": "No disease detected. The tree shows healthy foliage — maintain the preventive programme.",
        "maintenance": [
            "Keep the canopy open through annual winter pruning for light and airflow",
            "Remove deadwood, mummified fruit and fallen leaves each winter",
            "Renew mulch under the canopy, keeping it 10 cm clear of the trunk",
            "Check and adjust tree supports and ties before the fruit load builds",
        ],
        "nutrition": [
            "Split nitrogen: main application at bud break, a lighter one after fruit set",
            "Annual soil test; apply potassium and magnesium according to the result",
            "Calcium sprays during fruit sizing to prevent bitter pit and firm the skin",
            "Boron and zinc foliar applications at pink bud where soil analysis indicates need",
        ],
        "watering": [
            "Drip or micro-sprinkler under the canopy — never overhead",
            "Deep, less frequent irrigation to drive roots down (30-40 cm wetting depth)",
            "Critical periods: fruit set and the 6 weeks of fruit sizing",
            "Reduce irrigation before harvest to improve colour and storage quality",
        ],
        "monitoring": [
            "Fortnightly scouting through the growing season; weekly during humid spells",
            "Pheromone traps for codling moth from bloom onward",
            "Inspect for scab and rust symptoms 10-14 days after each significant rain",
        ],
        "prevention": [
            "Preventive fungicide at green tip and pink bud in scab-prone areas",
            "Autumn leaf-litter removal or urea treatment to reduce overwintering inoculum",
            "Disinfect pruning tools between trees",
        ],
        "best_practices": [
            "Thin fruit to one per cluster around 4-6 weeks after bloom for size and return bloom",
            "Maintain a weed-free strip along the tree row; grass alleys between rows",
            "Keep spray and scouting records to build a site-specific disease history",
        ],
        "productivity": "A well-managed mature orchard yields 25-40 t/ha with 85%+ marketable-grade fruit.",
    },
    "Bean_beans_healthy_crop": {
        "plant": "Bean",
        "status_note": "No disease detected. The stand looks healthy — focus on keeping the canopy dry and well nourished.",
        "maintenance": [
            "Keep the field free of weeds, which compete and raise canopy humidity",
            "Maintain the plant spacing that allows airflow through the rows",
            "Remove and destroy any volunteer bean plants from previous cycles",
        ],
        "nutrition": [
            "Ensure effective rhizobium nodulation before adding nitrogen fertiliser",
            "Phosphorus at sowing to support root and nodule development",
            "Potassium through flowering and pod fill for pod quality",
            "Foliar molybdenum and zinc where a soil test indicates deficiency",
        ],
        "watering": [
            "Drip or furrow irrigation — avoid sprinklers entirely",
            "Critical periods: flowering and pod filling; avoid water stress in these windows",
            "Irrigate in the morning; do not let the canopy stay wet overnight",
        ],
        "monitoring": [
            "Scout twice weekly from the first trifoliate leaf, checking leaf undersides",
            "Watch for the first rust pustules and angular leaf-spot lesions in the lower canopy",
            "Check for aphids and whitefly, which transmit bean viruses",
        ],
        "prevention": [
            "Certified disease-free seed for every planting",
            "2-3 year rotation away from beans",
            "Never enter the field when foliage is wet",
        ],
        "best_practices": [
            "Sow at the density recommended for the variety — thick stands hold humidity",
            "Incorporate or remove residue promptly after harvest",
            "Keep a field record of disease history to guide next season's rotation",
        ],
        "productivity": "A healthy irrigated bean crop yields 2.5-4 t/ha of dry grain, or 12-18 t/ha green pods.",
    },
    "Corn_healthy": {
        "plant": "Corn",
        "status_note": "No disease detected. The crop is healthy — protect the ear leaf and keep nutrition on track.",
        "maintenance": [
            "Control weeds through the critical V2-V8 window",
            "Maintain the plant population planned for the field — over-thick stands invite disease",
            "Manage the previous crop's residue to reduce carryover inoculum",
        ],
        "nutrition": [
            "Split nitrogen: at sowing, at V6, and a final dose before tasselling",
            "Phosphorus placed at sowing for early root development",
            "Potassium for stalk strength and lodging resistance",
            "Zinc application where soil tests indicate — maize is highly zinc-responsive",
        ],
        "watering": [
            "Critical periods: tasselling and silking, then grain fill — never allow stress here",
            "Irrigate in the morning; avoid extending dew periods with evening irrigation",
            "Maintain even moisture to prevent both stress and waterlogging",
        ],
        "monitoring": [
            "Weekly scouting from V8, tracking disease relative to the ear leaf",
            "Check for stalk borer, fall armyworm and leafhoppers (virus vectors)",
            "Assess at VT-R1 whether a preventive fungicide is economically justified",
        ],
        "prevention": [
            "Select hybrids rated for the diseases with a history in your fields",
            "Rotate away from maize where gray leaf spot or northern leaf blight has occurred",
            "Clear grass weeds that host leafhoppers and virus reservoirs",
        ],
        "best_practices": [
            "Plant early and uniformly to escape peak vector flights and late-season disease",
            "Keep hybrid-by-field performance records to guide future selection",
            "Harvest at correct moisture to limit ear rots and mycotoxin risk",
        ],
        "productivity": "A healthy irrigated maize crop yields 8-12 t/ha of grain under good management.",
    },
    "Cucumber_healthy": {
        "plant": "Cucumber",
        "status_note": "No disease detected. Cucumber is fast-moving — stay ahead with preventive practice.",
        "maintenance": [
            "Train vines vertically to keep fruit off the soil and improve airflow",
            "Remove old lower leaves progressively as the plant climbs",
            "Keep the growing area and tools clean; disinfect between crop cycles",
        ],
        "nutrition": [
            "Frequent light feeding — cucumber has a short cycle and heavy demand",
            "Maintain calcium supply for firm fruit and strong tissue",
            "Potassium during fruiting for size and quality",
            "Avoid nitrogen excess, which creates dense humid canopies",
        ],
        "watering": [
            "Drip irrigation only, applied consistently — uneven watering causes bitter, misshapen fruit",
            "Irrigate in the morning; avoid any leaf wetness",
            "Higher demand during fruiting; never let the crop wilt",
        ],
        "monitoring": [
            "Inspect leaf undersides every 2-3 days — downy and powdery mildew both start there",
            "Follow regional downy mildew forecasts; it arrives on wind fronts",
            "Watch for whitefly, aphids and thrips as virus vectors",
        ],
        "prevention": [
            "Choose varieties with resistance to downy and powdery mildew",
            "Preventive spray programme in place before the regional mildew front arrives",
            "Aggressive greenhouse venting to prevent night humidity build-up",
        ],
        "best_practices": [
            "Harvest frequently — leaving mature fruit suppresses further set",
            "Sanitise structures, stakes and wires between cycles",
            "2-3 year rotation away from cucurbits",
        ],
        "productivity": "Healthy greenhouse cucumber yields 80-120 t/ha per cycle; open field 25-40 t/ha.",
    },
    "Grape_healthy": {
        "plant": "Grape",
        "status_note": "No disease detected. Vine health is decided mostly by canopy management and pruning hygiene.",
        "maintenance": [
            "Maintain the training system with summer shoot positioning and thinning",
            "Remove leaves in the fruit zone after set for sun exposure and airflow",
            "Clear fallen leaves and mummified berries from under the trellis",
        ],
        "nutrition": [
            "Moderate nitrogen — excess vigour shades fruit and invites disease",
            "Potassium for ripening and sugar accumulation",
            "Magnesium and boron based on petiole analysis at bloom",
        ],
        "watering": [
            "Drip only. Controlled deficit irrigation after set improves fruit quality",
            "Avoid water stress swings, which trigger trunk-disease collapse",
            "Reduce irrigation as ripening approaches",
        ],
        "monitoring": [
            "Scout after each warm rain for black rot and downy mildew",
            "Inspect clusters closely from bloom to 4 weeks after fruit set",
            "Tag and map any vines showing trunk-disease symptoms for future attention",
        ],
        "prevention": [
            "Preventive programme through the critical pre-bloom to post-set window",
            "Protect every pruning wound — trunk diseases enter through cuts",
            "Winter sanitation: remove mummies, deadwood and prunings from the block",
        ],
        "best_practices": [
            "Prune late, in dry weather, and disinfect tools between vines",
            "Keep per-block records of vigour, yield and disease history",
            "Match crop load to vine capacity for consistent quality year to year",
        ],
        "productivity": "Well-managed table grape yields 20-30 t/ha; wine grape 8-15 t/ha depending on target quality.",
    },
    "Groundnut_healthy": {
        "plant": "Groundnut",
        "status_note": "No disease detected. Keep leaf-spot pressure low and calcium supply adequate.",
        "maintenance": [
            "Keep the field weed-free, especially through the pegging window",
            "Avoid soil compaction, which prevents pegs entering the soil",
            "Destroy volunteer groundnut plants that bridge inoculum between seasons",
        ],
        "nutrition": [
            "Gypsum at pegging (400-600 kg/ha) — calcium is critical for pod fill",
            "Rhizobium inoculation at sowing; verify nodulation before adding nitrogen",
            "Phosphorus and potassium according to soil test; sulphur for oil content",
            "Watch for iron chlorosis in calcareous soils; correct with chelated Fe-EDDHA",
        ],
        "watering": [
            "Avoid overhead irrigation; long dew periods drive leaf-spot epidemics",
            "Critical periods: flowering, pegging and pod filling",
            "Do not irrigate immediately before lifting — it complicates harvest and quality",
        ],
        "monitoring": [
            "Begin scouting at 30 days after sowing, twice weekly, checking both leaf surfaces",
            "Track early leaf spot (halo, upper surface) versus late leaf spot (no halo, underside)",
            "Leaf tissue analysis at pegging to catch nutrient deficiency before yield loss",
        ],
        "prevention": [
            "2-3 year rotation with cereals; deep residue burial after harvest",
            "Select varieties with leaf-spot and rust tolerance",
            "Optimal plant spacing to avoid a closed humid canopy",
        ],
        "best_practices": [
            "Lift at correct maturity (check internal pod colour) to protect quality and limit aflatoxin risk",
            "Dry pods rapidly to below 8% moisture after lifting",
            "Keep field-level records of leaf-spot onset to sharpen next season's timing",
        ],
        "productivity": "Healthy irrigated groundnut yields 3-4.5 t/ha of pods under good management.",
    },
    "Potato_healthy": {
        "plant": "Potato",
        "status_note": "No disease detected. Late blight is the standing risk — stay ahead of the weather.",
        "maintenance": [
            "Hill thoroughly to cover tubers and block spore penetration",
            "Keep the field free of volunteer potatoes and solanaceous weeds",
            "Destroy cull piles — they are the main overwintering source of late blight",
        ],
        "nutrition": [
            "Split nitrogen to maintain canopy vigour without excess late growth",
            "Potassium for tuber quality, dry-matter content and skin set",
            "Calcium and magnesium according to soil test",
            "Stop nitrogen before bulking ends so the crop matures and skins set properly",
        ],
        "watering": [
            "Drip irrigation; even moisture prevents both scab and growth cracks",
            "Critical periods: tuber initiation and bulking",
            "Reduce irrigation before harvest so skins set fully",
        ],
        "monitoring": [
            "DAILY inspection during cool humid weather — late blight moves in hours",
            "Weekly scouting of lower leaves for early blight from tuber initiation",
            "Follow regional blight-warning services and act preventively",
        ],
        "prevention": [
            "Certified seed tubers and resistant varieties",
            "Preventive protectant programme aligned to blight-risk forecasts",
            "3-year rotation away from solanaceous crops",
        ],
        "best_practices": [
            "Destroy haulm 2-3 weeks before harvest to protect tubers and set skins",
            "Cure tubers before storing; sort out any damaged or suspect ones",
            "Store cool, dark and well ventilated to prevent storage rots",
        ],
        "productivity": "A healthy irrigated potato crop yields 30-45 t/ha with good grade-out.",
    },
    "Tomato_healthy": {
        "plant": "Tomato",
        "status_note": "No disease detected. Keep the foliage dry, the lower canopy clean, and the vectors out.",
        "maintenance": [
            "Stake or trellis every plant; keep foliage off the soil",
            "Remove the lowest 20-30 cm of leaves as plants establish",
            "Mulch to block soil splash — one of the highest-value preventive actions",
            "Remove suckers regularly in indeterminate varieties, in dry conditions",
        ],
        "nutrition": [
            "Balanced feeding with adequate nitrogen — weak plants get early blight",
            "Calcium throughout fruiting to prevent blossom-end rot",
            "Potassium during fruit development for colour, firmness and flavour",
            "Magnesium foliar sprays if interveinal yellowing appears on older leaves",
        ],
        "watering": [
            "Drip irrigation only, with mulch. Never wet the foliage",
            "Even, consistent moisture — fluctuation causes cracking and blossom-end rot",
            "Morning irrigation so any incidental wetness dries quickly",
        ],
        "monitoring": [
            "Weekly scouting of the lower canopy; every 2-3 days in warm humid weather",
            "Daily checks during cool wet spells for late blight",
            "Yellow sticky traps for whitefly (TYLCV vector); hand-lens checks for spider mites",
        ],
        "prevention": [
            "Resistant varieties, especially Ty-gene TYLCV resistance where whitefly is present",
            "Insect-proof netting in protected production",
            "Preventive protectant sprays before humid periods, not after symptoms appear",
            "3-year rotation away from solanaceous crops",
        ],
        "best_practices": [
            "Handle plants only when dry, and disinfect tools between plants",
            "Harvest regularly and remove any damaged fruit from the field",
            "Keep a season log of disease onset dates to sharpen next year's timing",
        ],
        "productivity": "Healthy greenhouse tomato yields 100-150 t/ha per cycle; open field 60-90 t/ha.",
    },
    "Wheat_healthy": {
        "plant": "Wheat",
        "status_note": "No disease detected. The flag leaf is what carries the yield — plan to protect it.",
        "maintenance": [
            "Control weeds early, before tillering closes the canopy",
            "Maintain the sowing density planned for the variety — thick stands hold humidity",
            "Manage residue from the previous crop to reduce carryover inoculum",
        ],
        "nutrition": [
            "Split nitrogen: tillering, stem extension, and a final dose for grain protein",
            "Avoid nitrogen excess, which creates dense humid canopies and worsens septoria",
            "Sulphur alongside nitrogen for efficient protein formation",
            "Potassium and micronutrients according to soil test",
        ],
        "watering": [
            "Critical periods: stem extension, heading and grain fill",
            "Avoid overhead irrigation during stem extension — splash drives septoria upward",
            "Morning irrigation where sprinklers cannot be avoided",
        ],
        "monitoring": [
            "Scout weekly from tillering, tracking disease on leaf layers 3 and 4",
            "Assess disease on leaf 3 at GS31-37 to decide on the flag-leaf spray",
            "Follow regional rust surveillance bulletins — stripe rust is migratory",
        ],
        "prevention": [
            "Variety choice is the single most important decision — check current resistance ratings",
            "Avoid very early sowing in septoria-prone areas",
            "Rotate away from wheat and bury stubble where septoria has been severe",
        ],
        "best_practices": [
            "Plan the flag-leaf (GS37-39) protection window in advance — it is the key spray",
            "Use fungicide mixtures with different modes of action for resistance management",
            "Keep per-field disease and variety records year to year",
        ],
        "productivity": "Healthy irrigated durum or bread wheat yields 5-8 t/ha under good management.",
    },
}
