from django.contrib import admin

from apps.catalog.models import Category, Product, ProductImage, ProductVariant


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ["image", "alt", "sort_order"]


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = ["sku", "size", "price", "stock"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    prepopulated_fields = {"slug": ["name"]}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "tint", "is_active", "featured", "created_at"]
    list_filter = ["category", "is_active", "featured"]
    search_fields = ["name", "slug", "tagline"]
    prepopulated_fields = {"slug": ["name"]}
    inlines = [ProductVariantInline, ProductImageInline]
    actions = ["activate", "deactivate"]

    @admin.action(description="Activer les produits sélectionnés")
    def activate(self, request, queryset):
        queryset.update(is_active=True)

    @admin.action(description="Désactiver les produits sélectionnés")
    def deactivate(self, request, queryset):
        queryset.update(is_active=False)


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ["product", "sku", "size", "price", "stock"]
    list_filter = ["product"]
    list_editable = ["price", "stock"]
