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
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    promo = models.ForeignKey(
        "PromoCode", on_delete=models.SET_NULL, null=True, blank=True, related_name="orders"
    )
    cancel_reason = models.CharField(max_length=200, blank=True)

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


class PromoCode(models.Model):
    """Discount code: percentage, fixed amount, or free shipping — with an
    optional minimum order, expiry, and global / per-customer usage caps."""

    class Kind(models.TextChoices):
        PERCENT = "percent", "Pourcentage"
        FIXED = "fixed", "Montant fixe"
        FREE_SHIPPING = "free_shipping", "Livraison gratuite"

    code = models.CharField(max_length=32, unique=True)
    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.PERCENT)
    value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, help_text="Percent (0-100) or DA amount."
    )
    min_order = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expires_at = models.DateField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True, help_text="Global cap.")
    per_customer_limit = models.PositiveIntegerField(default=0, help_text="0 = unlimited.")
    is_active = models.BooleanField(default=True)
    used_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.code

    def save(self, *args, **kwargs):
        self.code = self.code.upper().strip()
        super().save(*args, **kwargs)

    def discount_for(self, subtotal, phone=""):
        """Return (discount_amount, error_message). error is None when valid.
        Shipping is billed at delivery (COD), so free_shipping yields 0 here but
        still validates as an applicable code."""
        from datetime import date
        from decimal import Decimal

        if not self.is_active:
            return Decimal("0"), "Code inactif."
        if self.expires_at and self.expires_at < date.today():
            return Decimal("0"), "Code expiré."
        if self.usage_limit is not None and self.used_count >= self.usage_limit:
            return Decimal("0"), "Code épuisé."
        if subtotal < self.min_order:
            return Decimal("0"), f"Minimum {self.min_order} DA requis."
        if self.per_customer_limit and phone:
            used = self.redemptions.filter(phone=phone).count()
            if used >= self.per_customer_limit:
                return Decimal("0"), "Limite d'utilisation atteinte."

        if self.kind == self.Kind.PERCENT:
            discount = (subtotal * self.value / Decimal("100")).quantize(Decimal("0.01"))
        elif self.kind == self.Kind.FIXED:
            discount = min(self.value, subtotal)
        else:  # free_shipping — shipping is paid at delivery, no cart-time cut
            discount = Decimal("0")
        return discount, None


class PromoRedemption(models.Model):
    """One row per successful application — powers usage tracking, per-customer
    limits, and the revenue-attributed-to-code figure."""

    promo = models.ForeignKey(PromoCode, on_delete=models.CASCADE, related_name="redemptions")
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="redemption")
    phone = models.CharField(max_length=13, blank=True, db_index=True)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.promo.code} → {self.order.number}"
