from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.orders.views import (
    AdminCustomerOrdersView,
    AdminCustomersView,
    AdminDashboardView,
    AdminOrderViewSet,
    AdminPromoViewSet,
    OrderViewSet,
    PromoValidateView,
)

router = DefaultRouter()
router.register("orders", OrderViewSet, basename="order")
router.register("admin/orders", AdminOrderViewSet, basename="admin-order")
router.register("admin/promos", AdminPromoViewSet, basename="admin-promo")

urlpatterns = [
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("admin/customers/", AdminCustomersView.as_view(), name="admin-customers"),
    path(
        "admin/customers/orders/",
        AdminCustomerOrdersView.as_view(),
        name="admin-customer-orders",
    ),
    path("promo/validate/", PromoValidateView.as_view(), name="promo-validate"),
    *router.urls,
]
