# AgriDetect — Moteur de recommandation

Système de recommandation agronomique en aval du classifieur d'images
EfficientNetB0.

## Architecture

```
Photo de la feuille ──▶ EfficientNetB0 ──▶ classe prédite ──┐
                                                             ├──▶ Moteur ──▶ Package
Utilisateur connecté ──▶ profil ──▶ gouvernorat ────────────┘
```

**Deux entrées, toutes deux automatiques.** L'agriculteur ne saisit rien :
le gouvernorat vient de son profil (table `users`), la classe vient du CNN.

À partir de ces deux informations, le moteur détermine l'un des 4 cas :

| | Région favorable | Région défavorable |
|---|---|---|
| **Plante saine** | `CAS 1` — entretien standard | `CAS 3` — conseils d'adaptation |
| **Plante malade** | `CAS 2` — traitement complet | `CAS 4` — traitement + alerte région |

Niveaux de risque associés : Faible / Élevé / Moyen / Critique.
Fréquence de surveillance : 14 j / 3 j / 7 j / 2 j.

---

## Structure du projet

```
agrireco/
├── src/
│   ├── config.py            39 classes, 24 gouvernorats, zones climatiques
│   ├── compatibility.py     matrice 9 plantes × 24 gouvernorats
│   ├── agronomy.py          contenu agronomique (30 maladies + 9 saines)
│   ├── knowledge_base.py    construction des 78 packages
│   ├── dataset.py           énumération des 936 combinaisons
│   ├── train.py             comparatif des 5 algorithmes
│   ├── recommender.py       inférence → package complet
│   └── api.py               service FastAPI
├── scripts/                 run_all.py, run_api.py
├── tests/                   31 tests
├── data/                    base de connaissances, dataset, matrice
├── artifacts/               modèle joblib + métadonnées
└── reports/                 comparatif, importances, matrices de confusion
```

## Démarrage

```bash
pip install -r requirements.txt
make all      # matrice → base → dataset → entraînement
make test     # 31 tests
make api      # service sur :8100
```

---

## La matrice de compatibilité

Règle métier agronomique, pas un modèle appris. Trois niveaux :

| Niveau | Sens |
|---|---|
| `FAVORABLE` (2) | culture bien adaptée, couramment pratiquée dans la région |
| `ADAPTABLE` (1) | possible avec précautions (irrigation, variétés, abris) |
| `DEFAVORABLE` (0) | climat inadapté, culture à risque élevé |

Pour l'aiguillage des 4 cas, `FAVORABLE` et `ADAPTABLE` sont regroupés ;
seul `DEFAVORABLE` bascule vers les CAS 3 / CAS 4. Le niveau fin reste exposé
dans la réponse pour nuancer le conseil.

Répartition sur les 216 combinaisons : **121 favorables, 52 adaptables,
43 défavorables**.

Construction : zonage agro-climatique tunisien (Nord humide / Centre
semi-aride / Sud aride) croisé avec les exigences hydriques et thermiques de
chaque culture, puis exceptions nommées gouvernorat par gouvernorat — Gabès
est au Sud mais ses oasis maraîchères conviennent à la tomate, Kasserine est
au Centre mais son altitude apporte le froid hivernal du pommier, Sfax et
Sidi Bouzid sont les bassins historiques de l'arachide.

---

## Résultats

Jeu de données : **936 lignes** (39 classes × 24 gouvernorats), 78 packages.
Découpage 702 / 234, validation croisée 5 plis, recherche aléatoire
d'hyperparamètres, sélection sur F1 macro.

| Modèle | CV F1 | Accuracy | F1 macro | Précision | Rappel | Acc. cas | Temps |
|---|---|---|---|---|---|---|---|
| **DecisionTree** | **0.9369** | **0.9786** | **0.9111** | 0.9145 | 0.9231 | 0.9786 | **1.3 s** |
| XGBoost | 0.9130 | 0.9786 | 0.9111 | 0.9145 | 0.9231 | 0.9786 | 20.3 s |
| RandomForest | 0.9073 | 0.9744 | 0.8953 | 0.8983 | 0.9060 | 0.9829 | 11.6 s |
| LightGBM | 0.9247 | 0.9658 | 0.8741 | 0.8825 | 0.8889 | 0.9701 | 37.0 s |
| CatBoost | 0.9334 | 0.9786 | 0.8718 | 0.8761 | 0.8803 | **1.0000** | 88.7 s |

**L'arbre de décision gagne** — même F1 que XGBoost, pour 1,3 s contre 20 s.
Résultat attendu : la cible est une règle simple, et les ensembles n'ont rien
de plus à apprendre. C'est un argument à assumer dans le mémoire plutôt qu'à
masquer.

---

## Point à assumer devant le jury

Avec uniquement `(classe, gouvernorat)` en entrée, la cible est une **fonction
déterministe** de ces deux variables :

```
Recommendation_ID = f(classe, favorabilité(plante, gouvernorat))
```

