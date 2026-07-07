import django_filters
from django.db import connection
from django.db.models import QuerySet

from apps.catalog.models import Product


class ProductFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name="category__slug")
    min_price = django_filters.NumberFilter(field_name="variants__price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="variants__price", lookup_expr="lte")
    in_stock = django_filters.BooleanFilter(method="filter_in_stock")

    class Meta:
        model = Product
        fields = ["category", "min_price", "max_price", "in_stock", "featured"]

    def filter_in_stock(self, queryset: QuerySet, name: str, value: bool) -> QuerySet:
        if value:
            return queryset.filter(variants__stock__gt=0).distinct()
        return queryset


def full_text_search(queryset: QuerySet, term: str) -> QuerySet:
    """PostgreSQL full-text + trigram search; falls back to icontains on
    other engines (SQLite in bare-metal dev/tests)."""
    term = term.strip()
    if not term:
        return queryset
    if connection.vendor == "postgresql":
        from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
        from django.db.models import F
        from django.db.models.functions import Greatest

        vector = SearchVector("name", weight="A") + SearchVector(
            "tagline", "description", weight="B"
        )
        query = SearchQuery(term, config="french")
        try:
            from django.contrib.postgres.search import TrigramSimilarity

            return (
                queryset.annotate(
                    rank=SearchRank(vector, query),
                    sim=TrigramSimilarity("name", term),
                    score=Greatest(F("rank"), F("sim")),
                )
                .filter(score__gt=0.05)
                .order_by("-score")
            )
        except Exception:  # pg_trgm extension missing — plain FTS
            return (
                queryset.annotate(rank=SearchRank(vector, query))
                .filter(rank__gt=0)
                .order_by("-rank")
            )
    return queryset.filter(name__icontains=term) | queryset.filter(description__icontains=term)
