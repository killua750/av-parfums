import pytest
from django.urls import reverse

from apps.accounts.models import User

pytestmark = pytest.mark.django_db

REGISTER_URL = reverse("auth-register")
LOGIN_URL = reverse("auth-login")
ME_URL = reverse("auth-me")


class TestRegister:
    def test_register_creates_customer(self, api_client):
        resp = api_client.post(
            REGISTER_URL,
            {
                "email": "new@example.com",
                "password1": "S3curePass!42",
                "password2": "S3curePass!42",
                "first_name": "Amina",
                "phone": "0550123456",
            },
        )
        assert resp.status_code == 201, resp.data
        user = User.objects.get(email="new@example.com")
        assert user.role == User.Role.CUSTOMER
        assert user.phone == "0550123456"
        assert not user.is_staff

    def test_register_rejects_bad_phone(self, api_client):
        resp = api_client.post(
            REGISTER_URL,
            {
                "email": "bad@example.com",
                "password1": "S3curePass!42",
                "password2": "S3curePass!42",
                "phone": "12345",
            },
        )
        assert resp.status_code == 400
        assert "phone" in resp.data

    def test_register_rejects_duplicate_email(self, api_client, user):
        resp = api_client.post(
            REGISTER_URL,
            {"email": user.email, "password1": "S3curePass!42", "password2": "S3curePass!42"},
        )
        assert resp.status_code == 400


class TestLogin:
    def test_login_sets_httponly_jwt_cookies(self, api_client, user):
        resp = api_client.post(LOGIN_URL, {"email": user.email, "password": "S3curePass!42"})
        assert resp.status_code == 200
        assert "av-access" in resp.cookies
        assert "av-refresh" in resp.cookies
        assert resp.cookies["av-access"]["httponly"]

    def test_login_wrong_password(self, api_client, user):
        resp = api_client.post(LOGIN_URL, {"email": user.email, "password": "nope"})
        assert resp.status_code == 400


class TestMe:
    def test_me_requires_auth(self, api_client):
        assert api_client.get(ME_URL).status_code in (401, 403)

    def test_me_returns_profile(self, auth_client, user):
        resp = auth_client.get(ME_URL)
        assert resp.status_code == 200
        assert resp.data["email"] == user.email
        assert resp.data["role"] == "customer"

    def test_role_is_read_only(self, auth_client, user):
        resp = auth_client.patch(ME_URL, {"role": "admin", "first_name": "X"})
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.role == User.Role.CUSTOMER  # no client-side escalation