Aucun bruit, aucune variable latente, aucune ambiguïté. Les 936 lignes ne sont
pas un échantillon : elles sont la **table de vérité complète** du problème.
Un modèle qui atteint ~98 % ne prédit rien — il mémorise une table de
correspondance.

Les ~2 % d'erreur restants ne viennent pas de la difficulté du problème mais
du fait que certains packages n'ont qu'une seule combinaison possible (une
culture déconseillée dans un unique gouvernorat), donc parfois absente du jeu
d'entraînement.

### Conséquence : la règle est prioritaire sur le modèle

Mesuré sur les 936 combinaisons, le modèle diverge de la règle sur **5 d'entre
elles (0,53 %)** — toutes à Tataouine, et **toutes dans le sens dangereux** :
il annonce « région favorable » là où la culture est en réalité déconseillée.

| Classe | Gouvernorat | Règle | Modèle |
|---|---|---|---|
| `Groundnut__healthy` | Tataouine | CAS 3 | CAS 1 |
| `Groundnut__nutrition_deficiency` | Tataouine | CAS 4 | CAS 2 |
| `Groundnut__rust` | Tataouine | CAS 4 | CAS 2 |
| `Tomato__early_blight` | Tataouine | CAS 4 | CAS 2 |
| `Tomato__spider_mites…` | Tataouine | CAS 4 | CAS 2 |

Laisser le modèle décider ferait perdre l'avertissement d'adaptation à un
agriculteur du Sud saharien. Le moteur applique donc la règle, garde le modèle
chargé, et renvoie sa prédiction dans `modele.prediction_modele` avec un
indicateur `accord_modele_regle` — le comparatif exigé par le cahier des
charges est produit, sans confier la décision à un modèle strictement moins
bon que la règle qu'il approxime.

### Si un vrai problème d'apprentissage est souhaité

Il faut une source de variabilité réelle. La plus simple et la plus honnête :
le **mois**, disponible via l'horodatage de l'analyse, sans aucune saisie du
fermier. `src/dataset.py` l'implémente déjà :

```python
from src.dataset import save
save(with_month=True)   # 11 232 lignes au lieu de 936
```

---

## API

### `POST /recommendation`

```json
{
  "class": "Tomato__late_blight",
  "governorate": "Bizerte",
  "confidence": 0.97
}
```

```json
{
  "recommendation_id": "R065",
  "cas": "CAS_2",
  "cas_label": "Plante malade — région favorable",
  "plante": "Tomate",
  "maladie": "Tomato Late Blight",
  "niveau_risque": "Élevé",
  "intervalle_surveillance_jours": 3,
  "traitements": { "chimique": [...], "biologique": [...], "organique": [...] },
  "irrigation": [...], "fertilisation": [...], "prevention": [...],
  "avertissements": [...],
  "region": { "niveau_label": "Favorable", "zone": "Nord", ... },
  "modele": { "prediction_modele": "R065", "accord_modele_regle": true }
}
```

Autres endpoints : `POST /recommendation/batch`, `GET /classes`,
`GET /governorates`, `GET /compatibility`,
`GET /compatibility/{plante}/{gouvernorat}`, `GET /knowledge-base/{id}`,
`GET /health`.

---

## Choix défendables

**Le ML n'écrit jamais le texte agronomique.** Il sélectionne un identifiant ;
la base de connaissances fournit les mots. Un agronome peut relire les 78
packages une fois, et aucune mise à jour du modèle ne peut changer en douce ce
qu'on dit à un agriculteur de pulvériser.

**Aucun croisement de culture n'est possible.** La sortie du modèle est
contrainte aux identifiants légaux pour la classe reçue. Une recommandation
« pommier » sur une photo de tomate est structurellement impossible.

**Les problèmes non fongiques sont signalés en clair.** TYLCV et le virus de
la striure du maïs sont viraux, la tache bactérienne est bactérienne, les
acariens sont un ravageur, la carence de l'arachide est abiotique, et trois
classes sont des oomycètes que les fongicides ordinaires ne touchent pas.
Chacun porte un avertissement explicite, et un test l'exige.

**Dégradation propre.** Si l'artefact joblib manque, le service applique la
règle au lieu de renvoyer une 500.

---

## Limites à écrire dans le mémoire

1. **La matrice de compatibilité est à faire valider.** Elle croise le zonage
   agro-climatique tunisien avec les exigences des cultures, mais les 216
   cellules doivent être relues par un agronome avant d'être citées.

2. **Les traitements sont à vérifier localement.** Matières actives et doses
   suivent les recommandations internationales. Le statut d'homologation, les
   doses et les délais avant récolte doivent être confrontés à la liste
   DGPCQPA avant tout usage réel.

3. **Le contenu agronomique est en anglais.** La base `agronomy.py` provient
   de sources internationales ; les enveloppes (messages des 4 cas, conseils
   d'adaptation, avertissements régionaux) sont en français. Une traduction
   complète est à prévoir pour la mise en production.

4. **Le modèle ML n'apporte rien sur ce périmètre** — voir la section
   ci-dessus. C'est une conclusion, pas un échec : elle justifie l'architecture
   retenue.
