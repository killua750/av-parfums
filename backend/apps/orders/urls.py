from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.orders.views import (
    AdminCustomerOrdersView,
    AdminCustomersView,
    AdminDashboardView,
    AdminOrderViewSet,
    OrderViewSet,
)

router = DefaultRouter()
router.register("orders", OrderViewSet, basename="order")
router.register("admin/orders", AdminOrderViewSet, basename="admin-order")

urlpatterns = [
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("admin/customers/", AdminCustomersView.as_view(), name="admin-customers"),
    path(
        "admin/customers/orders/",
        AdminCustomerOrdersView.as_view(),
        name="admin-customer-orders",
    ),
    *router.urls,
]
