import factory
import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.catalog.models import Category, Product, ProductVariant
from apps.core.models import Wilaya


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    password = factory.PostGenerationMethodCall("set_password", "S3curePass!42")
    phone = "0550123456"

    @factory.post_generation
    def save_password(obj, create, extracted, **kwargs):
        if create:
            obj.save()


class AdminFactory(UserFactory):
    role = User.Role.ADMIN
    is_staff = True


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category
        django_get_or_create = ("slug",)

    name = "Brumes parfumées"
    slug = "brumes-parfumees"


class ProductFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Product

    category = factory.SubFactory(CategoryFactory)
    name = factory.Sequence(lambda n: f"Parfum {n}")
    slug = factory.Sequence(lambda n: f"parfum-{n}")
    tagline = "Floral · Musc"
    description = "Une brume parfumée de test."
    tint = "#E88BB0"
    is_active = True
    featured = True


class VariantFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ProductVariant

    product = factory.SubFactory(ProductFactory)
    sku = factory.Sequence(lambda n: f"SKU-{n:04d}")
    size = "Brume 200ml"
    price = "2500.00"
    stock = 10


class WilayaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Wilaya
        django_get_or_create = ("code",)

    code = 16
    name = "Alger"


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def user(db) -> User:
    return UserFactory()


@pytest.fixture
def admin_user(db) -> User:
    return AdminFactory()


@pytest.fixture
def auth_client(api_client: APIClient, user: User) -> APIClient:
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def admin_client(admin_user: User) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def variant(db) -> ProductVariant:
    return VariantFactory()


@pytest.fixture
def wilaya(db) -> Wilaya:
    return WilayaFactory()
