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
