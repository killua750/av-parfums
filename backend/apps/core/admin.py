from django.contrib import admin

from apps.core.models import Wilaya


@admin.register(Wilaya)
class WilayaAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "name_ar"]
    search_fields = ["name", "name_ar"]
    ordering = ["code"]
