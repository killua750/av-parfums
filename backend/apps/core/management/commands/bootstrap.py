"""Idempotent production bootstrap, safe to run at every boot:
- ensures the wilaya fixture is loaded (only when that table is empty);
- ensures every product in the catalog fixture EXISTS (created by slug/sku
  when missing) without ever touching an existing row — so admin edits to
  stock/price survive restarts, yet newly added fixture products (e.g. a new
  perfume) appear automatically on the next deploy;
- creates the superuser from DJANGO_SUPERUSER_EMAIL / _PASSWORD when absent."""

import json
import os
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import Category, Product, ProductVariant
from apps.core.models import Wilaya

FIXTURE = Path(settings.BASE_DIR) / "apps" / "catalog" / "fixtures" / "products.json"


class Command(BaseCommand):
    help = "Seed wilayas (if empty), ensure all fixture products exist, ensure superuser."

    def handle(self, *args, **options):
        if not Wilaya.objects.exists():
            call_command("loaddata", "wilayas")
            self.stdout.write(self.style.SUCCESS("Seeded wilayas."))

        created = self._ensure_products()
        self.stdout.write(self.style.SUCCESS(f"Products ensured ({created} created)."))

        self._ensure_superuser()
        self.stdout.write("Bootstrap done.")

    @transaction.atomic
    def _ensure_products(self) -> int:
        """Create categories/products/variants from the fixture by natural key,
        leaving any already-present row untouched."""
        rows = json.loads(FIXTURE.read_text(encoding="utf-8"))
        # Map the fixture's product pk -> slug so variants resolve to the right
        # product by slug (live DB ids may differ from fixture pks).
        pk_to_slug = {
            r["pk"]: r["fields"]["slug"] for r in rows if r["model"] == "catalog.product"
        }
        # Ensure the default category first (products reference it by fixture pk).
        default_category = None
        for row in rows:
            if row["model"] == "catalog.category":
                default_category, _ = Category.objects.get_or_create(
                    slug=row["fields"]["slug"], defaults={"name": row["fields"]["name"]}
                )

        created = 0
        for row in rows:
            fields = row["fields"]
            if row["model"] == "catalog.product":
                _, was_created = Product.objects.get_or_create(
                    slug=fields["slug"],
                    defaults={
                        "category": default_category,
                        "name": fields["name"],
                        "tagline": fields["tagline"],
                        "description": fields["description"],
                        "tint": fields["tint"],
                        "bottle_image": fields["bottle_image"],
                        "background_image": fields["background_image"],
                        "is_active": fields["is_active"],
                        "featured": fields["featured"],
                    },
                )
                created += was_created
            elif row["model"] == "catalog.productvariant":
                product = Product.objects.get(slug=pk_to_slug[fields["product"]])
                ProductVariant.objects.get_or_create(
                    sku=fields["sku"],
                    defaults={
                        "product": product,
                        "size": fields["size"],
                        "price": fields["price"],
                        "stock": fields["stock"],
                    },
                )
        return created

    def _ensure_superuser(self) -> None:
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "")
        if not (email and password):
            return
        user_model = get_user_model()
        if not user_model.objects.filter(email__iexact=email).exists():
            user_model.objects.create_superuser(email=email, password=password)
            self.stdout.write(self.style.SUCCESS(f"Superuser {email} created."))
