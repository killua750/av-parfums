from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.catalog.filters import ProductFilter, full_text_search
from apps.catalog.models import Category, Product
from apps.catalog.serializers import (
    CategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductWriteSerializer,
)
from apps.core.permissions import IsAdmin


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """Public catalog: /api/v1/products (list) and /api/v1/products/{slug}."""

    lookup_field = "slug"
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = ProductFilter
    ordering_fields = ["created_at", "name", "variants__price"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = (
            Product.objects.filter(is_active=True)
            .select_related("category")
            .prefetch_related("variants", "images")
        )
        search = self.request.query_params.get("search", "")
        if search:
            qs = full_text_search(qs, search)
        return qs.distinct()

    def get_serializer_class(self):
        return ProductDetailSerializer if self.action == "retrieve" else ProductListSerializer


class AdminProductViewSet(viewsets.ModelViewSet):
    """Full CRUD under /api/v1/admin/products — IsAdmin enforced server-side."""

    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = Product.objects.all().select_related("category").prefetch_related("variants")
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "is_active", "featured"]
    search_fields = ["name", "slug"]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return ProductDetailSerializer
        return ProductWriteSerializer


class AdminCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None
