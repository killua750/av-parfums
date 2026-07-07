from django.contrib.sitemaps import Sitemap

from apps.catalog.models import Product


class ProductSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.8

    def items(self):
        return Product.objects.filter(is_active=True)

    def lastmod(self, obj: Product):
        return obj.updated_at

    def location(self, obj: Product) -> str:
        # Frontend route, not the API URL.
        return f"/product/{obj.slug}"


class StaticSitemap(Sitemap):
    changefreq = "monthly"
    priority = 0.5

    def items(self):
        return ["/", "/shop"]

    def location(self, item: str) -> str:
        return item


SITEMAPS = {"products": ProductSitemap, "static": StaticSitemap}
