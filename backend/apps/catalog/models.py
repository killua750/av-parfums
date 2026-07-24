from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.utils.text import slugify

from apps.core.models import TimeStampedModel

hex_color_validator = RegexValidator(
    regex=r"^#[0-9A-Fa-f]{6}$", message="Couleur au format #RRGGBB."
)


class Category(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class Product(TimeStampedModel):
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="products", db_index=True
    )
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=170, unique=True, db_index=True)
    tagline = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    # Visual identity of the hero carousel: per-product accent color and imagery.
    tint = models.CharField(max_length=7, default="#888888", validators=[hex_color_validator])
    bottle_image = models.ImageField(upload_to="products/bottles/", blank=True, null=True)
    background_image = models.ImageField(upload_to="products/backgrounds/", blank=True, null=True)
    is_active = models.BooleanField(default=True, db_index=True)
    featured = models.BooleanField(default=False, help_text="Shown in the home hero carousel.")
    views = models.PositiveIntegerField(default=0, help_text="Detail-page view counter.")

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["slug"]), models.Index(fields=["category"])]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name

    @property
    def default_variant(self) -> "ProductVariant | None":
        return self.variants.order_by("price").first()


class ProductImage(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/gallery/")
    # Responsive copies generated asynchronously by Celery (Pillow).
    image_md = models.ImageField(upload_to="products/gallery/md/", blank=True, null=True)
    image_sm = models.ImageField(upload_to="products/gallery/sm/", blank=True, null=True)
    alt = models.CharField(max_length=200, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        return f"{self.product.name} #{self.pk}"


class ProductVariant(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    sku = models.CharField(max_length=40, unique=True)
    size = models.CharField(max_length=40)  # e.g. "Brume 200ml"
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Cost of revenue, for automatic margin.",
    )
    stock = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["price"]
        constraints = [
            models.UniqueConstraint(fields=["product", "size"], name="uniq_variant_product_size"),
            models.CheckConstraint(condition=models.Q(price__gte=0), name="variant_price_gte_0"),
        ]

    def __str__(self) -> str:
        return f"{self.product.name} — {self.size}"

    @property
    def in_stock(self) -> bool:
        return self.stock > 0


class StockMovement(models.Model):
    """Timestamped stock entry/exit ledger per variant, for stock history and
    low-stock auditing. `delta` is positive for restocks, negative for exits."""

    class Reason(models.TextChoices):
        RESTOCK = "restock", "Réapprovisionnement"
        CORRECTION = "correction", "Correction d'inventaire"
        DAMAGE = "damage", "Casse / perte"
        RETURN = "return", "Retour client"

    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name="movements")
    delta = models.IntegerField(help_text="Positive = entrée, négative = sortie.")
    resulting_stock = models.PositiveIntegerField()
    reason = models.CharField(max_length=20, choices=Reason.choices, default=Reason.RESTOCK)
    note = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.variant.sku} {self.delta:+d} ({self.reason})"
