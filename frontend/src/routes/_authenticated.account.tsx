import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useLogout, useUser } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { formatDA } from "@/lib/format";
import type { Order, Paginated } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Mon compte — AV Parfums" }] }),
  component: AccountPage,
});

const STATUS_COLORS: Record<string, string> = {
  pending: "#eab308",
  confirmed: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

function AccountPage() {
  const { t } = useTranslation();
  const { data: user } = useUser();
  const logout = useLogout();
  const { data: orders } = useQuery<Paginated<Order>>({
    queryKey: ["orders"],
    queryFn: () => api<Paginated<Order>>("/api/v1/orders/"),
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-white pt-24 pb-16 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-4xl uppercase" style={{ fontFamily: "Anton, sans-serif" }}>
            {t("account.title")}
          </h1>
          <button
            onClick={() => logout.mutate()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-sm hover:bg-white/10 transition"
          >
            <LogOut size={14} /> {t("nav.logout")}
          </button>
        </div>

        <section className="mb-10 rounded-2xl border border-white/10 p-5">
          <h2 className="text-sm uppercase tracking-widest text-white/50 mb-3">
            {t("account.profile")}
          </h2>
          <p className="font-semibold">{user?.email}</p>
          <p className="text-sm text-white/60">
            {user?.first_name} {user?.last_name} {user?.phone && `· ${user.phone}`}
          </p>
        </section>

        <h2 className="text-sm uppercase tracking-widest text-white/50 mb-3">
          {t("account.orders")}
        </h2>
        {!orders || orders.results.length === 0 ? (
          <p className="text-white/40 py-8">{t("account.noOrders")}</p>
        ) : (
          <ul className="space-y-3">
            {orders.results.map((order) => (
              <li key={order.number}>
                <Link
                  to="/orders/$id"
                  params={{ id: order.number }}
                  className="flex items-center justify-between rounded-2xl border border-white/10 p-5 hover:border-white/30 transition"
                >
                  <div>
                    <p className="font-bold tracking-wider">{order.number}</p>
                    <p className="text-xs text-white/50">
                      {new Date(order.created_at).toLocaleDateString("fr-DZ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: STATUS_COLORS[order.status] + "33",
                        color: STATUS_COLORS[order.status],
                      }}
                    >
                      {t(`order.status.${order.status}`)}
                    </span>
                    <p className="mt-1 font-semibold">{formatDA(order.total)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
