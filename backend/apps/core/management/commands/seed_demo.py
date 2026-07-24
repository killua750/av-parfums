"""Populate the DB with realistic demo orders so the admin dashboard renders
with real numbers during development / screenshots. LOCAL ONLY — refuses to
run when DEBUG is False so it can never pollute the production store."""

import random
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.catalog.models import ProductVariant
from apps.core.models import Wilaya
from apps.orders.models import Order, OrderItem, OrderStatus, ShippingAddress

NAMES = [
    "Amina Belkacem",
    "Yacine Haddad",
    "Lina Cherif",
    "Sofiane Meziane",
    "Nour Bensalah",
    "Mehdi Boudiaf",
    "Sara Toumi",
    "Riad Khelifi",
    "Ines Bouzid",
    "Adel Mansouri",
    "Yasmine Slimani",
    "Karim Ait Ali",
    "Chaïma Ferhat",
    "Bilal Ouahab",
    "Rania Djebbar",
    "Nabil Zerrouki",
]
COMMUNES = [
    "Bab Ezzouar",
    "Hydra",
    "Kouba",
    "Oran Centre",
    "Sidi Bel Abbès",
    "El Khroub",
    "Bejaia Ville",
    "Sétif",
    "Tizi Ouzou",
    "Blida",
]
# status → weight (delivered dominates a healthy store)
STATUS_WEIGHTS = [
    (OrderStatus.DELIVERED, 46),
    (OrderStatus.SHIPPED, 14),
    (OrderStatus.CONFIRMED, 14),
    (OrderStatus.PENDING, 18),
    (OrderStatus.CANCELLED, 8),
]


class Command(BaseCommand):
    help = "Seed realistic demo orders (DEBUG only)."

    def add_arguments(self, parser):
        parser.add_argument("--orders", type=int, default=90)
        parser.add_argument("--days", type=int, default=90)
        parser.add_argument("--reset", action="store_true", help="Delete existing orders first")

    def handle(self, *args, **opts):
        if not settings.DEBUG:
            raise CommandError("Refusing to seed demo data with DEBUG=False (production).")

        rng = random.Random(42)  # noqa: S311 (demo data, not cryptographic)
        variants = list(ProductVariant.objects.select_related("product"))
        wilayas = list(Wilaya.objects.all())
        if not variants or not wilayas:
            raise CommandError("Load fixtures first (wilayas + products).")

        if opts["reset"]:
            Order.objects.all().delete()

        statuses = [s for s, w in STATUS_WEIGHTS for _ in range(w)]
        now = timezone.now()
        created = 0

        with transaction.atomic():
            for _ in range(opts["orders"]):
                # Skew orders toward the recent past (quadratic) for a growth curve.
                frac = rng.random() ** 1.7
                when = now - timedelta(
                    days=frac * opts["days"],
                    hours=rng.randint(0, 23),
                    minutes=rng.randint(0, 59),
                )
                status = rng.choice(statuses)
                order = Order.objects.create(status=status, shipping_fee=Decimal("400.00"))

                subtotal = Decimal("0.00")
                for variant in rng.sample(variants, k=rng.randint(1, min(3, len(variants)))):
                    qty = rng.randint(1, 3)
                    line = variant.price * qty
                    subtotal += line
                    OrderItem.objects.create(
                        order=order,
                        variant=variant,
                        product_name=variant.product.name,
                        variant_size=variant.size,
                        unit_price=variant.price,
                        quantity=qty,
                    )
                order.subtotal = subtotal
                order.total = subtotal + order.shipping_fee
                order.save(update_fields=["subtotal", "total"])

                ShippingAddress.objects.create(
                    order=order,
                    full_name=rng.choice(NAMES),
                    phone=f"0{rng.choice(['5', '6', '7'])}{rng.randint(10000000, 99999999)}",
                    wilaya=rng.choice(wilayas),
                    commune=rng.choice(COMMUNES),
                    address=f"{rng.randint(1, 200)} Rue de la République",
                )
                # created_at is auto_now_add — backdate it explicitly.
                Order.objects.filter(pk=order.pk).update(created_at=when)
                created += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded {created} demo orders."))
