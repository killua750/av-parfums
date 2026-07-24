from decimal import Decimal

from rest_framework import serializers

from apps.catalog.models import (
    Category,
    Product,
    ProductImage,
    ProductVariant,
    StockMovement,
)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "image_md", "image_sm", "alt", "sort_order"]


class ProductVariantSerializer(serializers.ModelSerializer):
    in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = ["id", "sku", "size", "price", "stock", "in_stock"]

    def validate_price(self, value: Decimal) -> Decimal:
        if value < 0:
            raise serializers.ValidationError("Le prix doit être positif.")
        return value

    def validate_stock(self, value: int) -> int:
        if value < 0:
            raise serializers.ValidationError("Le stock ne peut pas être négatif.")
        return value


class AdminProductVariantSerializer(ProductVariantSerializer):
    """Admin-only: adds cost of revenue + computed margin (never public)."""

    margin_pct = serializers.SerializerMethodField()
    # The parent write serializer replaces variants (delete-then-create), so the
    # implicit UniqueValidator (which runs before the delete) would reject an
    # unchanged SKU. Drop it here; the DB unique constraint remains the guard.
    sku = serializers.CharField(max_length=40, validators=[])

    class Meta(ProductVariantSerializer.Meta):
        fields = ProductVariantSerializer.Meta.fields + ["cost", "margin_pct"]

    def get_margin_pct(self, obj: ProductVariant) -> float:
        price = float(obj.price or 0)
        cost = float(obj.cost or 0)
        return round((price - cost) / price * 100, 1) if price else 0.0


class ProductListSerializer(serializers.ModelSerializer):
    """Compact payload for grids and the hero carousel."""

    category = CategorySerializer(read_only=True)
    price = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    volume = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "tagline",
            "description",
            "volume",
            "tint",
            "category",
            "bottle_image",
            "background_image",
            "price",
            "in_stock",
            "featured",
        ]

    def get_price(self, obj: Product) -> str | None:
        variant = obj.default_variant
        return str(variant.price) if variant else None

    def get_in_stock(self, obj: Product) -> bool:
        return any(v.stock > 0 for v in obj.variants.all())

    def get_volume(self, obj: Product) -> str | None:
        # Hero pill label, e.g. "Brume 200ml" (the default variant's size).
        variant = obj.default_variant
        return variant.size if variant else None


class ProductDetailSerializer(ProductListSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ["images", "variants"]


class AdminProductSerializer(ProductDetailSerializer):
    """Admin list/detail: admin variants (cost/margin) + per-product stats."""

    variants = AdminProductVariantSerializer(many=True, read_only=True)
    units_sold = serializers.SerializerMethodField()
    revenue = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()

    class Meta(ProductDetailSerializer.Meta):
        fields = ProductDetailSerializer.Meta.fields + [
            "views",
            "units_sold",
            "revenue",
            "total_stock",
            "is_active",
        ]

    def _sales(self, obj: Product):
        from django.db.models import F, Sum

        from apps.orders.models import OrderItem, OrderStatus

        # Match by the order-item's product_name snapshot, not the live variant
        # FK: editing a product replaces its variants (and SET_NULLs old order
        # items), which would otherwise zero out the historical sales figures.
        if not hasattr(obj, "_sales_cache"):
            row = (
                OrderItem.objects.filter(product_name=obj.name)
                .exclude(order__status=OrderStatus.CANCELLED)
                .aggregate(u=Sum("quantity"), r=Sum(F("unit_price") * F("quantity")))
            )
            obj._sales_cache = (row["u"] or 0, row["r"] or Decimal("0"))
        return obj._sales_cache

    def get_units_sold(self, obj: Product) -> int:
        return self._sales(obj)[0]

    def get_revenue(self, obj: Product) -> str:
        return str(self._sales(obj)[1])

    def get_total_stock(self, obj: Product) -> int:
        return sum(v.stock for v in obj.variants.all())


class ProductWriteSerializer(serializers.ModelSerializer):
    """Admin CRUD. Variants are managed through nested writes (incl. cost)."""

    variants = AdminProductVariantSerializer(many=True, required=False)

    class Meta:
        model = Product
        fields = [
            "id",
            "category",
            "name",
            "slug",
            "tagline",
            "description",
            "tint",
            "bottle_image",
            "background_image",
            "is_active",
            "featured",
            "variants",
        ]
        extra_kwargs = {"slug": {"required": False}}

    def create(self, validated_data):
        variants = validated_data.pop("variants", [])
        product = Product.objects.create(**validated_data)
        for v in variants:
            ProductVariant.objects.create(product=product, **v)
        return product

    def update(self, instance, validated_data):
        variants = validated_data.pop("variants", None)
        instance = super().update(instance, validated_data)
        if variants is not None:
            # Replace-all semantics keeps the admin form simple and atomic.
            instance.variants.all().delete()
            for v in variants:
                ProductVariant.objects.create(product=instance, **v)
        return instance


class StockMovementSerializer(serializers.ModelSerializer):
    variant_sku = serializers.CharField(source="variant.sku", read_only=True)
    variant_size = serializers.CharField(source="variant.size", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "variant",
            "variant_sku",
            "variant_size",
            "delta",
            "resulting_stock",
            "reason",
            "note",
            "created_at",
        ]
        read_only_fields = ["resulting_stock", "created_at"]
