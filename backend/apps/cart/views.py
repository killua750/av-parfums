from django.db.models import F
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cart.models import CartItem
from apps.cart.serializers import (
    AddCartItemSerializer,
    CartSerializer,
    UpdateCartItemSerializer,
)
from apps.cart.services import get_or_create_cart
from apps.catalog.models import ProductVariant


class CartView(APIView):
    """GET  /api/v1/cart/        → current cart (guest or user)
    DELETE /api/v1/cart/        → empty it"""

    def get(self, request):
        cart = get_or_create_cart(request)
        return Response(CartSerializer(cart).data)

    def delete(self, request):
        cart = get_or_create_cart(request)
        cart.items.all().delete()
        return Response(CartSerializer(cart).data)


class CartItemsView(APIView):
    """POST /api/v1/cart/items/ → add a variant (quantities merge)."""

    def post(self, request):
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cart = get_or_create_cart(request)
        variant = ProductVariant.objects.get(pk=serializer.validated_data["variant_id"])
        item, created = CartItem.objects.get_or_create(
            cart=cart,
            variant=variant,
            defaults={"quantity": serializer.validated_data["quantity"]},
        )
        if not created:
            item.quantity = F("quantity") + serializer.validated_data["quantity"]
            item.save(update_fields=["quantity"])
            item.refresh_from_db()
            if item.quantity > variant.stock:
                item.quantity = variant.stock
                item.save(update_fields=["quantity"])
        cart.refresh_from_db()
        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    """PATCH/DELETE /api/v1/cart/items/{id}/ — quantity 0 removes the line."""

    def _get_item(self, request, item_id: int) -> CartItem | None:
        cart = get_or_create_cart(request)
        return cart.items.filter(pk=item_id).first()

    def patch(self, request, item_id: int):
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = self._get_item(request, item_id)
        if item is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        qty = serializer.validated_data["quantity"]
        if qty == 0:
            item.delete()
        else:
            item.quantity = min(qty, item.variant.stock)
            item.save(update_fields=["quantity"])
        cart = get_or_create_cart(request)
        return Response(CartSerializer(cart).data)

    def delete(self, request, item_id: int):
        item = self._get_item(request, item_id)
        if item is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        item.delete()
        cart = get_or_create_cart(request)
        return Response(CartSerializer(cart).data)
