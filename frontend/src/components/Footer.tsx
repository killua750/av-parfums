import { Link, useRouterState } from "@tanstack/react-router";
import { Banknote, Instagram, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // The back office has its own chrome.
  if (pathname.startsWith("/admin")) return null;
  // The home page already carries a full trust strip + how-it-works, so the
  // footer's reassurance band would be redundant there.
  const showReassurance = pathname !== "/";

  const colTitle = "text-[11px] uppercase tracking-[0.2em] text-white/40 mb-4";
  const link = "block text-sm text-white/60 hover:text-white transition py-1";

  return (
    <footer className="border-t border-white/10 bg-[#0a0a0a] text-white">
      {/* Reassurance strip (hidden on home, which already has a trust strip) */}
      {showReassurance && (
        <div className="border-b border-white/10">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-8">
            <div className="flex items-center gap-4">
              <Truck size={22} strokeWidth={1.6} className="shrink-0 text-white/70" />
              <div>
                <p className="text-sm font-semibold">{t("footer.shippingTitle")}</p>
                <p className="text-xs text-white/50">{t("footer.shippingText")}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Banknote size={22} strokeWidth={1.6} className="shrink-0 text-white/70" />
              <div>
                <p className="text-sm font-semibold">{t("footer.codTitle")}</p>
                <p className="text-xs text-white/50">{t("footer.codText")}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Columns */}
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        <div>
          <p
            className="mb-3 text-sm font-bold uppercase tracking-[0.28em]"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            AV · Parfums
          </p>
          <p className="max-w-xs text-sm leading-relaxed text-white/50">{t("footer.tagline")}</p>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="mt-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/40 transition"
          >
            <Instagram size={16} />
          </a>
        </div>
        <nav>
          <p className={colTitle}>{t("footer.shop")}</p>
          <Link to="/shop" className={link}>
            {t("nav.shop")}
          </Link>
          <Link to="/shop" search={{ ordering: "-created_at" }} className={link}>
            {t("nav.new")}
          </Link>
        </nav>
        <nav>
          <p className={colTitle}>{t("footer.help")}</p>
          <Link to="/about" className={link}>
            {t("nav.about")}
          </Link>
          <Link to="/contact" className={link}>
            {t("nav.contact")}
          </Link>
        </nav>
        <nav>
          <p className={colTitle}>{t("footer.account")}</p>
          <Link to="/account" className={link}>
            {t("nav.account")}
          </Link>
          <Link to="/cart" className={link}>
            {t("cart.title")}
          </Link>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-white/35 sm:px-8">
          <p>
            © {new Date().getFullYear()} AV Parfums — {t("footer.rights")}
          </p>
          <p>{t("footer.madeIn")}</p>
        </div>
      </div>
    </footer>
  );
}
