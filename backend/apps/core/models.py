from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Wilaya(models.Model):
    """Reference table for the 58 Algerian wilayas (seeded via fixture)."""

    code = models.PositiveSmallIntegerField(unique=True)
    name = models.CharField(max_length=64)
    name_ar = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["code"]
        verbose_name_plural = "wilayas"

    def __str__(self) -> str:
        return f"{self.code:02d} - {self.name}"


class StoreSettings(models.Model):
    """Singleton row (pk=1) holding owner-configurable store settings —
    notably the single WhatsApp number every order message routes to."""

    whatsapp_number = models.CharField(
        max_length=20, blank=True, help_text="International format without +, e.g. 213550000000"
    )
    store_name = models.CharField(max_length=120, default="AV Parfums")
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    instagram = models.CharField(max_length=200, blank=True)
    free_shipping_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    vip_threshold = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=20000,
        help_text="Total spend (DA) above which a customer is flagged VIP.",
    )

    class Meta:
        verbose_name = "store settings"
        verbose_name_plural = "store settings"

    def __str__(self) -> str:
        return "Store settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> "StoreSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
