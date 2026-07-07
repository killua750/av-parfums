from rest_framework.routers import DefaultRouter

from apps.catalog.views import (
    AdminCategoryViewSet,
    AdminProductViewSet,
    CategoryViewSet,
    ProductViewSet,
)

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("categories", CategoryViewSet, basename="category")
router.register("admin/products", AdminProductViewSet, basename="admin-product")
router.register("admin/categories", AdminCategoryViewSet, basename="admin-category")

urlpatterns = router.urls
