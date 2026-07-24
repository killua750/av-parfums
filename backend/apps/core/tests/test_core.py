import pytest
from django.core.management import call_command
from django.urls import reverse

from apps.core.models import Wilaya

pytestmark = pytest.mark.django_db


def test_health_endpoint(api_client):
    resp = api_client.get(reverse("health"))
    assert resp.status_code == 200
    assert resp.data == {"status": "ok", "database": True}


def test_wilaya_fixture_seeds_58(api_client):
    call_command("loaddata", "wilayas", verbosity=0)
    assert Wilaya.objects.count() == 58
    resp = api_client.get(reverse("wilaya-list"))
    assert len(resp.data) == 58
    assert resp.data[15] == {"id": 16, "code": 16, "name": "Alger", "name_ar": ""}


def test_products_fixture_seeds_catalog(api_client):
    call_command("loaddata", "products", verbosity=0)
    resp = api_client.get(reverse("product-list"))
    slugs = {p["slug"] for p in resp.data["results"]}
    assert slugs == {"sweet-dreams", "honey-touch", "dziria", "afro-passion"}
    detail = api_client.get(reverse("product-detail", kwargs={"slug": "sweet-dreams"}))
    assert detail.data["variants"][0]["price"] == "2500.00"


def test_robots_txt(client):
    resp = client.get("/robots.txt")
    assert resp.status_code == 200
    assert b"Sitemap" in resp.content
