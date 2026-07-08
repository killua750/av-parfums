import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { FALLBACK_PRODUCTS } from "@/data/fallback";
import type { Paginated, Product, ProductDetail, Wilaya } from "@/lib/types";

export interface ShopFilters {
  page?: number;
  category?: string;
  search?: string;
  min_price?: string;
  max_price?: string;
  ordering?: string;
}

export function useProducts(filters: ShopFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return useQuery<Paginated<Product>>({
    queryKey: ["products", filters],
    queryFn: () => api<Paginated<Product>>(`/api/v1/products/${qs ? `?${qs}` : ""}`),
    placeholderData: keepPreviousData,
  });
}

// The two signature products ship as static assets on the CDN. Their images
// stay pinned to those files even when the API answers — no re-download or
// flicker, and the hero is immune to the free-tier API's cold starts.
const STATIC_IMAGES = new Map(
  FALLBACK_PRODUCTS.map((p) => [p.slug, [p.bottle_image, p.background_image] as const]),
);

/** Hero carousel + home grid: renders instantly from the static fallback
 * (placeholderData), then silently refreshes from the API. */
export function useFeaturedProducts() {
  return useQuery<Product[]>({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      try {
        const page = await api<Paginated<Product>>("/api/v1/products/?featured=true");
        if (!page.results.length) return FALLBACK_PRODUCTS;
        return page.results.map((p) => {
          const pinned = STATIC_IMAGES.get(p.slug);
          return pinned ? { ...p, bottle_image: pinned[0], background_image: pinned[1] } : p;
        });
      } catch {
        return FALLBACK_PRODUCTS;
      }
    },
    placeholderData: FALLBACK_PRODUCTS,
    staleTime: 60 * 1000,
  });
}

export function useProduct(slug: string) {
  return useQuery<ProductDetail>({
    queryKey: ["products", slug],
    queryFn: () => api<ProductDetail>(`/api/v1/products/${slug}/`),
  });
}

export function useWilayas() {
  return useQuery<Wilaya[]>({
    queryKey: ["wilayas"],
    queryFn: () => api<Wilaya[]>("/api/v1/wilayas/"),
    staleTime: Infinity,
  });
}
