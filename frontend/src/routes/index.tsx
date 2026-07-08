// Home: the signature hero, then a real storefront below the fold —
// featured products, reassurance props, brand story and a closing CTA.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Banknote, Sparkles, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";

import Hero from "@/components/Hero";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AV Parfums — Brumes de luxe" },
      { property: "og:title", content: "AV Parfums — Brumes de luxe" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();
  const { data, isPending } = useProducts({ ordering: "-created_at" });
  const { data: featured = [] } = useFeaturedProducts();
  const products = (data?.results ?? []).slice(0, 4);

  const values = [
    { icon: Banknote, title: t("home.codTitle"), text: t("home.codText") },
    { icon: Truck, title: t("home.shipTitle"), text: t("home.shipText") },
    { icon: Sparkles, title: t("home.qualityTitle"), text: t("home.qualityText") },
  ];

  return (
    <main className="bg-neutral-950 text-white">
      <Hero />

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-white/40">
              {t("home.collectionEyebrow")}
            </p>
            <h2 className="text-3xl sm:text-4xl uppercase" style={{ fontFamily: "Anton, sans-serif" }}>
              {t("home.collectionTitle")}
            </h2>
          </div>
          <Link
            to="/shop"
            className="hidden sm:inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition"
          >
            {t("home.seeAll")} <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isPending
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
        <Link
          to="/shop"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest hover:bg-white hover:text-black transition sm:hidden"
        >
          {t("home.seeAll")} <ArrowRight size={15} />
        </Link>
      </section>

      {/* Value props */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-8 md:grid-cols-3">
          {values.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15">
                <Icon size={19} strokeWidth={1.7} />
              </div>
              <div>
                <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider">{title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Brand story */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-8 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-white/40">
            {t("home.storyEyebrow")}
          </p>
          <h2
            className="mb-5 text-3xl sm:text-4xl uppercase leading-tight"
            style={{ fontFamily: "Anton, sans-serif" }}
          >
            {t("home.storyTitle")}
          </h2>
          <p className="mb-7 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
            {t("home.storyText")}
          </p>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold uppercase tracking-widest hover:bg-white hover:text-black transition"
          >
            {t("home.storyCta")} <ArrowRight size={15} />
          </Link>
        </div>
        <div className="relative mx-auto flex h-80 w-full max-w-md items-center justify-center sm:h-96">
          {featured.slice(0, 2).map((p, i) => (
            <div
              key={p.slug}
              className="absolute flex h-64 w-48 items-center justify-center rounded-3xl sm:h-80 sm:w-60"
              style={{
                backgroundColor: p.tint + "38",
                border: `1px solid ${p.tint}55`,
                transform: i === 0 ? "rotate(-6deg) translateX(-38%)" : "rotate(6deg) translateX(38%)",
                zIndex: i === 0 ? 1 : 2,
              }}
            >
              {p.bottle_image && (
                <img
                  src={p.bottle_image}
                  alt={p.name}
                  loading="lazy"
                  className="h-[85%] w-auto object-contain drop-shadow-2xl"
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-8">
          <h2
            className="mb-6 text-3xl sm:text-5xl uppercase leading-tight"
            style={{ fontFamily: "Anton, sans-serif" }}
          >
            {t("home.ctaTitle")}
          </h2>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold uppercase tracking-widest text-black hover:bg-white/90 transition"
          >
            {t("home.ctaButton")} <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
