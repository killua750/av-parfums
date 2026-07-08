import pytest
from django.core import mail
from django.urls import reverse

from apps.orders.models import Order
from conftest import VariantFactory

pytestmark = pytest.mark.django_db

ORDERS_URL = reverse("order-list")


def order_payload(variant, wilaya, qty=1):
    return {
        "items": [{"variant_id": variant.pk, "quantity": qty}],
        "shipping_address": {
            "full_name": "Amina Benali",
            "phone": "0550123456",
            "wilaya": wilaya.pk,
            "commune": "Hydra",
            "address": "12 rue des Roses",
        },
    }


class TestOrderCreation:
    def test_guest_cod_checkout(self, api_client, variant, wilaya):
        resp = api_client.post(ORDERS_URL, order_payload(variant, wilaya, qty=2), format="json")
        assert resp.status_code == 201, resp.data
        assert resp.data["number"].startswith("AV-")
        assert resp.data["status"] == "pending"
        assert resp.data["total"] == "5000.00"  # 2 × 2500, computed server-side

    def test_stock_is_decremented(self, api_client, variant, wilaya):
        api_client.post(ORDERS_URL, order_payload(variant, wilaya, qty=3), format="json")
        variant.refresh_from_db()
        assert variant.stock == 7

    def test_insufficient_stock_rejected(self, api_client, wilaya):
        variant = VariantFactory(stock=1)
        resp = api_client.post(ORDERS_URL, order_payload(variant, wilaya, qty=2), format="json")
        assert resp.status_code == 400
        assert Order.objects.count() == 0
        variant.refresh_from_db()
        assert variant.stock == 1  # rollback intact

    def test_invalid_phone_rejected(self, api_client, variant, wilaya):
        payload = order_payload(variant, wilaya)
        payload["shipping_address"]["phone"] = "123"
        resp = api_client.post(ORDERS_URL, payload, format="json")
        assert resp.status_code == 400

    def test_client_cannot_set_price(self, api_client, variant, wilaya):
        payload = order_payload(variant, wilaya)
        payload["items"][0]["unit_price"] = "0.01"
        payload["total"] = "0.01"
        resp = api_client.post(ORDERS_URL, payload, format="json")
        assert resp.status_code == 201
        assert resp.data["total"] == "2500.00"

    def test_confirmation_email_sent(
        self, api_client, variant, wilaya, settings, django_capture_on_commit_callbacks
    ):
        settings.ORDER_NOTIFICATION_EMAIL = "shop@avparfums.dz"
        with django_capture_on_commit_callbacks(execute=True):
            api_client.post(ORDERS_URL, order_payload(variant, wilaya), format="json")
        assert len(mail.outbox) >= 1
        assert "AV-" in mail.outbox[0].subject

    def test_low_stock_alert_triggered(
        self, api_client, wilaya, settings, django_capture_on_commit_callbacks
    ):
        settings.ORDER_NOTIFICATION_EMAIL = "shop@avparfums.dz"
        variant = VariantFactory(stock=6)
        with django_capture_on_commit_callbacks(execute=True):
            api_client.post(ORDERS_URL, order_payload(variant, wilaya, qty=2), format="json")
        subjects = " ".join(m.subject for m in mail.outbox)
        assert "Stock bas" in subjects


class TestOrderAccess:
    def test_user_sees_only_own_orders(self, api_client, user, variant, wilaya):
        api_client.post(ORDERS_URL, order_payload(variant, wilaya), format="json")  # guest order
        api_client.force_authenticate(user=user)
        api_client.post(ORDERS_URL, order_payload(variant, wilaya), format="json")
        resp = api_client.get(ORDERS_URL)
        assert resp.data["count"] == 1

    def test_stranger_cannot_read_another_users_order(
        self, auth_client, admin_client, variant, wilaya
    ):
        resp = admin_client.post(ORDERS_URL, order_payload(variant, wilaya), format="json")
        number = resp.data["number"]
        resp = auth_client.get(reverse("order-detail", kwargs={"number": number}))
        assert resp.status_code == 404  # filtered queryset — not even a 403 leak

    def test_admin_can_read_any_order(self, api_client, admin_client, variant, wilaya):
        resp = api_client.post(ORDERS_URL, order_payload(variant, wilaya), format="json")
        number = resp.data["number"]
        resp = admin_client.get(reverse("order-detail", kwargs={"number": number}))
        assert resp.status_code == 200


