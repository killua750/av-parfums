import pytest
from django.urls import reverse

from apps.cart.models import Cart
from apps.cart.services import merge_carts
from conftest import VariantFactory

pytestmark = pytest.mark.django_db

CART_URL = reverse("cart")
ITEMS_URL = reverse("cart-items")


class TestGuestCart:
    def test_guest_gets_session_cart(self, api_client, variant):
        resp = api_client.post(ITEMS_URL, {"variant_id": variant.pk, "quantity": 2})
        assert resp.status_code == 201
        assert resp.data["count"] == 2
        assert resp.data["subtotal"] == "5000.00"

    def test_add_same_variant_merges_quantity(self, api_client, variant):
        api_client.post(ITEMS_URL, {"variant_id": variant.pk, "quantity": 1})
        resp = api_client.post(ITEMS_URL, {"variant_id": variant.pk, "quantity": 2})
        assert resp.data["count"] == 3
        assert len(resp.data["items"]) == 1  # unique (cart, variant)

    def test_cannot_add_more_than_stock(self, api_client):
        variant = VariantFactory(stock=1)
        resp = api_client.post(ITEMS_URL, {"variant_id": variant.pk, "quantity": 5})
        assert resp.status_code == 400

    def test_update_quantity_and_remove(self, api_client, variant):
        resp = api_client.post(ITEMS_URL, {"variant_id": variant.pk, "quantity": 2})
        item_id = resp.data["items"][0]["id"]
        resp = api_client.patch(
            reverse("cart-item-detail", kwargs={"item_id": item_id}), {"quantity": 5}
        )
        assert resp.data["count"] == 5
        resp = api_client.patch(
            reverse("cart-item-detail", kwargs={"item_id": item_id}), {"quantity": 0}
        )
        assert resp.data["count"] == 0

    def test_clear_cart(self, api_client, variant):
        api_client.post(ITEMS_URL, {"variant_id": variant.pk, "quantity": 2})
        resp = api_client.delete(CART_URL)
        assert resp.data["count"] == 0


class TestCartMerge:
    def test_guest_cart_merges_into_user_cart_on_login(self, api_client, user, variant):
        # Guest adds to cart (session cart is created)…
        api_client.post(ITEMS_URL, {"variant_id": variant.pk, "quantity": 2})
        assert Cart.objects.filter(user__isnull=True).count() == 1
        # …then authenticates with the same session.
        api_client.force_authenticate(user=user)
        resp = api_client.get(CART_URL)
        assert resp.data["count"] == 2
        assert Cart.objects.filter(user=user).count() == 1
        assert Cart.objects.filter(user__isnull=True).count() == 0

    def test_merge_sums_quantities(self, user, variant):
        guest = Cart.objects.create(session_key="abc123")
        guest.items.create(variant=variant, quantity=2)
        target = Cart.objects.create(user=user)
        target.items.create(variant=variant, quantity=1)
        merge_carts(source=guest, target=target)
        item = target.items.get()
        assert item.quantity == 3
        assert not Cart.objects.filter(session_key="abc123").exists()
