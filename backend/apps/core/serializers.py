from rest_framework import serializers

from apps.core.models import Wilaya


class WilayaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wilaya
        fields = ["id", "code", "name", "name_ar"]
