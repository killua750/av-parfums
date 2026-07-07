from django.contrib import admin
from django.db import transaction
from django.db.models import F

from apps.orders.models import Order, OrderItem, OrderStatus, ShippingAddress


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product_name", "variant_size", "unit_price", "quantity"]
    can_delete = False


class ShippingAddressInline(admin.StackedInline):
    model = ShippingAddress
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["number", "customer", "status", "total", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["number", "shipping_address__full_name", "shipping_address__phone"]
    readonly_fields = ["number", "subtotal", "shipping_fee", "total"]
    inlines = [ShippingAddressInline, OrderItemInline]
    actions = ["mark_confirmed", "mark_shipped", "mark_delivered", "mark_cancelled"]

    @admin.display(description="Client")
    def customer(self, obj: Order) -> str:
        if obj.user:
            return obj.user.email
        addr = getattr(obj, "shipping_address", None)
        return addr.full_name if addr else "—"

    def _transition(self, request, queryset, new_status: str) -> None:
        skipped = 0
        for order in queryset:
            if not order.can_transition_to(new_status):
                skipped += 1
                continue
            with transaction.atomic():
                if new_status == OrderStatus.CANCELLED:
                    for item in order.items.select_related("variant"):
                        if item.variant_id:
                            type(item.variant).objects.filter(pk=item.variant_id).update(
                                stock=F("stock") + item.quantity
                            )
                order.status = new_status
                order.save(update_fields=["status", "updated_at"])
        if skipped:
            self.message_user(request, f"{skipped} commande(s) ignorée(s): transition invalide.")

    @admin.action(description="Marquer comme confirmée")
    def mark_confirmed(self, request, queryset):
        self._transition(request, queryset, OrderStatus.CONFIRMED)

    @admin.action(description="Marquer comme expédiée")
    def mark_shipped(self, request, queryset):
        self._transition(request, queryset, OrderStatus.SHIPPED)

    @admin.action(description="Marquer comme livrée")
    def mark_delivered(self, request, queryset):
        self._transition(request, queryset, OrderStatus.DELIVERED)

    @admin.action(description="Annuler (restock)")
    def mark_cancelled(self, request, queryset):
        self._transition(request, queryset, OrderStatus.CANCELLED)
