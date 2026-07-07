import pytest
from django.urls import reverse

from conftest import ProductFactory, VariantFactory

pytestmark = pytest.mark.django_db

LIST_URL = reverse("product-list")


class TestPublicCatalog:
    def test_list_only_active_products(self, api_client):
        VariantFactory(product=ProductFactory(name="Visible", slug="visible"))
        ProductFactory(name="Hidden", slug="hidden", is_active=False)
        resp = api_client.get(LIST_URL)
        assert resp.status_code == 200
        slugs = [p["slug"] for p in resp.data["results"]]
        assert "visible" in slugs and "hidden" not in slugs

    def test_pagination_page_size_12(self, api_client):
        for i in range(15):
            VariantFactory(product=ProductFactory(slug=f"p-{i}"))
        resp = api_client.get(LIST_URL)
        assert len(resp.data["results"]) == 12
        assert resp.data["count"] == 15

    def test_detail_by_slug_includes_variants(self, api_client, variant):
        resp = api_client.get(reverse("product-detail", kwargs={"slug": variant.product.slug}))
        assert resp.status_code == 200
        assert resp.data["variants"][0]["sku"] == variant.sku
        assert resp.data["tint"] == "#E88BB0"

    def test_search_matches_name(self, api_client):
        VariantFactory(product=ProductFactory(name="Sweet Dreams", slug="sweet-dreams"))
        VariantFactory(product=ProductFactory(name="Honey Touch", slug="honey-touch"))
        resp = api_client.get(LIST_URL, {"search": "sweet"})
        slugs = [p["slug"] for p in resp.data["results"]]
        assert slugs == ["sweet-dreams"]

    def test_filter_by_category_slug(self, api_client):
        from conftest import CategoryFactory

        other = CategoryFactory(name="Autre", slug="autre")
        VariantFactory(product=ProductFactory(slug="in-cat"))
        VariantFactory(product=ProductFactory(slug="out-cat", category=other))
        resp = api_client.get(LIST_URL, {"category": "brumes-parfumees"})
        slugs = [p["slug"] for p in resp.data["results"]]
        assert "in-cat" in slugs and "out-cat" not in slugs


class TestAdminCatalog:
    def test_anonymous_cannot_write(self, api_client):
        resp = api_client.post(reverse("admin-product-list"), {"name": "X"})
        assert resp.status_code in (401, 403)

    def test_customer_cannot_write(self, auth_client):
        resp = auth_client.post(reverse("admin-product-list"), {"name": "X"})
        assert resp.status_code == 403

    def test_admin_creates_product_with_variants(self, admin_client):
        from conftest import CategoryFactory

        cat = CategoryFactory()
        resp = admin_client.post(
            reverse("admin-product-list"),
            {
                "category": cat.pk,
                "name": "Nouveau Parfum",
                "tint": "#AABBCC",
                "variants": [
                    {"sku": "AV-NP-200", "size": "Brume 200ml", "price": "3000.00", "stock": 20}
                ],
            },
            format="json",
        )
        assert resp.status_code == 201, resp.data
        assert resp.data["slug"] == "nouveau-parfum"

    def test_negative_price_rejected(self, admin_client):
        from conftest import CategoryFactory

        resp = admin_client.post(
            reverse("admin-product-list"),
            {
                "category": CategoryFactory().pk,
                "name": "Bad",
                "variants": [{"sku": "B-1", "size": "200ml", "price": "-5", "stock": 1}],
            },
            format="json",
        )
        assert resp.status_code == 400
