import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "À propos — AV Parfums" }] }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useTranslation();
  const steps = [
    { n: "01", title: t("about.step1Title"), text: t("about.step1Text") },
    { n: "02", title: t("about.step2Title"), text: t("about.step2Text") },
    { n: "03", title: t("about.step3Title"), text: t("about.step3Text") },
  ];

  return (
    <main className="min-h-screen bg-neutral-950 pt-28 pb-20 px-4 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-white/40">
          {t("about.eyebrow")}
        </p>
        <h1
          className="mb-6 text-4xl sm:text-5xl uppercase leading-tight"
          style={{ fontFamily: "Anton, sans-serif" }}
        >
          {t("about.title")}
        </h1>
        <p className="mb-4 text-base leading-relaxed text-white/70">{t("about.p1")}</p>
        <p className="mb-12 text-base leading-relaxed text-white/70">{t("about.p2")}</p>

        <h2 className="mb-6 text-sm uppercase tracking-[0.2em] text-white/40">
          {t("about.howTitle")}
        </h2>
        <div className="mb-14 grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-white/10 p-5">
              <p
                className="mb-3 text-3xl text-white/20"
                style={{ fontFamily: "Anton, sans-serif" }}
              >
                {s.n}
              </p>
              <h3 className="mb-1.5 text-sm font-semibold uppercase tracking-wider">{s.title}</h3>
              <p className="text-sm leading-relaxed text-white/50">{s.text}</p>
            </div>
          ))}
        </div>

        <Link
          to="/shop"
          className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold uppercase tracking-widest text-black hover:bg-white/90 transition"
        >
          {t("home.ctaButton")} <ArrowRight size={15} />
        </Link>
      </div>
    </main>
  );
}
