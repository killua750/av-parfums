from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, F, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import ProductVariant
from apps.core.permissions import IsAdmin, IsOwnerOrAdmin
from apps.orders.models import Order, OrderItem, OrderStatus
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


class AdminDashboardView(APIView):
    """GET /api/v1/admin/dashboard/?days=30 — aggregated KPIs for the back office.

    Revenue figures exclude cancelled orders. Every "prev" figure covers the
    equal-length window immediately before the selected one, so the frontend
    can render period-over-period deltas.
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        try:
            days = int(request.query_params.get("days", 30))
        except (TypeError, ValueError):
            days = 30
        days = max(1, min(days, 365))

        now = timezone.now()
        start = now - timedelta(days=days)
        prev_start = start - timedelta(days=days)

        active = Order.objects.exclude(status=OrderStatus.CANCELLED)
        current = active.filter(created_at__gte=start)
        previous = active.filter(created_at__gte=prev_start, created_at__lt=start)

        cents = Decimal("0.01")

        def window_totals(qs) -> dict:
            agg = qs.aggregate(revenue=Sum("total"), orders=Count("id"))
            revenue: Decimal = (agg["revenue"] or Decimal("0")).quantize(cents)
            orders: int = agg["orders"] or 0
            aov = (revenue / orders).quantize(cents) if orders else Decimal("0.00")
            return {"revenue": str(revenue), "orders": orders, "aov": str(aov)}

        user_model = get_user_model()
        customers = user_model.objects.filter(is_active=True)

        # Daily revenue/order series with zero-filled gaps for the chart.
        rows = {
            row["day"]: row
            for row in current.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(revenue=Sum("total"), orders=Count("id"))
        }
        series = []
        for offset in range(days - 1, -1, -1):
            day = (now - timedelta(days=offset)).date()
            row = rows.get(day)
            series.append(
                {
                    "date": day.isoformat(),
                    "revenue": str((row["revenue"] if row else Decimal("0")).quantize(cents)),
                    "orders": row["orders"] if row else 0,
                }
            )

        status_counts = {
            row["status"]: row["n"]
            for row in Order.objects.filter(created_at__gte=start)
            .values("status")
            .annotate(n=Count("id"))
        }

        top_products = [
            {
                "name": row["product_name"],
                "units": row["units"],
                "revenue": str((row["revenue"] or Decimal("0")).quantize(cents)),
            }
            for row in OrderItem.objects.filter(
                order__created_at__gte=start,
            )
            .exclude(order__status=OrderStatus.CANCELLED)
            .values("product_name")
            .annotate(units=Sum("quantity"), revenue=Sum(F("unit_price") * F("quantity")))
            .order_by("-revenue")[:6]
        ]

        # Revenue by delivery wilaya (period, cancelled excluded) — shows where
        # demand concentrates geographically.
        top_wilayas = [
            {
                "name": row["shipping_address__wilaya__name"],
                "orders": row["orders"],
                "revenue": str((row["revenue"] or Decimal("0")).quantize(cents)),
            }
            for row in current.filter(shipping_address__isnull=False)
            .values("shipping_address__wilaya__name")
            .annotate(orders=Count("id"), revenue=Sum("total"))
            .order_by("-revenue")[:6]
        ]

        low_stock = [
            {
                "product": v.product.name,
                "size": v.size,
                "sku": v.sku,
                "stock": v.stock,
            }
            for v in ProductVariant.objects.select_related("product")
            .filter(stock__lte=settings.LOW_STOCK_THRESHOLD)
            .order_by("stock")[:8]
        ]

        recent_orders = [
            {
                "number": o.number,
                "created_at": o.created_at.isoformat(),
                "status": o.status,
                "total": str(o.total),
                "customer": (
                    o.shipping_address.full_name if hasattr(o, "shipping_address") else ""
                ),
                "items_count": sum(i.quantity for i in o.items.all()),
            }
            for o in Order.objects.prefetch_related("items")
            .select_related("shipping_address")
            .order_by("-created_at")[:8]
        ]

        return Response(
            {
                "period_days": days,
                "totals": {
                    "current": window_totals(current),
                    "previous": window_totals(previous),
                    "customers": customers.count(),
                    "new_customers": customers.filter(date_joined__gte=start).count(),
                    "new_customers_prev": customers.filter(
                        date_joined__gte=prev_start, date_joined__lt=start
                    ).count(),
                    "open_orders": Order.objects.filter(
                        status__in=[OrderStatus.PENDING, OrderStatus.CONFIRMED]
                    ).count(),
                },
                "series": series,
                "status_counts": status_counts,
                "top_products": top_products,
                "top_wilayas": top_wilayas,
                "low_stock": low_stock,
                "recent_orders": recent_orders,
            }
        )


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
