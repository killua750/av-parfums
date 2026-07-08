// Admin layout: role-gated client-side for UX only — every /api/v1/admin/*
// endpoint re-checks IsAdmin server-side.
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { ArrowUpRight, LayoutDashboard, Package, ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/api";
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
  { to: "/admin/products", icon: Package, labelKey: "admin.products", exact: false },
  { to: "/admin/orders", icon: ShoppingBag, labelKey: "admin.orders", exact: false },
] as const;

function AdminLayout() {
  const { t } = useTranslation();
  const { user } = Route.useRouteContext();

  const itemCls =
    "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-white/60 " +
    "hover:bg-white/5 hover:text-white transition " +
    "[&.active]:bg-white/10 [&.active]:text-white";

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: "#0d0d0d" }} dir="ltr">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/10 px-4 pb-5 pt-24 lg:flex">
        <p className="px-4 text-[11px] uppercase tracking-[0.2em] text-white/35 mb-3">
          {t("admin.backoffice")}
        </p>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, icon: Icon, labelKey, exact }) => (
            <Link key={to} to={to} activeOptions={{ exact }} className={itemCls}>
              <Icon size={17} strokeWidth={1.8} />
              {t(labelKey)}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 text-xs text-white/50 hover:text-white transition"
          >
            <ArrowUpRight size={14} /> {t("admin.viewStore")}
          </Link>
          <div className="rounded-xl border border-white/10 px-4 py-3">
            <p className="truncate text-sm font-medium">{user.first_name || user.email}</p>
            <p className="truncate text-xs text-white/40">{user.email}</p>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="px-4 pb-16 pt-24 sm:px-8 lg:pl-[17.5rem]">
        {/* Mobile tab bar */}
        <nav className="mb-6 flex gap-2 overflow-x-auto lg:hidden">
          {NAV.map(({ to, labelKey, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact }}
              className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold [&.active]:bg-white [&.active]:text-black"
            >
              {t(labelKey)}
            </Link>
          ))}
        </nav>
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
