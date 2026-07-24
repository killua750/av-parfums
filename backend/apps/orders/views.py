from datetime import datetime, time, timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, F, Sum
from django.db.models.functions import (
    ExtractHour,
    ExtractIsoWeekDay,
    TruncDate,
    TruncHour,
    TruncMonth,
)
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

    PRESETS = (
        "today",
        "yesterday",
        "this_week",
        "last_week",
        "this_month",
        "last_month",
        "this_year",
        "custom",
    )

    def _resolve_period(self, now, preset, start_q, end_q):
        """Return (start, end) datetimes for the requested preset. `end` is
        exclusive; in-progress presets (today/this_week/...) end at `now`."""

        def midnight(dt):
            return dt.replace(hour=0, minute=0, second=0, microsecond=0)

        m = midnight(now)
        if preset == "today":
            return m, now
        if preset == "yesterday":
            return m - timedelta(days=1), m
        if preset == "this_week":
            return m - timedelta(days=now.weekday()), now
        if preset == "last_week":
            this_week = m - timedelta(days=now.weekday())
            return this_week - timedelta(days=7), this_week
        if preset == "this_month":
            return m.replace(day=1), now
        if preset == "last_month":
            first = m.replace(day=1)
            prev_last = first - timedelta(days=1)
            return prev_last.replace(day=1), first
        if preset == "this_year":
            return m.replace(month=1, day=1), now
        if preset == "custom":
            try:
                s = datetime.fromisoformat(start_q)
                e = datetime.fromisoformat(end_q)
                tz = timezone.get_current_timezone()
                s = timezone.make_aware(datetime.combine(s.date(), time.min), tz)
                e = timezone.make_aware(datetime.combine(e.date(), time.min), tz) + timedelta(
                    days=1
                )
                return s, e
            except (TypeError, ValueError):
                pass
        return m.replace(day=1), now

    def get(self, request):
        preset = request.query_params.get("period", "this_month")
        if preset not in self.PRESETS:
            preset = "this_month"

        now = timezone.now()
        start, end = self._resolve_period(
            now, preset, request.query_params.get("start"), request.query_params.get("end")
        )
        span = end - start
        prev_start, prev_end = start - span, start

        span_days = span.total_seconds() / 86400
        granularity = "hour" if span_days <= 2 else "day" if span_days <= 92 else "month"

        cents = Decimal("0.01")
        active = Order.objects.exclude(status=OrderStatus.CANCELLED)
        current = active.filter(created_at__gte=start, created_at__lt=end)
        previous = active.filter(created_at__gte=prev_start, created_at__lt=prev_end)

        def window_totals(qs):
            agg = qs.aggregate(revenue=Sum("total"), orders=Count("id"))
            revenue = (agg["revenue"] or Decimal("0")).quantize(cents)
            orders = agg["orders"] or 0
            units = qs.aggregate(u=Sum("items__quantity"))["u"] or 0
            aov = (revenue / orders).quantize(cents) if orders else Decimal("0.00")
            return {"revenue": str(revenue), "orders": orders, "units": units, "aov": str(aov)}

        def cancel_rate(s, e):
            qs = Order.objects.filter(created_at__gte=s, created_at__lt=e)
            total = qs.count()
            if not total:
                return 0.0
            return round(qs.filter(status=OrderStatus.CANCELLED).count() / total * 100, 1)

        trunc = {"hour": TruncHour, "day": TruncDate, "month": TruncMonth}[granularity]
        grouped = {}
        for row in (
            current.annotate(b=trunc("created_at"))
            .values("b")
            .annotate(revenue=Sum("total"), orders=Count("id"))
        ):
            b = row["b"]
            if granularity == "hour":
                key = timezone.localtime(b).strftime("%Y-%m-%dT%H")
            elif granularity == "month":
                key = b.strftime("%Y-%m")
            else:
                key = b.isoformat()
            grouped[key] = row

        series = []
        cursor = timezone.localtime(start) if granularity == "hour" else start
        guard = 0
        while cursor < end and guard < 1000:
            guard += 1
            if granularity == "hour":
                key = cursor.strftime("%Y-%m-%dT%H")
                iso = cursor.isoformat()
                nxt = cursor + timedelta(hours=1)
            elif granularity == "month":
                key = cursor.strftime("%Y-%m")
                iso = cursor.date().replace(day=1).isoformat()
                nxt = (cursor.replace(day=1) + timedelta(days=32)).replace(day=1)
            else:
                key = cursor.date().isoformat()
                iso = key
                nxt = cursor + timedelta(days=1)
            row = grouped.get(key)
            series.append(
                {
                    "bucket": iso,
                    "revenue": str((row["revenue"] if row else Decimal("0")).quantize(cents)),
                    "orders": row["orders"] if row else 0,
                }
            )
            cursor = nxt

        status_counts = {
            row["status"]: row["n"]
            for row in Order.objects.filter(created_at__gte=start, created_at__lt=end)
            .values("status")
            .annotate(n=Count("id"))
        }

        item_qs = OrderItem.objects.filter(
            order__created_at__gte=start, order__created_at__lt=end
        ).exclude(order__status=OrderStatus.CANCELLED)

        def products_by(order_field):
            return [
                {
                    "name": r["product_name"],
                    "units": r["units"],
                    "revenue": str((r["revenue"] or Decimal("0")).quantize(cents)),
                }
                for r in item_qs.values("product_name")
                .annotate(units=Sum("quantity"), revenue=Sum(F("unit_price") * F("quantity")))
                .order_by(order_field)[:8]
            ]

        top_products = products_by("-revenue")
        top_products_qty = products_by("-units")

        top_wilayas = [
            {
                "name": r["shipping_address__wilaya__name"],
                "orders": r["orders"],
                "revenue": str((r["revenue"] or Decimal("0")).quantize(cents)),
            }
            for r in current.filter(shipping_address__isnull=False)
            .values("shipping_address__wilaya__name")
            .annotate(orders=Count("id"), revenue=Sum("total"))
            .order_by("-revenue")[:10]
        ]

        heatmap = [
            {"dow": r["dow"], "hour": r["hour"], "count": r["n"]}
            for r in current.annotate(
                dow=ExtractIsoWeekDay("created_at"), hour=ExtractHour("created_at")
            )
            .values("dow", "hour")
            .annotate(n=Count("id"))
        ]

        user_model = get_user_model()
        customers = user_model.objects.filter(is_active=True)
        buyer_counts = list(
            active.filter(user__isnull=False).values("user").annotate(n=Count("id"))
        )
        buyers = len(buyer_counts)
        repeat = sum(1 for b in buyer_counts if b["n"] > 1)

        low_stock = [
            {"product": v.product.name, "size": v.size, "sku": v.sku, "stock": v.stock}
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
                "customer": o.shipping_address.full_name if hasattr(o, "shipping_address") else "",
                "items_count": sum(i.quantity for i in o.items.all()),
            }
            for o in Order.objects.prefetch_related("items")
            .select_related("shipping_address")
            .order_by("-created_at")[:8]
        ]

        return Response(
            {
                "period": {
                    "preset": preset,
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                    "granularity": granularity,
                },
                "totals": {
                    "current": window_totals(current),
                    "previous": window_totals(previous),
                    "revenue_all_time": str(
                        (active.aggregate(r=Sum("total"))["r"] or Decimal("0")).quantize(cents)
                    ),
                    "customers": customers.count(),
                    "new_customers": customers.filter(
                        date_joined__gte=start, date_joined__lt=end
                    ).count(),
                    "new_customers_prev": customers.filter(
                        date_joined__gte=prev_start, date_joined__lt=prev_end
                    ).count(),
                    "recurring_rate": round(repeat / buyers * 100, 1) if buyers else 0.0,
                    "open_orders": Order.objects.filter(
                        status__in=[OrderStatus.PENDING, OrderStatus.CONFIRMED]
                    ).count(),
                    "cancel_rate": cancel_rate(start, end),
                    "cancel_rate_prev": cancel_rate(prev_start, prev_end),
                },
                "series": series,
                "status_counts": status_counts,
                "top_products": top_products,
                "top_products_qty": top_products_qty,
                "top_wilayas": top_wilayas,
                "heatmap": heatmap,
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

        update_fields = ["status", "updated_at"]
        with transaction.atomic():
            if new_status == OrderStatus.CANCELLED:
                order.cancel_reason = serializer.validated_data.get("cancel_reason", "")
                update_fields.append("cancel_reason")
                # Return reserved stock when an order is called off.
                for item in order.items.select_related("variant"):
                    if item.variant_id:
                        type(item.variant).objects.filter(pk=item.variant_id).update(
                            stock=F("stock") + item.quantity
                        )
            order.status = new_status
            order.save(update_fields=update_fields)

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
