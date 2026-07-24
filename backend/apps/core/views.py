from django.db import connection
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.models import StoreSettings, Wilaya
from apps.core.permissions import IsAdmin
from apps.core.serializers import StoreSettingsSerializer, WilayaSerializer


class StoreSettingsView(RetrieveUpdateAPIView):
    """GET (public) the store settings; PATCH (admin) to update them."""

    serializer_class = StoreSettingsSerializer

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [AllowAny()]
        return [IsAdmin()]

    def get_object(self):
        return StoreSettings.load()


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Liveness + DB connectivity probe for load balancers and uptime checks."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_ok = True
    except Exception:  # noqa: BLE001
        db_ok = False
    status_code = 200 if db_ok else 503
    payload = {"status": "ok" if db_ok else "degraded", "database": db_ok}
    return Response(payload, status=status_code)


@api_view(["GET"])
@permission_classes([AllowAny])
def wilaya_list(request):
    """All 58 wilayas for the checkout dropdown (unpaginated on purpose)."""
    qs = Wilaya.objects.all()
    return Response(WilayaSerializer(qs, many=True).data)


def robots_txt(request):
    lines = [
        "User-agent: *",
        "Disallow: /django-admin/",
        "Disallow: /api/",
        "Allow: /",
        f"Sitemap: {request.build_absolute_uri('/sitemap.xml')}",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain")
