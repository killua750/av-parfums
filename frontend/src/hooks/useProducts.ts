import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { FALLBACK_PRODUCTS, pinStaticImages } from "@/data/fallback";
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
    queryFn: async () => {
      const page = await api<Paginated<Product>>(`/api/v1/products/${qs ? `?${qs}` : ""}`);
      return { ...page, results: page.results.map(pinStaticImages) };
    },
    placeholderData: keepPreviousData,
  });
}

/** Hero carousel + home grid: renders instantly from the static fallback
 * (placeholderData), then silently refreshes from the API. Evergreen images
 * stay pinned to the CDN so the hero is immune to the API's cold starts. */
export function useFeaturedProducts() {
  return useQuery<Product[]>({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      try {
        const page = await api<Paginated<Product>>("/api/v1/products/?featured=true");
        return page.results.length ? page.results.map(pinStaticImages) : FALLBACK_PRODUCTS;
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
    queryFn: async () => pinStaticImages(await api<ProductDetail>(`/api/v1/products/${slug}/`)),
  });
}

export function useWilayas() {
  return useQuery<Wilaya[]>({
    queryKey: ["wilayas"],
    queryFn: () => api<Wilaya[]>("/api/v1/wilayas/"),
    staleTime: Infinity,
  });
}
