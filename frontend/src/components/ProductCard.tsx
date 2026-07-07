import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { formatDA } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { t } = useTranslation();
  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-white/25 transition"
    >
      <div
        className="aspect-square flex items-center justify-center p-6 transition-colors duration-500"
        style={{ backgroundColor: product.tint + "33" }}
      >
        {product.bottle_image ? (
          <img
            src={product.bottle_image}
            alt={product.name}
            loading="lazy"
            className="max-h-full w-auto object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-16 h-32 rounded-lg" style={{ backgroundColor: product.tint }} />
        )}
      </div>
      <div className="p-4">
        <p className="text-[11px] uppercase tracking-widest text-white/50 mb-1">
          {product.tagline}
        </p>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold uppercase tracking-wider text-sm">{product.name}</h3>
          <span
            className="font-bold text-sm whitespace-nowrap"
            style={{ fontFamily: "Anton, sans-serif", color: product.tint }}
          >
            {product.price ? formatDA(product.price) : ""}
          </span>
        </div>
        {!product.in_stock && <p className="mt-1 text-xs text-red-400">{t("shop.outOfStock")}</p>}
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10">
      <div className="aspect-square skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-2/3 rounded skeleton" />
        <div className="h-4 w-1/2 rounded skeleton" />
      </div>
    </div>
  );
}
