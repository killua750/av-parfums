from decimal import Decimal

from django.conf import settings
from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import algerian_phone_validator
from apps.catalog.models import ProductVariant
from apps.core.models import Wilaya
from apps.orders.models import Order, OrderItem, OrderStatus, PromoCode, ShippingAddress
from apps.payments.models import Payment


class ShippingAddressSerializer(serializers.ModelSerializer):
    wilaya = serializers.PrimaryKeyRelatedField(queryset=Wilaya.objects.all())
    wilaya_name = serializers.CharField(source="wilaya.name", read_only=True)

    class Meta:
        model = ShippingAddress
        fields = ["full_name", "phone", "wilaya", "wilaya_name", "commune", "address"]

    def validate_phone(self, value: str) -> str:
        value = value.replace(" ", "")
        algerian_phone_validator(value)
        return value

    def validate_full_name(self, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Nom trop court.")
        return value


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["id", "variant", "product_name", "variant_size", "unit_price", "quantity"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    shipping_address = ShippingAddressSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "number",
            "status",
            "subtotal",
            "shipping_fee",
            "discount",
            "total",
            "cancel_reason",
            "items",
            "shipping_address",
            "created_at",
        ]


class OrderItemInputSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class OrderCreateSerializer(serializers.Serializer):
    """COD checkout. Prices and totals are computed server-side from the DB —
    anything price-like sent by the client is ignored."""

    items = OrderItemInputSerializer(many=True, allow_empty=False)
    shipping_address = ShippingAddressSerializer()
    promo_code = serializers.CharField(required=False, allow_blank=True)

    def validate_items(self, items):
        seen: set[int] = set()
        for item in items:
            if item["variant_id"] in seen:
                raise serializers.ValidationError("Ligne dupliquée pour la même variante.")
            seen.add(item["variant_id"])
        return items

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        address_data = validated_data["shipping_address"]
        items_data = validated_data["items"]

        variant_ids = [i["variant_id"] for i in items_data]
        # Row locks so two simultaneous checkouts can't oversell the last unit.
        variants = {
            v.pk: v
            for v in ProductVariant.objects.select_for_update()
            .select_related("product")
            .filter(pk__in=variant_ids, product__is_active=True)
        }

        errors: list[str] = []
        for item in items_data:
            variant = variants.get(item["variant_id"])
            if variant is None:
                errors.append(f"Variante {item['variant_id']} indisponible.")
            elif variant.stock < item["quantity"]:
                errors.append(
                    f"Stock insuffisant pour {variant.product.name} ({variant.stock} restant)."
                )
        if errors:
            raise serializers.ValidationError({"items": errors})

        order = Order.objects.create(user=request.user if request.user.is_authenticated else None)
        ShippingAddress.objects.create(order=order, **address_data)

        subtotal = Decimal("0")
        low_stock: list[int] = []
        for item in items_data:
            variant = variants[item["variant_id"]]
            OrderItem.objects.create(
                order=order,
                variant=variant,
                product_name=variant.product.name,
                variant_size=variant.size,
                unit_price=variant.price,
                quantity=item["quantity"],
            )
            variant.stock -= item["quantity"]
            variant.save(update_fields=["stock"])
            if variant.stock <= settings.LOW_STOCK_THRESHOLD:
                low_stock.append(variant.pk)
            subtotal += variant.price * item["quantity"]

        order.subtotal = subtotal
        order.shipping_fee = Decimal("0")  # COD: shipping billed at delivery

        # Apply a promo code if one was supplied and passes validation.
        discount = Decimal("0")
        code = (validated_data.get("promo_code") or "").strip().upper()
        if code:
            from django.db.models import F

            from apps.orders.models import PromoCode, PromoRedemption

            promo = PromoCode.objects.filter(code=code).first()
            if promo:
                amount, error = promo.discount_for(subtotal, address_data.get("phone", ""))
                if error is None:
                    discount = amount
                    order.promo = promo
                    PromoRedemption.objects.create(
                        promo=promo,
                        order=order,
                        phone=address_data.get("phone", ""),
                        discount=discount,
                    )
                    PromoCode.objects.filter(pk=promo.pk).update(used_count=F("used_count") + 1)

        order.discount = discount
        order.total = subtotal - discount + order.shipping_fee
        order.save(update_fields=["subtotal", "shipping_fee", "discount", "total", "promo"])

        Payment.objects.create(order=order, method=Payment.Method.COD, amount=order.total)

        # Notify only once the transaction is committed (tasks read the DB).
        from apps.notifications.tasks import notify_low_stock, send_order_confirmation

        transaction.on_commit(lambda: send_order_confirmation.delay(order.pk))
        for variant_pk in low_stock:
            transaction.on_commit(lambda pk=variant_pk: notify_low_stock.delay(pk))
        return order

    def to_representation(self, instance: Order):
        return OrderSerializer(instance, context=self.context).data


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OrderStatus.choices)
    cancel_reason = serializers.CharField(max_length=200, required=False, allow_blank=True)

    def validate_status(self, value: str) -> str:
        order: Order = self.context["order"]
        if not order.can_transition_to(value):
            raise serializers.ValidationError(f"Transition invalide: {order.status} → {value}.")
        return value

    def validate(self, attrs):
        if attrs["status"] == OrderStatus.CANCELLED and not attrs.get("cancel_reason", "").strip():
            raise serializers.ValidationError(
                {"cancel_reason": "Le motif d'annulation est obligatoire."}
            )
        return attrs


class PromoCodeSerializer(serializers.ModelSerializer):
    """Admin CRUD for discount codes + live usage/revenue attribution."""

    revenue = serializers.SerializerMethodField()

    class Meta:
        model = PromoCode
        fields = [
            "id",
            "code",
            "kind",
            "value",
            "min_order",
            "expires_at",
            "usage_limit",
            "per_customer_limit",
            "is_active",
            "used_count",
            "revenue",
            "created_at",
        ]
        read_only_fields = ["used_count", "created_at"]

    def get_revenue(self, obj: PromoCode) -> str:
        from django.db.models import Sum

        total = obj.orders.exclude(status=OrderStatus.CANCELLED).aggregate(r=Sum("total"))["r"]
        return str(total or Decimal("0"))
