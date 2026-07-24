import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useCart } from "@/hooks/useCart";
import { api } from "@/lib/api";
import { formatDA } from "@/lib/format";
import type { Product, ProductDetail } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { t } = useTranslation();
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  const quickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || !product.in_stock) return;
    setBusy(true);
    try {
      // List payload has no variants — fetch detail for the default one.
      const detail = await api<ProductDetail>(`/api/v1/products/${product.slug}/`);
      const variant = detail.variants[0];
      if (!variant) throw new Error("no variant");
      cart.add(detail, variant);
      setAdded(true);
      toast.success(t("cart.added"));
      window.setTimeout(() => setAdded(false), 1600);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]"
    >
      <div
        className="relative aspect-square overflow-hidden"
        style={{
          background: `radial-gradient(120% 120% at 50% 15%, ${product.tint}40 0%, ${product.tint}14 55%, transparent 100%)`,
        }}
      >
        {product.bottle_image ? (
          <img
            src={product.bottle_image}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain p-8 drop-shadow-2xl transition-transform duration-500 group-hover:scale-[1.07]"
          />
        ) : (
          <div
            className="absolute inset-0 m-auto h-32 w-16 rounded-lg"
            style={{ backgroundColor: product.tint }}
          />
        )}

        {!product.in_stock && (
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur">
            {t("shop.outOfStock")}
          </span>
        )}

        {/* Quick add — slides up on hover (always visible on touch) */}
        {product.in_stock && (
          <button
            onClick={quickAdd}
            aria-label={t("cart.add")}
            className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-semibold uppercase tracking-widest text-black opacity-100 transition-all duration-300 sm:translate-y-3 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
            style={{ backgroundColor: added ? "#22c55e" : "#fff", color: added ? "#fff" : "#111" }}
          >
            {added ? <Check size={15} /> : <Plus size={15} />}
            {added ? t("cart.added") : t("cart.add")}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="mb-1 truncate text-[11px] uppercase tracking-widest text-white/45">
          {product.tagline}
        </p>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-sm font-bold uppercase tracking-wider">{product.name}</h3>
          <span
            className="shrink-0 whitespace-nowrap text-sm font-bold"
            style={{ fontFamily: "Anton, sans-serif", color: product.tint }}
          >
            {product.price ? formatDA(product.price) : ""}
          </span>
        </div>
        {product.volume && <p className="mt-1 text-[11px] text-white/40">{product.volume}</p>}
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <div className="aspect-square skeleton" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-2/3 rounded skeleton" />
        <div className="h-4 w-1/2 rounded skeleton" />
      </div>
    </div>
  );
}
