# AV Parfums — e-commerce monorepo

Production-ready rebuild of the AV Parfums shop (brumes parfumées, Algérie):

| Piece      | Stack                                                                          |
| ---------- | ------------------------------------------------------------------------------ |
| `frontend/`| React 19 · TypeScript · Vite · Tailwind v4 · TanStack Router + Query · Zustand · react-hook-form + Zod · react-i18next (FR/AR/EN) · sonner |
| `backend/` | Django 5 · DRF · dj-rest-auth + SimpleJWT (httpOnly cookies) · django-allauth (Google) · Celery + Redis · drf-spectacular · structlog · Sentry |
| `docker/`  | docker-compose: postgres 16, redis, backend (gunicorn), celery, celery-beat, frontend (Vite), nginx reverse proxy |

The signature visual identity is preserved: immersive full-screen crossfading
backgrounds, floating bottle carousel, ghost Anton typography, tint-driven
hover states, swipe / wheel / keyboard navigation.

## Quick start (Docker — recommended)

```bash
cp .env.example .env          # then edit SECRET_KEY etc.
docker compose -f docker/docker-compose.yml --env-file .env up -d --build
```

Everything is served from one origin through nginx:

- App: http://localhost:8080
- API: http://localhost:8080/api/v1/ · docs at `/api/docs/`, schema at `/api/schema/`
- Django admin: http://localhost:8080/django-admin/

Migrations run and the 58 wilayas + 2 products (Sweet Dreams 2500 DA, Honey
Touch 2800 DA) are seeded automatically. Create an admin account:

```bash
docker compose -f docker/docker-compose.yml exec backend python manage.py createsuperuser
```

A superuser has `role=admin` and can use both `/django-admin/` and the React
dashboard at `/admin`.

## Bare-metal dev (no Docker)

Backend (falls back to SQLite when `DATABASE_URL` is unset; Celery tasks run
inline so no Redis needed):

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate     # Windows
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py loaddata wilayas products
python manage.py createsuperuser
python manage.py runserver 8000
```

Frontend (Vite proxies `/api` and `/media` to :8000):

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

## Tests & quality gates

```bash
cd backend && pytest --cov          # 42 tests, ~86% coverage (auth/cart/orders/catalog)
cd backend && ruff check . && ruff format --check . && mypy .
cd frontend && npm test             # vitest
cd frontend && npm run lint && npm run typecheck
pre-commit install                  # optional hooks (ruff, eslint, prettier)
```

CI (`.github/workflows/ci.yml`) runs lint + typecheck + tests against
PostgreSQL 16, verifies migrations are current, and builds both Docker images
on `main`. Wire your deploy target (Fly.io / Railway / VPS / ECS) in the
`docker` job.

## Architecture notes

- **API** under `/api/v1/`: `products` (slug lookup, django-filter +
  PostgreSQL full-text/trigram search, page size 12), `categories`, `cart`,
  `orders`, `wilayas`, `health`, `auth/*` and admin-only `admin/products`,
  `admin/orders` (+ `POST …/status/` with a validated transition machine:
  pending → confirmed → shipped → delivered, cancel restocks).
- **Auth**: JWT in httpOnly cookies (`av-access`/`av-refresh`), silent refresh
  on 401 in `frontend/src/lib/api.ts`. Google OAuth via
  `POST /api/v1/auth/google/` (set `GOOGLE_OAUTH_CLIENT_ID/SECRET`).
  Role checks (`IsAdmin`, `IsOwnerOrAdmin`) are enforced server-side; the
  React `/admin` gate is UX only.
- **Cart**: guests get a session cart (or localStorage offline); it merges
  into the user cart automatically on login. `UNIQUE(cart, variant)` and
  `CHECK(quantity > 0)` at the DB level.
- **Orders**: COD checkout; prices/totals are always computed server-side;
  `select_for_update` prevents overselling; confirmation e-mail + low-stock
  alerts go through Celery after commit.
- **Media**: local `MEDIA_ROOT` in dev, S3 via django-storages when
  `USE_S3=True`. Gallery uploads get responsive 800/400px variants generated
  by a Celery + Pillow task.
- **SEO**: per-route `head()` metadata, JSON-LD Product/Organization,
  `sitemap.xml` + `robots.txt` served by Django.
- **Monitoring**: `/api/v1/health/` (DB probe), structlog JSON logs, Sentry on
  both sides via `SENTRY_DSN_BACKEND` / `VITE_SENTRY_DSN`.

## Product images

The original renders were recovered from Lovable's CDN and live in
`backend/seed_media/products/` (tracked in git). `python manage.py seed_media`
copies them into `MEDIA_ROOT` without overwriting admin uploads — compose and
`make seed` run it automatically. SVG fallbacks in `frontend/public/images/`
only appear if the API is unreachable.

## Handy Make targets

`make up` / `make down` / `make logs` · `make test` · `make lint` ·
`make migrate` / `make seed` / `make superuser` · `make gen-api`
(regenerates the typed OpenAPI client into `frontend/src/lib/api-schema.d.ts`).
