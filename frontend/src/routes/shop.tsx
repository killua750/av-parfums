import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { api } from "@/lib/api";
import type { Category } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

const shopSearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  min_price: z.string().optional().catch(undefined),
  max_price: z.string().optional().catch(undefined),
  ordering: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/shop")({
  validateSearch: shopSearchSchema,
  head: () => ({
    meta: [
      { title: "Boutique — AV Parfums" },
      { name: "description", content: "Toutes nos brumes parfumées." },
      { property: "og:title", content: "Boutique — AV Parfums" },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, isPending, isError } = useProducts(search);
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/api/v1/categories/"),
    staleTime: 5 * 60 * 1000,
  });

  const setFilter = (patch: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, page: undefined, ...patch }) });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / 12)) : 1;
  const page = search.page ?? 1;

  return (
    <main className="min-h-screen bg-neutral-950 text-white pt-24 pb-16 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <h1
          className="text-4xl sm:text-6xl uppercase mb-8"
          style={{ fontFamily: "Anton, sans-serif" }}
        >
          {t("shop.title")}
        </h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8 items-center">
          <input
            type="search"
            defaultValue={search.search ?? ""}
            placeholder={t("shop.search")}
            onKeyDown={(e) => {
              if (e.key === "Enter") setFilter({ search: e.currentTarget.value || undefined });
            }}
            className="px-4 py-2.5 rounded-full bg-white/10 border border-white/15 text-sm placeholder:text-white/40 focus:outline-none focus:border-white/40 w-full sm:w-64"
          />
          <select
            value={search.category ?? ""}
            onChange={(e) => setFilter({ category: e.target.value || undefined })}
            className="px-4 py-2.5 rounded-full bg-white/10 border border-white/15 text-sm focus:outline-none [&>option]:text-black"
          >
            <option value="">{t("shop.all")}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={search.ordering ?? "-created_at"}
            onChange={(e) => setFilter({ ordering: e.target.value })}
            className="px-4 py-2.5 rounded-full bg-white/10 border border-white/15 text-sm focus:outline-none [&>option]:text-black"
          >
            <option value="-created_at">{t("shop.newest")}</option>
            <option value="variants__price">{t("shop.priceAsc")}</option>
            <option value="-variants__price">{t("shop.priceDesc")}</option>
          </select>
          <input
            type="number"
            placeholder={t("shop.minPrice")}
            defaultValue={search.min_price ?? ""}
            onBlur={(e) => setFilter({ min_price: e.target.value || undefined })}
            className="px-4 py-2.5 rounded-full bg-white/10 border border-white/15 text-sm w-28 placeholder:text-white/40 focus:outline-none"
          />
          <input
            type="number"
            placeholder={t("shop.maxPrice")}
            defaultValue={search.max_price ?? ""}
            onBlur={(e) => setFilter({ max_price: e.target.value || undefined })}
            className="px-4 py-2.5 rounded-full bg-white/10 border border-white/15 text-sm w-28 placeholder:text-white/40 focus:outline-none"
          />
        </div>

        {/* Grid */}
        {isPending ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : isError || !data || data.results.length === 0 ? (
          <p className="text-white/50 py-16 text-center">{t("shop.empty")}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {data.results.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => void navigate({ search: (prev) => ({ ...prev, page: i + 1 }) })}
                    className={`w-10 h-10 rounded-full text-sm font-semibold transition ${
                      page === i + 1
                        ? "bg-white text-black"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
