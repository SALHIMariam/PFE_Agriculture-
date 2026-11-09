.PHONY: install all kb dataset train test api clean

install:
	pip install -r requirements.txt

kb:
	python -m src.knowledge_base

dataset: kb
	python -m src.dataset

train: dataset
	python -m src.train

all:
	python scripts/run_all.py

test:
	python -m pytest tests/ -v

api:
	uvicorn src.api:app --host 0.0.0.0 --port 8100 --reload

clean:
	rm -rf artifacts/*.joblib artifacts/*.json reports/*
	find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
