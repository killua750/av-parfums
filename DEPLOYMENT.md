# Deploying AV Parfums for free

Free stack: **Vercel** (frontend + API proxy) · **Render free** (Django API) ·
**Neon free** (PostgreSQL) · optional **Cloudflare R2** (media uploads).
Total cost: 0 DA. Trade-off: the free API instance sleeps after ~15 min idle
and takes ~30-60 s to wake on the first request.

## 0. Push to GitHub

```bash
gh repo create av-parfums --private --source . --push
# or create the repo on github.com and: git remote add origin <url> && git push -u origin main
```

## 1. Database — Neon (free)

1. https://neon.tech → New project (region: EU) → copy the **connection string**
   (`postgresql://…?sslmode=require`).

## 2. API — Render (free)

1. https://render.com → **New → Blueprint** → select the repo.
   `render.yaml` at the repo root configures everything (Python 3.12, gunicorn,
   health check on `/api/v1/health/`, Celery in eager mode — no Redis needed).
2. In the service's Environment tab fill the `sync: false` vars:
   - `DATABASE_URL` → the Neon string
   - `CSRF_TRUSTED_ORIGINS` / `CORS_ALLOWED_ORIGINS` → `https://<your-app>.vercel.app`
3. Seed the production DB **once from your machine** (no shell on the free tier —
   but the DB is remote, so local commands work against it):

```bash
cd backend
set DATABASE_URL=<neon-connection-string>   # PowerShell: $env:DATABASE_URL="..."
python manage.py migrate
python manage.py loaddata wilayas products
python manage.py createsuperuser
```

Product images: `seed_media` runs at every boot and restores the bundled
renders onto the (ephemeral) disk, so the catalog images always work.

## 3. Frontend — Vercel (free)

1. https://vercel.com → **Add New → Project** → import the repo.
2. **Root Directory: `frontend`** — the Vite preset autodetects build/output.
3. If your Render service name differs, update the two URLs in
   `frontend/vercel.json` first.

`vercel.json` proxies `/api/*` and `/media/*` to Render, so browser, cookies
and CSRF all see **one origin** — no cross-site cookie pain, and the httpOnly
JWT flow works unchanged.

## 4. Admin uploads that survive restarts (optional, free)

Render's free disk is wiped on each deploy. Catalog seed images are re-copied
at boot, but images uploaded through the admin need object storage:

1. Cloudflare R2 (10 GB free, no egress fees) → create bucket + API token.
2. On Render add: `USE_S3=True`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
   `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com`.

## When you outgrow free

| Symptom | Fix |
|---|---|
| Cold starts annoy the client | Render Starter (~$7/mo) or a 5€ VPS with the repo's docker-compose |
| Need real Celery (emails, image variants) | Upstash Redis free tier + a Render background worker |
| Custom domain | Free on both Vercel and Render (add DNS records) |
