from rest_framework import serializers

from apps.cart.models import Cart, CartItem
from apps.catalog.models import ProductVariant
from apps.catalog.serializers import ProductVariantSerializer


class CartItemProductSerializer(serializers.Serializer):
    """Denormalized product info so the drawer can render without extra calls."""

    id = serializers.IntegerField(source="product.id")
    name = serializers.CharField(source="product.name")
    slug = serializers.CharField(source="product.slug")
    tint = serializers.CharField(source="product.tint")
    bottle_image = serializers.ImageField(source="product.bottle_image")


class CartItemSerializer(serializers.ModelSerializer):
    variant = ProductVariantSerializer(read_only=True)
    product = CartItemProductSerializer(source="variant", read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "variant", "product", "quantity", "line_total"]

    def get_line_total(self, obj: CartItem) -> str:
        return str(obj.variant.price * obj.quantity)


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "subtotal", "count", "updated_at"]

    def get_subtotal(self, obj: Cart) -> str:
        return str(obj.subtotal)

    def get_count(self, obj: Cart) -> int:
        return sum(item.quantity for item in obj.items.all())


class AddCartItemSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=99, default=1)

    def validate_variant_id(self, value: int) -> int:
        if not ProductVariant.objects.filter(pk=value, product__is_active=True).exists():
            raise serializers.ValidationError("Produit introuvable ou indisponible.")
        return value

    def validate(self, attrs):
        variant = ProductVariant.objects.get(pk=attrs["variant_id"])
        if variant.stock < attrs["quantity"]:
            raise serializers.ValidationError(
                {"quantity": f"Stock insuffisant ({variant.stock} restant)."}
            )
        return attrs


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=0, max_value=99)
