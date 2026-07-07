// Admin layout: role-gated client-side for UX only — every /api/v1/admin/*
// endpoint re-checks IsAdmin server-side.
import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
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

function AdminLayout() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-neutral-950 text-white pt-24 pb-16 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl uppercase mb-6" style={{ fontFamily: "Anton, sans-serif" }}>
          {t("admin.title")}
        </h1>
        <nav className="flex gap-2 mb-8">
          <Link
            to="/admin/products"
            className="px-5 py-2.5 rounded-full text-sm font-semibold border border-white/15 hover:bg-white/10 transition [&.active]:bg-white [&.active]:text-black"
          >
            {t("admin.products")}
          </Link>
          <Link
            to="/admin/orders"
            className="px-5 py-2.5 rounded-full text-sm font-semibold border border-white/15 hover:bg-white/10 transition [&.active]:bg-white [&.active]:text-black"
          >
            {t("admin.orders")}
          </Link>
        </nav>
        <Outlet />
      </div>
    </main>
  );
}
