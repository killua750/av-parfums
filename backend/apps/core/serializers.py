from rest_framework import serializers

from apps.core.models import StoreSettings, Wilaya


class WilayaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wilaya
        fields = ["id", "code", "name", "name_ar"]


class StoreSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreSettings
        fields = [
            "whatsapp_number",
            "store_name",
            "contact_email",
            "contact_phone",
            "instagram",
            "free_shipping_threshold",
            "vip_threshold",
        ]
