from dj_rest_auth.registration.serializers import RegisterSerializer as BaseRegisterSerializer
from rest_framework import serializers

from apps.accounts.models import User, algerian_phone_validator


class UserSerializer(serializers.ModelSerializer):
    """Exposed at /api/v1/auth/me. `role` is read-only: privilege escalation
    through the profile endpoint must be impossible."""

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone", "role"]
        read_only_fields = ["id", "email", "role"]

    def validate_phone(self, value: str) -> str:
        value = value.replace(" ", "")
        if value:
            algerian_phone_validator(value)
        return value


class RegisterSerializer(BaseRegisterSerializer):
    username = None
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=13, required=False, allow_blank=True)

    def validate_phone(self, value: str) -> str:
        value = value.replace(" ", "")
        if value:
            algerian_phone_validator(value)
        return value

    def validate_email(self, value: str) -> str:
        value = super().validate_email(value)
        # dj-rest-auth only rejects duplicates with a *verified* allauth
        # EmailAddress; enforce uniqueness against the User table directly.
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte existe déjà avec cet email.")
        return value

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data.update(
            first_name=self.validated_data.get("first_name", ""),
            last_name=self.validated_data.get("last_name", ""),
            phone=self.validated_data.get("phone", ""),
        )
        return data

    def custom_signup(self, request, user: User) -> None:
        user.first_name = self.cleaned_data.get("first_name", "")
        user.last_name = self.cleaned_data.get("last_name", "")
        user.phone = self.cleaned_data.get("phone", "")
        user.save(update_fields=["first_name", "last_name", "phone"])
