# Product image placeholders

The original bottle renders and background photos live on Lovable's CDN and
were not part of the exported repo. These SVGs are stand-ins so the UI never
breaks.

To restore the real visuals, either:

1. **Recommended** — upload the real `bottle` / `background` images per product
   in the admin dashboard (`/admin/products`) or Django admin
   (`/django-admin/`). The API serves them from `/media/...` and the frontend
   uses them automatically.
2. Or download the assets from your Lovable project
   (`sweet-dreams-bottle.png`, `sweet-dreams-bg.jpg`, `honey-touch-bottle.png`,
   `honey-touch-bg.jpg`), drop them in `backend/media/products/bottles/` and
   `backend/media/products/backgrounds/` matching the paths in
   `backend/apps/catalog/fixtures/products.json`.
