# AgriDetect — Assistant AI (service IA)

Service FastAPI qui prépare le travail de l'Expert : il trie les analyses par
priorité, rédige un brouillon de réponse au Farmer, évalue sa propre fiabilité
et bloque toute proposition automatique quand le diagnostic est incertain.
Ce n'est pas un modèle entraîné : c'est un **moteur de décision hybride**
(règles + templates + base de connaissances) qui combine les sorties de tes
trois modèles existants (EfficientNetB0, recommandation LightGBM, risque).

## Les 6 modules

| # | Module | Rôle | Entrée |
|---|--------|------|--------|
| 1 | Safety Guard | Bloque la réponse auto si incertain | confidence, top-3 |
| 2 | Triage Scorer | Priorité /100 (urgent/important/normal) | sévérité, risque, cas région |
| 3 | Knowledge Base | Fiche agronomique de la maladie | predicted_class |
| 4 | Response Engine | Brouillon de réponse au Farmer | tout le contexte |
| 5 | Confidence Scorer | Fiabilité de la réponse proposée | sources disponibles |
| 6 | Context Merger | Personnalise selon gouvernorat/météo/historique | intégré au 4 |

## Lancement

```bash
cd ai/copilot_serving
pip install -r requirements.txt
python -m uvicorn main:app --port 8007
```

Cohérent avec ton architecture : détection sur 8001, risque sur 8006,
copilot sur 8007.

## Tests

```bash
python -m pytest -v
```

## API

`POST /copilot/prepare` — Laravel agrège le contexte d'une analyse et l'envoie ;
le service renvoie safety + priority + confidence + draft + knowledge.

## Intégration Laravel (à faire côté backend)

1. `config/services.php` : ajouter
   `'ai_copilot' => ['url' => env('AI_COPILOT_SERVICE_URL', 'http://127.0.0.1:8007')]`
2. `.env` : `AI_COPILOT_SERVICE_URL=http://127.0.0.1:8007`
3. `CopilotService.php` : agréger (analyse + recommandation + user.gouvernorat +
   météo + history_count + pending_similar_count) puis POST vers `/copilot/prepare`.
4. Migration : ajouter à `analyses` les colonnes `draft_response` (text),
   `expert_edited_response` (boolean), `priority_score` (int).
5. Routes sous `auth:sanctum` :
   - `GET /api/copilot/queue` — analyses triées par priority_score
   - `GET /api/copilot/prepare/{analysis}` — préparation d'une analyse
   - `GET /api/copilot/batches` — groupes de cas similaires (SQL GROUP BY)

## À compléter

`knowledge_base.json` contient 6 fiches représentatives + le modèle sain +
le fallback. Il reste à remplir les autres classes sur le même schéma —
le contenu existe déjà dans ton cahier des charges Recommendation v2.
