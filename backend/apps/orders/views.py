from django.db import transaction
from django.db.models import F
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsAdmin, IsOwnerOrAdmin
from apps.orders.models import Order, OrderStatus
from apps.orders.serializers import (
    OrderCreateSerializer,
    OrderSerializer,
    OrderStatusUpdateSerializer,
)


class OrderViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """POST /orders (guest or user checkout), GET /orders (own history),
    GET /orders/{number} (owner or admin)."""

    lookup_field = "number"
    throttle_scope = "orders"

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        if self.action == "retrieve":
            return [IsAuthenticated(), IsOwnerOrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        return OrderCreateSerializer if self.action == "create" else OrderSerializer

    def get_queryset(self):
        qs = Order.objects.prefetch_related("items").select_related(
            "shipping_address__wilaya", "user"
        )
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.is_admin_role and self.action == "retrieve":
            return qs
        return qs.filter(user=user)

    def get_throttles(self):
        # Only the (guest-accessible) create endpoint needs the scoped limit.
        if self.action != "create":
            self.throttle_scope = ""  # type: ignore[assignment]
        return super().get_throttles()


class AdminOrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Back-office: /api/v1/admin/orders + status transition action."""

    permission_classes = [IsAdmin]
    serializer_class = OrderSerializer
    lookup_field = "number"
    queryset = Order.objects.prefetch_related("items").select_related(
        "shipping_address__wilaya", "user"
    )
    filterset_fields = ["status"]
    search_fields = ["number", "shipping_address__full_name", "shipping_address__phone"]
    ordering_fields = ["created_at", "total"]

    @action(detail=True, methods=["post"], url_path="status")
    def set_status(self, request, number: str | None = None):
        order = self.get_object()
        serializer = OrderStatusUpdateSerializer(data=request.data, context={"order": order})
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]

        with transaction.atomic():
            if new_status == OrderStatus.CANCELLED:
                # Return reserved stock when an order is called off.
                for item in order.items.select_related("variant"):
                    if item.variant_id:
                        type(item.variant).objects.filter(pk=item.variant_id).update(
                            stock=F("stock") + item.quantity
                        )
            order.status = new_status
            order.save(update_fields=["status", "updated_at"])

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
