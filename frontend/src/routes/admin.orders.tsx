// Admin order management: status pipeline tabs, search, expandable rows with
// items + shipping detail, and legal status transitions only.
import { Fragment, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, MapPin, Phone, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Panel, VIZ } from "@/components/admin/viz";
import { api, apiErrorMessage } from "@/lib/api";
import { formatDA } from "@/lib/format";
import type { Order, OrderStatus, Paginated } from "@/lib/types";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "Admin · Commandes — AV Parfums" }] }),
  component: AdminOrders,
});

// Mirrors the backend transition table for showing only legal actions.
const NEXT_ACTIONS: Record<OrderStatus, { status: OrderStatus; labelKey: string }[]> = {
  pending: [
    { status: "confirmed", labelKey: "admin.confirm" },
    { status: "cancelled", labelKey: "admin.cancel" },
  ],
  confirmed: [
    { status: "shipped", labelKey: "admin.ship" },
    { status: "cancelled", labelKey: "admin.cancel" },
  ],
  shipped: [{ status: "delivered", labelKey: "admin.deliver" }],
  delivered: [],
  cancelled: [],
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#eab308",
  confirmed: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

const TABS: ("all" | OrderStatus)[] = [
  "all",
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

function AdminOrders() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const { data, isPending } = useQuery<Paginated<Order>>({
    queryKey: ["admin", "orders"],
    queryFn: () => api<Paginated<Order>>("/api/v1/admin/orders/?page_size=100"),
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data?.results.length ?? 0 };
    for (const o of data?.results ?? []) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [data]);

  const orders = useMemo(() => {
    let list = data?.results ?? [];
    if (tab !== "all") list = list.filter((o) => o.status === tab);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.number.toLowerCase().includes(q) ||
          o.shipping_address?.full_name.toLowerCase().includes(q) ||
          o.shipping_address?.phone.includes(q),
      );
    }
    return list;
  }, [data, tab, query]);

  const setStatus = useMutation({
    mutationFn: (vars: { number: string; status: OrderStatus }) =>
      api<Order>(`/api/v1/admin/orders/${vars.number}/status/`, {
        method: "POST",
        body: { status: vars.status },
      }),
    onSuccess: () => {
      toast.success(t("admin.saved"));
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, t("common.error"))),
  });

  const dateLocale = i18n.language === "ar" ? "ar-DZ" : i18n.language === "en" ? "en" : "fr";
  const dateFmt = new Intl.DateTimeFormat(dateLocale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl uppercase" style={{ fontFamily: "Anton, sans-serif" }}>
          {t("admin.orders")}
        </h1>
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.searchOrders")}
            className="w-64 rounded-full border border-white/15 bg-transparent py-2 pl-9 pr-4 text-sm placeholder:text-white/30 focus:border-white/40 focus:outline-none transition"
          />
        </div>
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
              tab === s
                ? "border-white bg-white text-black"
                : "border-white/15 text-white/60 hover:text-white"
            }`}
          >
            {s === "all" ? t("admin.all") : t(`order.status.${s}`)}
            {counts[s] ? ` · ${counts[s]}` : ""}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
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
                  <th className="px-5 py-3.5 font-medium">{t("admin.orderNumber")}</th>
                  <th className="px-5 py-3.5 font-medium">{t("admin.customer")}</th>
                  <th className="px-5 py-3.5 font-medium">{t("admin.date")}</th>
                  <th className="px-5 py-3.5 font-medium text-right">{t("order.total")}</th>
                  <th className="px-5 py-3.5 font-medium">{t("admin.status")}</th>
                  <th className="px-5 py-3.5 font-medium text-right">{t("admin.actions")}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-10 text-center text-sm"
                      style={{ color: VIZ.muted }}
                    >
                      {t("admin.noResults")}
                    </td>
                  </tr>
                )}
                {orders.map((order) => {
                  const expanded = open === order.number;
                  return (
                    <Fragment key={order.number}>
                      <tr
                        onClick={() => setOpen(expanded ? null : order.number)}
                        className="cursor-pointer border-t border-white/[0.06] hover:bg-white/[0.03] transition"
                      >
                        <td className="px-5 py-3 font-semibold tracking-wide">{order.number}</td>
                        <td className="px-5 py-3">
                          <p className="font-medium">{order.shipping_address?.full_name}</p>
                          <p className="text-xs" style={{ color: VIZ.muted }}>
                            {order.shipping_address?.phone}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-white/60 whitespace-nowrap">
                          {dateFmt.format(new Date(order.created_at))}
                        </td>
                        <td
                          className="px-5 py-3 text-right font-semibold"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {formatDA(order.total)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
                            style={{
                              color: STATUS_COLORS[order.status],
                              backgroundColor: STATUS_COLORS[order.status] + "26",
                            }}
                          >
                            {t(`order.status.${order.status}`)}
                          </span>
                        </td>
                        <td
                          className="px-5 py-3 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {NEXT_ACTIONS[order.status].map((action) => (
                            <button
                              key={action.status}
                              onClick={() =>
                                setStatus.mutate({ number: order.number, status: action.status })
                              }
                              disabled={setStatus.isPending}
                              className={`ml-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                                action.status === "cancelled"
                                  ? "border-red-500/40 text-red-400 hover:bg-red-500/15"
                                  : "border-white/25 hover:bg-white/10"
                              }`}
                            >
                              {t(action.labelKey)}
                            </button>
                          ))}
                        </td>
                        <td className="pr-4 text-white/40">
                          <ChevronDown
                            size={16}
                            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                          />
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-t border-white/[0.06] bg-white/[0.02]">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="grid gap-6 sm:grid-cols-2">
                              <div>
                                <p
                                  className="mb-2 text-[11px] uppercase tracking-widest"
                                  style={{ color: VIZ.muted }}
                                >
                                  {t("admin.items")}
                                </p>
                                <ul className="space-y-1.5">
                                  {order.items.map((item) => (
                                    <li
                                      key={item.id}
                                      className="flex items-center justify-between gap-3 text-sm"
                                    >
                                      <span className="text-white/80">
                                        {item.product_name}{" "}
                                        <span style={{ color: VIZ.muted }}>
                                          {item.variant_size} × {item.quantity}
                                        </span>
                                      </span>
                                      <span style={{ fontVariantNumeric: "tabular-nums" }}>
                                        {formatDA(parseFloat(item.unit_price) * item.quantity)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p
                                  className="mb-2 text-[11px] uppercase tracking-widest"
                                  style={{ color: VIZ.muted }}
                                >
                                  {t("order.shippingTo")}
                                </p>
                                <p className="text-sm font-medium">
                                  {order.shipping_address?.full_name}
                                </p>
                                <p
                                  className="mt-1 flex items-center gap-1.5 text-sm"
                                  style={{ color: VIZ.secondary }}
                                >
                                  <Phone size={13} /> {order.shipping_address?.phone}
                                </p>
                                <p
                                  className="mt-1 flex items-start gap-1.5 text-sm"
                                  style={{ color: VIZ.secondary }}
                                >
                                  <MapPin size={13} className="mt-0.5 shrink-0" />
                                  {order.shipping_address?.address},{" "}
                                  {order.shipping_address?.commune}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
