"""Idempotent production bootstrap, safe to run at every boot:
- loads the wilaya/product fixtures only when those tables are EMPTY
  (never overwrites admin edits, stock or prices on restart);
- creates the superuser from DJANGO_SUPERUSER_EMAIL / _PASSWORD env vars
  if that account doesn't exist yet."""

import os

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.catalog.models import Product
from apps.core.models import Wilaya


class Command(BaseCommand):
    help = "Seed fixtures (only into empty tables) and ensure the env-defined superuser."

    def handle(self, *args, **options):
        if not Wilaya.objects.exists():
            call_command("loaddata", "wilayas")
            self.stdout.write(self.style.SUCCESS("Seeded wilayas."))
        if not Product.objects.exists():
            call_command("loaddata", "products")
            self.stdout.write(self.style.SUCCESS("Seeded products."))

        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "")
        if email and password:
            user_model = get_user_model()
            if not user_model.objects.filter(email__iexact=email).exists():
                user_model.objects.create_superuser(email=email, password=password)
                self.stdout.write(self.style.SUCCESS(f"Superuser {email} created."))
        self.stdout.write("Bootstrap done.")
