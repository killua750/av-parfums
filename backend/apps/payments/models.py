from django.db import models

from apps.core.models import TimeStampedModel
from apps.orders.models import Order


class Payment(TimeStampedModel):
    """Payment record per order. Today only Cash-on-Delivery exists; the model
    is the extension point for CIB/Edahabia or card gateways later."""

    class Method(models.TextChoices):
        COD = "cod", "Paiement à la livraison"

    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        PAID = "paid", "Payé"
        REFUNDED = "refunded", "Remboursé"

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="payment")
    method = models.CharField(max_length=16, choices=Method.choices, default=Method.COD)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self) -> str:
        return f"{self.order.number} — {self.get_method_display()} ({self.status})"
