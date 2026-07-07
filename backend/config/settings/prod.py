import sentry_sdk
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.django import DjangoIntegration

from .base import *  # noqa
from .base import REST_AUTH, env

DEBUG = False
SECRET_KEY = env("SECRET_KEY")  # required, no default in prod

# --- HTTPS hardening ---
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = "DENY"

REST_AUTH["JWT_AUTH_SECURE"] = True

# --- Sentry ---
if env("SENTRY_DSN_BACKEND", default=""):
    sentry_sdk.init(
        dsn=env("SENTRY_DSN_BACKEND"),
        integrations=[DjangoIntegration(), CeleryIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
    )
