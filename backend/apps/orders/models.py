import secrets

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.accounts.models import algerian_phone_validator
from apps.catalog.models import ProductVariant
from apps.core.models import TimeStampedModel, Wilaya


class OrderStatus(models.TextChoices):
    PENDING = "pending", "En attente"
    CONFIRMED = "confirmed", "Confirmée"
    SHIPPED = "shipped", "Expédiée"
    DELIVERED = "delivered", "Livrée"
    CANCELLED = "cancelled", "Annulée"


# Forward-only transitions + cancellation while not yet shipped.
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
    OrderStatus.DELIVERED: set(),
    OrderStatus.CANCELLED: set(),
}


def generate_order_number() -> str:
    return f"AV-{secrets.token_hex(4).upper()}"


class Order(TimeStampedModel):
    number = models.CharField(max_length=16, unique=True, default=generate_order_number)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        db_index=True,
    )
    status = models.CharField(
        max_length=16, choices=OrderStatus.choices, default=OrderStatus.PENDING, db_index=True
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user"]), models.Index(fields=["status"])]

    def __str__(self) -> str:
        return self.number

    def can_transition_to(self, new_status: str) -> bool:
        return new_status in ALLOWED_TRANSITIONS.get(self.status, set())


class ShippingAddress(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="shipping_address")
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=13, validators=[algerian_phone_validator])
    wilaya = models.ForeignKey(Wilaya, on_delete=models.PROTECT, related_name="+")
    commune = models.CharField(max_length=120)
    address = models.CharField(max_length=255)

    class Meta:
        verbose_name_plural = "shipping addresses"

    def __str__(self) -> str:
        return f"{self.full_name} — {self.wilaya}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items", db_index=True)
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    # Snapshots: an order must stay intact even if the catalog changes later.
    product_name = models.CharField(max_length=150)
    variant_size = models.CharField(max_length=40)
    unit_price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    quantity = models.PositiveIntegerField()

    class Meta:
        indexes = [models.Index(fields=["order"])]
        constraints = [
            models.CheckConstraint(condition=models.Q(quantity__gt=0), name="orderitem_qty_gt_0"),
            models.CheckConstraint(
                condition=models.Q(unit_price__gte=0), name="orderitem_price_gte_0"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.product_name} × {self.quantity}"
