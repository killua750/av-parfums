// JSON-LD structured data helpers (Product + Organization) injected per route.
import type { ProductDetail } from "@/lib/types";

export function organizationJsonLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AV Parfums",
    url: typeof window === "undefined" ? "" : window.location.origin,
    description: "Brumes parfumées de luxe — livraison partout en Algérie.",
  });
}

export function productJsonLd(product: ProductDetail): string {
  const variant = product.variants[0];
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.bottle_image ?? undefined,
    brand: { "@type": "Brand", name: "AV Parfums" },
    offers: variant
      ? {
          "@type": "Offer",
          price: variant.price,
          priceCurrency: "DZD",
          availability: variant.in_stock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        }
      : undefined,
  });
}
