from django.urls import path

from apps.core import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("wilayas/", views.wilaya_list, name="wilaya-list"),
    path("settings/", views.StoreSettingsView.as_view(), name="store-settings"),
]
