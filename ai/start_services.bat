@echo off
cd /d "%~dp0"
start "EfficientNet" cmd /c "uvicorn serving.main:app --host 0.0.0.0 --port 8001 --workers 2"
start "Risk" cmd /c "uvicorn risk_serving.main:app --host 0.0.0.0 --port 8006 --workers 2"
start "Copilot" cmd /c "cd copilot_serving && uvicorn main:app --host 0.0.0.0 --port 8007"
REM Planificateur Laravel : collecte des actualites (toutes les 30 min),
REM alertes de risque (6 h) et rappels de reunion (chaque minute).
start "Scheduler" cmd /c "cd /d "%~dp0..\backend" && php artisan schedule:work"
echo Tous les services sont lances.
