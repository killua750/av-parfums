// Admin customers: directory aggregated by delivery phone (COD guests), with
// lifetime spend, VIP flag, and a per-customer order-history drawer.
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, MapPin, Phone, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Panel, VIZ } from "@/components/admin/viz";
import { api } from "@/lib/api";
import { formatDA, formatDACompact } from "@/lib/format";
import type { Customer, CustomersResponse, Order, OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({ meta: [{ title: "Admin · Clients — AV Parfums" }] }),
  component: AdminCustomers,
});

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#eab308",
  confirmed: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

function AdminCustomers() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);

  const { data, isPending } = useQuery<CustomersResponse>({
    queryKey: ["admin", "customers"],
    queryFn: () => api<CustomersResponse>("/api/v1/admin/customers/"),
  });

  const customers = useMemo(() => {
    const list = data?.customers ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.wilaya.toLowerCase().includes(q),
    );
  }, [data, query]);

  const dateLocale = i18n.language === "ar" ? "ar-DZ" : i18n.language === "en" ? "en" : "fr";
  const dateFmt = new Intl.DateTimeFormat(dateLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const vipCount = customers.filter((c) => c.is_vip).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl uppercase" style={{ fontFamily: "Anton, sans-serif" }}>
          {t("admin.customers")}
          <span className="ml-3 align-middle font-sans text-sm normal-case text-white/40">
            {customers.length} · {t("admin.vipCount", { count: vipCount })}
          </span>
        </h1>
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.searchCustomers")}
            className="w-64 rounded-full border border-white/15 bg-transparent py-2 pl-9 pr-4 text-sm placeholder:text-white/30 transition focus:border-white/40 focus:outline-none"
          />
        </div>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl skeleton" />
          ))}
        </div>
      ) : (
        <Panel title="" className="!p-0 overflow-hidden [&>header]:hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left text-[11px] uppercase tracking-widest"
                  style={{ color: VIZ.muted }}
                >
                  <th className="px-5 py-3.5 font-medium">{t("admin.customer")}</th>
                  <th className="px-5 py-3.5 font-medium">{t("admin.wilaya")}</th>
                  <th className="px-5 py-3.5 font-medium text-right">
                    {t("admin.ordersCountCol")}
                  </th>
                  <th className="px-5 py-3.5 font-medium text-right">{t("admin.totalSpent")}</th>
                  <th className="px-5 py-3.5 font-medium text-right">{t("admin.avgOrder")}</th>
                  <th className="px-5 py-3.5 font-medium">{t("admin.lastOrder")}</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm"
                      style={{ color: VIZ.muted }}
                    >
                      {t("admin.noResults")}
                    </td>
                  </tr>
                )}
                {customers.map((c) => (
                  <tr
                    key={c.phone}
                    onClick={() => setSelected(c)}
                    className="cursor-pointer border-t border-white/[0.06] transition hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.name || "—"}</span>
                        {c.is_vip && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{ color: "#eab308", backgroundColor: "#eab30820" }}
                          >
                            <Crown size={11} /> VIP
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: VIZ.muted }}>
                        {c.phone}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-white/70">{c.wilaya || "—"}</td>
                    <td
                      className="px-5 py-3 text-right"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      <span className="font-medium">{c.orders}</span>
                      <span className="text-xs" style={{ color: VIZ.muted }}>
                        {" "}
                        · {c.delivered} {t("order.status.delivered").toLowerCase()}
                      </span>
                    </td>
                    <td
                      className="px-5 py-3 text-right font-semibold"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatDA(c.spent)}
                    </td>
                    <td
                      className="px-5 py-3 text-right"
                      style={{ fontVariantNumeric: "tabular-nums", color: VIZ.secondary }}
                    >
                      {formatDACompact(c.aov)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-white/60">
                      {c.last_order ? dateFmt.format(new Date(c.last_order)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {selected && (
        <CustomerDrawer
          customer={selected}
          onClose={() => setSelected(null)}
          dateLocale={dateLocale}
          statusColors={STATUS_COLORS}
        />
      )}
    </div>
  );
}

function CustomerDrawer({
  customer,
  onClose,
  dateLocale,
  statusColors,
}: {
  customer: Customer;
  onClose: () => void;
  dateLocale: string;
  statusColors: Record<OrderStatus, string>;
}) {
  const { t } = useTranslation();
  const { data: orders, isPending } = useQuery<Order[]>({
    queryKey: ["admin", "customer-orders", customer.phone],
    queryFn: () =>
      api<Order[]>(`/api/v1/admin/customers/orders/?phone=${encodeURIComponent(customer.phone)}`),
  });
  const dateFmt = new Intl.DateTimeFormat(dateLocale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label={t("cart.close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        className="relative h-full w-full max-w-md overflow-y-auto border-l border-white/10 p-6"
        style={{ backgroundColor: "#161615" }}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{customer.name || "—"}</h2>
              {customer.is_vip && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ color: "#eab308", backgroundColor: "#eab30820" }}
                >
                  <Crown size={11} /> VIP
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm" style={{ color: VIZ.secondary }}>
              <Phone size={13} /> {customer.phone}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm" style={{ color: VIZ.muted }}>
              <MapPin size={13} /> {customer.wilaya}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t("cart.close")}
            className="rounded-full p-2 hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            [t("admin.totalSpent"), formatDACompact(customer.spent)],
            [t("admin.ordersCountCol"), String(customer.orders)],
            [t("admin.avgOrder"), formatDACompact(customer.aov)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 px-3 py-2.5 text-center">
              <p className="text-base font-semibold text-white">{value}</p>
              <p
                className="mt-0.5 text-[10px] uppercase tracking-wider"
                style={{ color: VIZ.muted }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        <p className="mb-3 text-[11px] uppercase tracking-widest" style={{ color: VIZ.muted }}>
          {t("admin.orderHistory")}
        </p>
        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl skeleton" />
            ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {(orders ?? []).map((o) => (
              <li key={o.number} className="rounded-xl border border-white/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold tracking-wide">{o.number}</span>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{
                      color: statusColors[o.status],
                      backgroundColor: statusColors[o.status] + "26",
                    }}
                  >
                    {t(`order.status.${o.status}`)}
                  </span>
                </div>
                <div
                  className="mt-1 flex items-center justify-between text-xs"
                  style={{ color: VIZ.muted }}
                >
                  <span>{dateFmt.format(new Date(o.created_at))}</span>
                  <span className="font-medium text-white">{formatDA(o.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