class TestStatusTransitions:
    def _create(self, api_client, variant, wilaya) -> str:
        return api_client.post(
            ORDERS_URL, order_payload(variant, wilaya, qty=2), format="json"
        ).data["number"]

    def test_admin_walks_the_full_flow(self, api_client, admin_client, variant, wilaya):
        number = self._create(api_client, variant, wilaya)
        url = reverse("admin-order-set-status", kwargs={"number": number})
        for st in ("confirmed", "shipped", "delivered"):
            resp = admin_client.post(url, {"status": st})
            assert resp.status_code == 200, resp.data
            assert resp.data["status"] == st

    def test_invalid_transition_rejected(self, api_client, admin_client, variant, wilaya):
        number = self._create(api_client, variant, wilaya)
        url = reverse("admin-order-set-status", kwargs={"number": number})
        resp = admin_client.post(url, {"status": "delivered"})  # pending → delivered
        assert resp.status_code == 400

    def test_cancel_restocks(self, api_client, admin_client, variant, wilaya):
        number = self._create(api_client, variant, wilaya)
        variant.refresh_from_db()
        assert variant.stock == 8
        url = reverse("admin-order-set-status", kwargs={"number": number})
        resp = admin_client.post(url, {"status": "cancelled"})
        assert resp.status_code == 200
        variant.refresh_from_db()
        assert variant.stock == 10

    def test_customer_cannot_change_status(self, api_client, auth_client, variant, wilaya):
        number = self._create(api_client, variant, wilaya)
        url = reverse("admin-order-set-status", kwargs={"number": number})
        resp = auth_client.post(url, {"status": "confirmed"})
        assert resp.status_code == 403


class TestAdminDashboard:
    URL = reverse("admin-dashboard")

    def test_requires_admin(self, api_client, auth_client):
        assert api_client.get(self.URL).status_code in (401, 403)
        assert auth_client.get(self.URL).status_code == 403

    def test_aggregates_orders(self, admin_client, api_client, variant, wilaya):
        api_client.post(ORDERS_URL, order_payload(variant, wilaya, qty=2), format="json")
        api_client.post(ORDERS_URL, order_payload(variant, wilaya, qty=1), format="json")

        resp = admin_client.get(self.URL)
        assert resp.status_code == 200, resp.data
        totals = resp.data["totals"]["current"]
        assert totals["orders"] == 2
        assert totals["revenue"] == "7500.00"
        assert totals["aov"] == "3750.00"
        assert resp.data["status_counts"] == {"pending": 2}
        assert len(resp.data["series"]) == 30
        assert resp.data["series"][-1]["revenue"] == "7500.00"
        assert resp.data["top_products"][0]["units"] == 3
        assert len(resp.data["recent_orders"]) == 2

    def test_cancelled_orders_excluded_from_revenue(
        self, admin_client, api_client, variant, wilaya
    ):
        resp = api_client.post(ORDERS_URL, order_payload(variant, wilaya, qty=2), format="json")
        number = resp.data["number"]
        admin_client.post(
            reverse("admin-order-set-status", args=[number]),
            {"status": "cancelled"},
            format="json",
        )
        resp = admin_client.get(self.URL)
        assert resp.data["totals"]["current"]["revenue"] == "0.00"
        assert resp.data["status_counts"] == {"cancelled": 1}

    def test_low_stock_listed(self, admin_client):
        VariantFactory(stock=2, sku="LOW-1")
        resp = admin_client.get(self.URL)
        assert any(v["sku"] == "LOW-1" for v in resp.data["low_stock"])

    def test_days_param_clamped(self, admin_client):
        resp = admin_client.get(self.URL, {"days": 7})
        assert resp.data["period_days"] == 7
        assert len(resp.data["series"]) == 7
        resp = admin_client.get(self.URL, {"days": "bogus"})
        assert resp.data["period_days"] == 30
