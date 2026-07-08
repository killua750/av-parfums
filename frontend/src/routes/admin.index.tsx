// Back-office overview: KPI tiles with period-over-period deltas, revenue
// trend, order pipeline, top products, low-stock alerts and latest orders.
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AreaChart, BarList, Panel, StatTile, VIZ } from "@/components/admin/viz";
import { api } from "@/lib/api";
import { formatDA, formatDACompact, pctDelta } from "@/lib/format";
import type { DashboardData, OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin · Vue d'ensemble — AV Parfums" }] }),
  component: AdminOverview,
});

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#eab308",
  confirmed: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#22c55e",
  cancelled: "#ef4444",
};

const STATUS_ORDER: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const PERIODS = [7, 30, 90] as const;

function AdminOverview() {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);

  const { data, isPending } = useQuery<DashboardData>({
    queryKey: ["admin", "dashboard", days],
    queryFn: () => api<DashboardData>(`/api/v1/admin/dashboard/?days=${days}`),
    placeholderData: (prev) => prev,
  });

  if (isPending || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl skeleton" />
          ))}
        </div>
        <div className="h-80 rounded-2xl skeleton" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-2xl skeleton" />
          <div className="h-64 rounded-2xl skeleton" />
        </div>
      </div>
    );
  }

  const { current, previous } = data.totals;
  const vsPrev = t("admin.vsPrev", { days });
  const dateLocale = i18n.language === "ar" ? "ar-DZ" : i18n.language === "en" ? "en" : "fr";

  return (
    <div className="space-y-4">
      {/* Header + period filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl uppercase" style={{ fontFamily: "Anton, sans-serif" }}>
          {t("admin.overview")}
        </h1>
        <div className="flex rounded-full border border-white/15 p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setDays(p)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                days === p ? "bg-white text-black" : "text-white/60 hover:text-white"
              }`}
            >
              {t("admin.lastDays", { days: p })}
            </button>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={t("admin.revenue")}
          value={formatDACompact(current.revenue)}
          delta={pctDelta(parseFloat(current.revenue), parseFloat(previous.revenue))}
          deltaLabel={vsPrev}
        />
        <StatTile
          label={t("admin.orders")}
          value={String(current.orders)}
          delta={pctDelta(current.orders, previous.orders)}
          deltaLabel={vsPrev}
        />
        <StatTile
          label={t("admin.avgOrder")}
          value={formatDACompact(current.aov)}
          delta={pctDelta(parseFloat(current.aov), parseFloat(previous.aov))}
          deltaLabel={vsPrev}
        />
        <StatTile
          label={t("admin.newCustomers")}
          value={String(data.totals.new_customers)}
          delta={pctDelta(data.totals.new_customers, data.totals.new_customers_prev)}
          deltaLabel={vsPrev}
        />
      </div>

      {/* Revenue trend */}
      <Panel
        title={t("admin.revenueTrend")}
        action={
          <span className="text-xs" style={{ color: VIZ.muted }}>
            {t("admin.excludesCancelled")}
          </span>
        }
      >
        <AreaChart
          points={data.series.map((s) => ({
            date: s.date,
            value: parseFloat(s.revenue),
            detail: t("admin.ordersCount", { count: s.orders }),
          }))}
          formatValue={formatDA}
          locale={dateLocale}
          height={260}
        />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Order pipeline */}
        <Panel title={t("admin.statusBreakdown")}>
          <BarList
            emptyText={t("admin.noData")}
            items={STATUS_ORDER.filter((s) => data.status_counts[s]).map((s) => ({
              key: s,
              label: (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[s] }}
                  />
                  {t(`order.status.${s}`)}
                </span>
              ),
              value: data.status_counts[s] ?? 0,
              display: String(data.status_counts[s] ?? 0),
            }))}
          />
        </Panel>

        {/* Top products */}
        <Panel title={t("admin.topProducts")}>
          <BarList
            color={VIZ.aqua}
            emptyText={t("admin.noData")}
            items={data.top_products.map((p) => ({
              key: p.name,
              label: `${p.name} · ${t("admin.unitsSold", { count: p.units })}`,
              value: parseFloat(p.revenue),
              display: formatDACompact(p.revenue),
            }))}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Low stock */}
        <Panel title={t("admin.lowStock")}>
          {data.low_stock.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: VIZ.muted }}>
              {t("admin.stockHealthy")}
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {data.low_stock.map((v) => (
                <li key={v.sku} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{v.product}</p>
                    <p className="text-xs" style={{ color: VIZ.muted }}>
                      {v.size} · {v.sku}
                    </p>
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      color: v.stock === 0 ? VIZ.critical : VIZ.warning,
                      backgroundColor: (v.stock === 0 ? VIZ.critical : VIZ.warning) + "1f",
                    }}
                  >
                    <AlertTriangle size={12} />
                    {v.stock === 0
                      ? t("shop.outOfStock")
                      : t("admin.unitsLeft", { count: v.stock })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Recent orders */}
        <Panel
          title={t("admin.recentOrders")}
          action={
            <Link to="/admin/orders" className="text-xs text-white/50 hover:text-white transition">
              {t("admin.seeAll")} →
            </Link>
          }
        >
          {data.recent_orders.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: VIZ.muted }}>
              {t("admin.noData")}
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {data.recent_orders.map((o) => (
                <li key={o.number} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium tracking-wide">
                      {o.number}
                      <span className="ml-2 font-normal" style={{ color: VIZ.muted }}>
                        {o.customer}
                      </span>
                    </p>
                    <p className="text-xs" style={{ color: VIZ.muted }}>
                      {new Intl.DateTimeFormat(dateLocale, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(o.created_at))}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <span
                      className="text-sm font-semibold"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatDA(o.total)}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{
                        color: STATUS_COLORS[o.status],
                        backgroundColor: STATUS_COLORS[o.status] + "26",
                      }}
                    >
                      {t(`order.status.${o.status}`)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
