from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.catalog.models import ProductVariant
from apps.core.models import TimeStampedModel


class Cart(TimeStampedModel):
    """One cart per authenticated user, or per anonymous session (session_key).
    A guest cart is merged into the user cart on login (see services.merge_carts)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="cart",
    )
    # NULL (not "") is deliberate: the cart_has_owner_or_session CHECK relies
    # on isnull semantics to tell guest carts from user carts.
    session_key = models.CharField(max_length=40, null=True, blank=True, db_index=True)  # noqa: DJ001

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(user__isnull=False) | models.Q(session_key__isnull=False),
                name="cart_has_owner_or_session",
            ),
        ]

    def __str__(self) -> str:
        return f"Cart<{self.user or self.session_key}>"

    @property
    def subtotal(self) -> Decimal:
        return sum(
            (item.variant.price * item.quantity for item in self.items.all()),
            Decimal("0"),
        )


class CartItem(TimeStampedModel):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name="+")
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["cart", "variant"], name="uniq_cart_variant"),
            models.CheckConstraint(condition=models.Q(quantity__gt=0), name="cartitem_qty_gt_0"),
        ]

    def __str__(self) -> str:
        return f"{self.variant} × {self.quantity}"
