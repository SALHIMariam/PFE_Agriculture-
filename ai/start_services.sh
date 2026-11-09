#!/bin/bash
cd "$(dirname "$0")"

# serving/ et risk_serving/ sont de vrais packages Python (imports relatifs,
# __init__.py) : ils se lancent depuis ai/ avec le nom de package en préfixe.
uvicorn serving.main:app --host 0.0.0.0 --port 8001 --workers 2 &
uvicorn risk_serving.main:app --host 0.0.0.0 --port 8006 --workers 2 &

# copilot_serving/ n'est PAS un package (pas de __init__.py, imports plats :
# `import config`, `from schemas import ...`) : il doit tourner avec son
# propre dossier comme répertoire de travail, sinon ses imports échouent.
(cd copilot_serving && uvicorn main:app --host 0.0.0.0 --port 8007 --workers 2) &

# Planificateur Laravel : collecte des actualités (toutes les 30 min),
# alertes de risque (6 h) et rappels de réunion (chaque minute).
(cd ../backend && php artisan schedule:work) &

wait
