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


class TestLogout:
    def test_logout_clears_jwt_cookies(self, api_client, user):
        api_client.post(LOGIN_URL, {"email": user.email, "password": "S3curePass!42"})
        resp = api_client.post(reverse("auth-logout"))
        assert resp.status_code == 200, resp.data
        # Cookies must be expired (empty value) so the session actually ends.
        assert resp.cookies["av-access"].value == ""
        assert resp.cookies["av-refresh"].value == ""
        assert api_client.get(ME_URL).status_code in (401, 403)


class TestPasswordChange:
    URL = reverse("auth-password-change")

    def test_requires_correct_old_password(self, auth_client, user):
        # Wrong current password must be rejected (OLD_PASSWORD_FIELD_ENABLED).
        resp = auth_client.post(
            self.URL,
            {
                "old_password": "totally-wrong",
                "new_password1": "N3wStrongPass!9",
                "new_password2": "N3wStrongPass!9",
            },
        )
        assert resp.status_code == 400
        assert "old_password" in resp.data

    def test_changes_with_correct_old_password(self, auth_client, api_client, user):
        resp = auth_client.post(
            self.URL,
            {
                "old_password": "S3curePass!42",
                "new_password1": "N3wStrongPass!9",
                "new_password2": "N3wStrongPass!9",
            },
        )
        assert resp.status_code == 200, resp.data
        # New password now works, old one no longer does.
        assert (
            api_client.post(
                LOGIN_URL, {"email": user.email, "password": "N3wStrongPass!9"}
            ).status_code
            == 200
        )
        assert (
            api_client.post(
                LOGIN_URL, {"email": user.email, "password": "S3curePass!42"}
            ).status_code
            == 400
        )

    def test_requires_authentication(self, api_client):
        resp = api_client.post(
            self.URL,
            {
                "old_password": "x",
                "new_password1": "N3wStrongPass!9",
                "new_password2": "N3wStrongPass!9",
            },
        )
        assert resp.status_code in (401, 403)
