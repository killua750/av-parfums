from decimal import Decimal

from rest_framework import serializers

from apps.catalog.models import Category, Product, ProductImage, ProductVariant


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


class ProductWriteSerializer(serializers.ModelSerializer):
    """Admin CRUD. Variants are managed through nested writes."""

    variants = ProductVariantSerializer(many=True, required=False)

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
