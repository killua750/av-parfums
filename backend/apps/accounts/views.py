from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import RegisterView as BaseRegisterView
from dj_rest_auth.registration.views import SocialLoginView
from dj_rest_auth.views import LoginView as BaseLoginView


class ThrottledLoginView(BaseLoginView):
    throttle_scope = "auth"


class ThrottledRegisterView(BaseRegisterView):
    throttle_scope = "auth"


class GoogleLoginView(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client
    callback_url = "postmessage"  # SPA flow (auth code from Google Identity Services)
    throttle_scope = "auth"
