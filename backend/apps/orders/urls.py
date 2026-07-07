from rest_framework.routers import DefaultRouter

from apps.orders.views import AdminOrderViewSet, OrderViewSet

router = DefaultRouter()
router.register("orders", OrderViewSet, basename="order")
router.register("admin/orders", AdminOrderViewSet, basename="admin-order")

urlpatterns = router.urls
