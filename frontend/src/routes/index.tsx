// Home: the signature hero, then a full storefront below the fold — featured
// collection, trust strip, how-it-works, brand story with stats, testimonials,
// FAQ and a closing CTA. Everything scales to any number of products.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Banknote, ChevronDown, Quote, Sparkles, Star, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";

import Hero from "@/components/Hero";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { useFeaturedProducts } from "@/hooks/useProducts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AV Parfums — Brumes de luxe" },
      { property: "og:title", content: "AV Parfums — Brumes de luxe" },
    ],
  }),
  component: HomePage,
});

interface Testimonial {
  name: string;
  wilaya: string;
  text: string;
}
interface Faq {
  q: string;
  a: string;
}

function HomePage() {
  const { t } = useTranslation();
  // Featured products render instantly from the static CDN assets — no waiting
  // on the (cold-startable) API for the first paint.
  const { data: featured = [], isPending } = useFeaturedProducts();

  const values = [
    { icon: Banknote, title: t("home.codTitle"), text: t("home.codText") },
    { icon: Truck, title: t("home.shipTitle"), text: t("home.shipText") },
    { icon: Sparkles, title: t("home.qualityTitle"), text: t("home.qualityText") },
  ];

  const steps = [1, 2, 3, 4].map((n) => ({
    n,
    title: t(`home.how${n}Title`),
    text: t(`home.how${n}Text`),
  }));

  const stats = [
    { value: String(featured.length || 4), label: t("home.statFragrances") },
    { value: "58", label: t("home.statWilayas") },
    { value: "200ml", label: t("home.statVolume") },
    { value: "100%", label: t("home.statCod") },
  ];

  const testimonials = t("home.testimonials", { returnObjects: true }) as Testimonial[];
  const faqs = t("home.faqs", { returnObjects: true }) as Faq[];

  return (
    <main className="bg-neutral-950 text-white">
      <Hero />

      {/* Featured collection */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-white/40">
              {t("home.collectionEyebrow")}
            </p>
            <h2
              className="text-3xl uppercase sm:text-4xl"
              style={{ fontFamily: "Anton, sans-serif" }}
            >
              {t("home.collectionTitle")}
            </h2>
          </div>
          <Link
            to="/shop"
            className="hidden items-center gap-2 text-sm text-white/60 transition hover:text-white sm:inline-flex"
          >
            {t("home.seeAll")} <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isPending
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
        <Link
          to="/shop"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-widest transition hover:bg-white hover:text-black sm:hidden"
        >
          {t("home.seeAll")} <ArrowRight size={15} />
        </Link>
      </section>

      {/* Trust strip */}
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

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
        <div className="mb-10 text-center">
          <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-white/40">
            {t("home.howEyebrow")}
          </p>
          <h2
            className="text-3xl uppercase sm:text-4xl"
            style={{ fontFamily: "Anton, sans-serif" }}
          >
            {t("home.howTitle")}
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-black"
                  style={{ backgroundColor: "#fff" }}
                >
                  {s.n}
                </span>
                {i < steps.length - 1 && (
                  <span className="hidden h-px flex-1 bg-white/10 lg:block" />
                )}
              </div>
              <h3 className="mb-1.5 text-sm font-semibold uppercase tracking-wider">{s.title}</h3>
              <p className="text-sm leading-relaxed text-white/50">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Brand story + stats */}
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-8 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-white/40">
              {t("home.storyEyebrow")}
            </p>
            <h2
              className="mb-5 text-3xl uppercase leading-tight sm:text-4xl"
              style={{ fontFamily: "Anton, sans-serif" }}
            >
              {t("home.storyTitle")}
            </h2>
            <p className="mb-7 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
              {t("home.storyText")}
            </p>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold uppercase tracking-widest transition hover:bg-white hover:text-black"
            >
              {t("home.storyCta")} <ArrowRight size={15} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-neutral-950 p-6 text-center"
              >
                <p
                  className="text-4xl text-white sm:text-5xl"
                  style={{ fontFamily: "Anton, sans-serif" }}
                >
                  {s.value}
                </p>
                <p className="mt-2 text-xs uppercase tracking-wider text-white/45">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
        <div className="mb-10 text-center">
          <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-white/40">
            {t("home.reviewsEyebrow")}
          </p>
          <h2
            className="text-3xl uppercase sm:text-4xl"
            style={{ fontFamily: "Anton, sans-serif" }}
          >
            {t("home.reviewsTitle")}
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((r) => (
            <figure
              key={r.name}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6"
            >
              <Quote size={22} className="mb-4 text-white/20" />
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="flex-1 text-sm leading-relaxed text-white/70">
                “{r.text}”
              </blockquote>
              <figcaption className="mt-5 border-t border-white/10 pt-4">
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-white/40">{r.wilaya}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-8">
          <div className="mb-10 text-center">
            <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-white/40">
              {t("home.faqEyebrow")}
            </p>
            <h2
              className="text-3xl uppercase sm:text-4xl"
              style={{ fontFamily: "Anton, sans-serif" }}
            >
              {t("home.faqTitle")}
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-white/10 bg-neutral-950 px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                  {f.q}
                  <ChevronDown
                    size={18}
                    className="shrink-0 text-white/40 transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-white/55">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative overflow-hidden border-t border-white/10">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 100% at 50% 0%, rgba(232,139,176,0.16) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 py-24 text-center sm:px-8">
          <h2
            className="mb-5 text-4xl uppercase leading-tight sm:text-5xl"
            style={{ fontFamily: "Anton, sans-serif" }}
          >
            {t("home.ctaTitle")}
          </h2>
          <p className="mx-auto mb-8 max-w-md text-sm text-white/55">{t("home.ctaText")}</p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold uppercase tracking-widest text-black transition hover:bg-white/90"
          >
            {t("home.ctaButton")} <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
