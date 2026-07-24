// Admin layout: its own back-office chrome (topbar + sidebar), fully separate
// from the storefront. Role-gated client-side for UX only — every
// /api/v1/admin/* endpoint re-checks IsAdmin server-side.
import { useState } from "react";
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import {
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Ticket,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useLogout } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { LANGUAGES } from "@/i18n";
import type { User } from "@/lib/types";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData({
      queryKey: ["auth", "me"],
      queryFn: async (): Promise<User | null> => {
        try {
          return await api<User>("/api/v1/auth/me/");
        } catch {
          return null;
        }
      },
      staleTime: 5 * 60 * 1000,
    });
    if (!user) throw redirect({ to: "/login" });
    if (user.role !== "admin") throw redirect({ to: "/" });
    return { user };
  },
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", icon: LayoutDashboard, labelKey: "admin.overview", exact: true },
  { to: "/admin/orders", icon: ShoppingBag, labelKey: "admin.orders", exact: false },
  { to: "/admin/products", icon: Package, labelKey: "admin.products", exact: false },
  { to: "/admin/customers", icon: Users, labelKey: "admin.customers", exact: false },
  { to: "/admin/promos", icon: Ticket, labelKey: "admin.promos", exact: false },
  { to: "/admin/settings", icon: Settings, labelKey: "admin.settings", exact: false },
] as const;

function AdminLayout() {
  const { t, i18n } = useTranslation();
  const { user } = Route.useRouteContext();
  const logout = useLogout();
  const [mobileNav, setMobileNav] = useState(false);

  const itemCls =
    "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-white/60 " +
    "hover:bg-white/5 hover:text-white transition " +
    "[&.active]:bg-white/10 [&.active]:text-white";

  const navLinks = (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, icon: Icon, labelKey, exact }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact }}
          onClick={() => setMobileNav(false)}
          className={itemCls}
        >
          <Icon size={17} strokeWidth={1.8} />
          {t(labelKey)}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: "#0d0d0d" }} dir="ltr">
      {/* Topbar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#0d0d0d]/90 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileNav((o) => !o)}
            aria-label="Menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 lg:hidden"
          >
            {mobileNav ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link to="/admin" className="flex items-center gap-2.5">
            <span className="text-sm font-bold uppercase tracking-[0.28em]">AV · Parfums</span>
            <span className="hidden rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50 sm:inline">
              {t("admin.backoffice")}
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="mr-1 hidden items-center gap-0.5 sm:flex">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => void i18n.changeLanguage(lang.code)}
                className={`rounded px-1.5 py-1 text-[11px] transition ${
                  i18n.language === lang.code
                    ? "bg-white font-bold text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
          <Link
            to="/"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <ArrowUpRight size={14} /> {t("admin.viewStore")}
          </Link>
          <button
            onClick={() => logout.mutate()}
            aria-label={t("nav.logout")}
            className="flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={15} />
            <span className="hidden md:inline">{t("nav.logout")}</span>
          </button>
        </div>
      </header>

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/10 px-4 pb-5 pt-20 lg:flex">
        <p className="mb-3 px-4 text-[11px] uppercase tracking-[0.2em] text-white/35">
          {t("admin.menu")}
        </p>
        {navLinks}
        <div className="mt-auto rounded-xl border border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold uppercase">
              {(user.first_name || user.email)[0]}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.first_name || t("admin.admin")}</p>
              <p className="truncate text-xs text-white/40">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile nav drawer */}
      {mobileNav && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-30 border-b border-white/10 bg-[#0d0d0d]/98 px-4 py-4 backdrop-blur-xl lg:hidden">
          {navLinks}
        </div>
      )}

      {/* Content */}
      <main className="px-4 pb-16 pt-24 sm:px-8 lg:pl-[17.5rem]">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
