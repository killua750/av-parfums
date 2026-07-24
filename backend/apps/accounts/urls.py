from dj_rest_auth.jwt_auth import get_refresh_view
from dj_rest_auth.views import LogoutView, PasswordChangeView, UserDetailsView
from django.urls import path

from apps.accounts.views import GoogleLoginView, ThrottledLoginView, ThrottledRegisterView

urlpatterns = [
    path("register/", ThrottledRegisterView.as_view(), name="auth-register"),
    path("login/", ThrottledLoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", get_refresh_view().as_view(), name="auth-refresh"),
    path("me/", UserDetailsView.as_view(), name="auth-me"),
    path("password/change/", PasswordChangeView.as_view(), name="auth-password-change"),
    path("google/", GoogleLoginView.as_view(), name="auth-google"),
]
