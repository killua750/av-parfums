from django.db.models import F
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.catalog.filters import ProductFilter, full_text_search
from apps.catalog.models import Category, Product, ProductVariant, StockMovement
from apps.catalog.serializers import (
    AdminProductSerializer,
    CategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ProductWriteSerializer,
    StockMovementSerializer,
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

    def retrieve(self, request, *args, **kwargs):
        # Count product-detail views (best-effort, race-free via F()).
        instance = self.get_object()
        Product.objects.filter(pk=instance.pk).update(views=F("views") + 1)
        return Response(self.get_serializer(instance).data)


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
            return AdminProductSerializer
        return ProductWriteSerializer

    @action(detail=True, methods=["get", "post"])
    def stock(self, request, pk=None):
        """GET: recent stock movements for the product's variants.
        POST {variant_id, delta, reason, note}: adjust stock + log a movement."""
        product = self.get_object()
        if request.method == "GET":
            movements = StockMovement.objects.filter(variant__product=product).select_related(
                "variant"
            )[:50]
            return Response(StockMovementSerializer(movements, many=True).data)

        variant = get_object_or_404(
            ProductVariant, pk=request.data.get("variant_id"), product=product
        )
        try:
            delta = int(request.data.get("delta", 0))
        except (TypeError, ValueError):
            return Response({"delta": "Invalide."}, status=status.HTTP_400_BAD_REQUEST)
        new_stock = variant.stock + delta
        if delta == 0 or new_stock < 0:
            return Response(
                {"delta": "Ajustement invalide (stock négatif)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        variant.stock = new_stock
        variant.save(update_fields=["stock", "updated_at"])
        movement = StockMovement.objects.create(
            variant=variant,
            delta=delta,
            resulting_stock=new_stock,
            reason=request.data.get("reason", StockMovement.Reason.RESTOCK),
            note=request.data.get("note", ""),
        )
        return Response(StockMovementSerializer(movement).data, status=status.HTTP_201_CREATED)


class AdminCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None
