import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, ShieldCheck, ShoppingBag, User as UserIcon, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCart } from "@/hooks/useCart";
import { useIsAdmin, useUser } from "@/hooks/useAuth";
import { LANGUAGES } from "@/i18n";

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { count, toggleCart } = useCart();
  const { data: user } = useUser();
  const isAdmin = useIsAdmin();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close the mobile menu on navigation and lock page scroll while open.
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const links = (
    <>
      <Link to="/shop" className="hover:text-white transition">
        {t("nav.shop")}
      </Link>
      <Link to="/shop" search={{ ordering: "-created_at" }} className="hover:text-white transition">
        {t("nav.new")}
      </Link>
      <Link to="/about" className="hover:text-white transition">
        {t("nav.about")}
      </Link>
      <Link to="/contact" className="hover:text-white transition">
        {t("nav.contact")}
      </Link>
      {isAdmin && (
        <Link to="/admin" className="hover:text-white transition inline-flex items-center gap-1">
          <ShieldCheck size={14} />
          {t("nav.admin")}
        </Link>
      )}
    </>
  );

  const languageSwitcher = (
    <div className="flex items-center gap-1">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => void i18n.changeLanguage(lang.code)}
          className={`px-2 py-1 text-[11px] rounded transition ${
            i18n.language === lang.code
              ? "bg-white text-black font-bold"
              : "text-white/70 hover:text-white"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-md bg-white/10 border-b border-white/15"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 h-14 sm:h-16">
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? t("cart.close") : t("nav.menu")}
            aria-expanded={menuOpen}
            className="md:hidden -ml-2 w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link
            to="/"
            className="text-white font-bold uppercase tracking-[0.28em] text-xs sm:text-sm"
          >
            AV · Parfums
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-8 text-white/90 text-sm uppercase tracking-widest">
          {links}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden md:block mr-2">{languageSwitcher}</div>

          <Link
            to={user ? "/account" : "/login"}
            aria-label={user ? t("nav.account") : t("nav.login")}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition"
          >
            <UserIcon size={20} strokeWidth={2} />
          </Link>

          <button
            onClick={toggleCart}
            aria-label={t("nav.openCart")}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition"
          >
            <ShoppingBag size={20} strokeWidth={2} />
            {count > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-[11px] font-bold flex items-center justify-center bg-white text-black"
                style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.3)" }}
              >
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu panel. Note: the nav's backdrop-filter makes it the
          containing block, so `fixed` would collapse — anchor below the bar
          with absolute + explicit height instead. */}
      {menuOpen && (
        <div
          className="md:hidden absolute inset-x-0 top-full overflow-y-auto bg-black/95 backdrop-blur-xl"
          style={{ height: "calc(100vh - 3.5rem)" }}
        >
          <div className="flex flex-col gap-6 px-6 py-8 text-white/90 text-base uppercase tracking-widest">
            {links}
            <div className="pt-4 border-t border-white/10">{languageSwitcher}</div>
          </div>
        </div>
      )}
    </nav>
  );
}
