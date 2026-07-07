# Product image placeholders

The real product renders were recovered from Lovable's CDN and are tracked in
`backend/seed_media/products/`; `python manage.py seed_media` copies them into
`MEDIA_ROOT` (done automatically by docker-compose and `make seed`), and the
API serves them from `/media/...`.

The SVGs here are only the last-resort fallback used by
`frontend/src/data/fallback.ts` when the API itself is unreachable.

New product imagery should be uploaded through the admin dashboard
(`/admin/products`) or Django admin (`/django-admin/`).
