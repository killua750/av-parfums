# AV Parfums monorepo helper targets.
# Windows users: run via Git Bash or `make` from WSL; every target also
# documents the raw command so nothing here is load-bearing.

COMPOSE = docker compose -f docker/docker-compose.yml --env-file .env

.PHONY: help up down logs build backend-install backend-run migrate seed \
        superuser test-backend lint-backend frontend-install frontend-run \
        test-frontend lint-frontend gen-api test lint

help:
	@grep -E '^[a-zA-Z_-]+:' Makefile | sed 's/:.*//' | sort | uniq

## --- Docker (full stack) ---
up:            ## start postgres, redis, backend, celery, frontend, nginx
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f --tail=100

build:
	$(COMPOSE) build

## --- Backend (bare metal) ---
backend-install:
	cd backend && python -m venv .venv && .venv/Scripts/pip install -r requirements-dev.txt || \
	(cd backend && .venv/bin/pip install -r requirements-dev.txt)

backend-run:
	cd backend && python manage.py runserver 8000

migrate:
	cd backend && python manage.py migrate

seed:
	cd backend && python manage.py loaddata wilayas products && python manage.py seed_media

superuser:
	cd backend && python manage.py createsuperuser

test-backend:
	cd backend && pytest --cov

lint-backend:
	cd backend && ruff check . && ruff format --check . && mypy .

## --- Frontend (bare metal) ---
frontend-install:
	cd frontend && npm install

frontend-run:
	cd frontend && npm run dev

test-frontend:
	cd frontend && npm test

lint-frontend:
	cd frontend && npm run lint && npm run typecheck

gen-api:        ## regenerate typed API client from the DRF OpenAPI schema
	cd backend && python manage.py spectacular --file ../frontend/openapi.json --format openapi-json
	cd frontend && npm run gen:api

## --- Aggregate ---
test: test-backend test-frontend
lint: lint-backend lint-frontend
