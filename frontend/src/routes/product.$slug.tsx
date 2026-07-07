import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { formatDA } from "@/lib/format";
import { productJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `${params.slug} — AV Parfums` }],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { t } = useTranslation();
  const { slug } = Route.useParams();
  const { data: product, isPending, isError } = useProduct(slug);
  const cart = useCart();
  const [variantId, setVariantId] = useState<number | null>(null);

  if (isPending) {
    return (
      <main className="min-h-screen bg-neutral-950 pt-24 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-10">
          <div className="aspect-square rounded-3xl skeleton" />
          <div className="space-y-4 pt-8">
            <div className="h-10 w-3/4 rounded skeleton" />
            <div className="h-4 w-1/2 rounded skeleton" />
            <div className="h-24 w-full rounded skeleton" />
          </div>
        </div>
      </main>
    );
  }

  if (isError || !product) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white pt-32 text-center">
        <p className="text-white/60">{t("product.notFound")}</p>
        <Link to="/shop" className="inline-flex items-center gap-2 mt-6 text-sm underline">
          <ArrowLeft size={16} /> {t("common.back")}
        </Link>
      </main>
    );
  }

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0] ?? null;

  const add = () => {
    if (!variant) return;
    cart.add(product, variant);
    toast.success(t("cart.added"));
  };

  return (
    <main
      className="min-h-screen text-white pt-24 pb-16 px-4 sm:px-8 transition-colors duration-700"
      style={{
        background: `linear-gradient(180deg, ${product.tint}55 0%, #0a0a0a 60%)`,
      }}
    >
      <script type="application/ld+json">{productJsonLd(product)}</script>
      <div className="max-w-5xl mx-auto">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white mb-8"
        >
          <ArrowLeft size={16} /> {t("common.back")}
        </Link>

        <div className="grid sm:grid-cols-2 gap-10 items-center">
          <div
            className="aspect-square rounded-3xl flex items-center justify-center p-10"
            style={{ backgroundColor: product.tint + "33" }}
          >
            {product.bottle_image && (
              <img
                src={product.bottle_image}
                alt={product.name}
                className="max-h-full w-auto object-contain floating-bottle"
                style={{
                  filter:
                    "drop-shadow(0 40px 40px rgba(0,0,0,0.35)) drop-shadow(0 15px 20px rgba(0,0,0,0.25))",
                }}
              />
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-white/60 mb-2">
              {product.tagline}
            </p>
            <h1
              className="text-4xl sm:text-6xl uppercase mb-4"
              style={{ fontFamily: "Anton, sans-serif" }}
            >
              {product.name}
            </h1>
            <p className="text-white/80 leading-relaxed mb-6">{product.description}</p>

            {product.variants.length > 1 && (
              <div className="flex gap-2 mb-6">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariantId(v.id)}
                    className="px-4 py-2 rounded-full text-sm border transition"
                    style={{
                      borderColor: v.id === variant?.id ? product.tint : "rgba(255,255,255,0.2)",
                      backgroundColor: v.id === variant?.id ? product.tint + "44" : "transparent",
                    }}
                  >
                    {v.size} — {formatDA(v.price)}
                  </button>
                ))}
              </div>
            )}

            <div
              className="text-3xl font-bold mb-6"
              style={{ fontFamily: "Anton, sans-serif", color: product.tint }}
            >
              {variant ? formatDA(variant.price) : ""}
            </div>

            <button
              onClick={add}
              disabled={!variant || !variant.in_stock}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-semibold uppercase tracking-widest bg-white text-black hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingBag size={16} strokeWidth={2.25} />
              {variant && !variant.in_stock ? t("shop.outOfStock") : t("product.addToCart")}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
