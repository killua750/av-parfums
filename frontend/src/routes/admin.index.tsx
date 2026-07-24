// Back-office overview: period-filtered KPIs with vs-previous comparison,
// revenue trend, status donut, top products / wilayas, an orders heatmap,
// low-stock alerts and latest orders. Every figure respects the period filter.
import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  Package,
  Receipt,
  ShoppingBag,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { OrdersHeatmap, RankBars, RevenueArea, StatusDonut } from "@/components/admin/charts";
import { PeriodFilter, type PeriodValue } from "@/components/admin/PeriodFilter";
import { Panel, StatTile, VIZ } from "@/components/admin/viz";
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

function AdminOverview() {
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState<PeriodValue>({ preset: "this_month" });

  const params = new URLSearchParams({ period: period.preset });
  if (period.preset === "custom" && period.start && period.end) {
    params.set("start", period.start);
    params.set("end", period.end);
  }

  const { data, isPending } = useQuery<DashboardData>({
    queryKey: ["admin", "dashboard", period],
    queryFn: () => api<DashboardData>(`/api/v1/admin/dashboard/?${params.toString()}`),
    placeholderData: (prev) => prev,
  });

  if (isPending || !data) return <DashboardSkeleton />;

  const { current, previous } = data.totals;
  const vsPrev = t("admin.vsPrevious");
  const dateLocale = i18n.language === "ar" ? "ar-DZ" : i18n.language === "en" ? "en" : "fr";
  const dowLabels = t("admin.dowShort", { returnObjects: true }) as string[];

  const seriesNum = data.series.map((s) => ({
    bucket: s.bucket,
    revenue: parseFloat(s.revenue),
    orders: s.orders,
  }));
  const periodTotal = STATUS_ORDER.reduce((n, s) => n + (data.status_counts[s] ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Header + period filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl uppercase" style={{ fontFamily: "Anton, sans-serif" }}>
            {t("admin.overview")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: VIZ.muted }}>
            {t("admin.overviewLive")}
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Primary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={t("admin.revenue")}
          value={formatDACompact(current.revenue)}
          delta={pctDelta(parseFloat(current.revenue), parseFloat(previous.revenue))}
          deltaLabel={vsPrev}
          icon={<Banknote size={16} />}
          spark={seriesNum.map((s) => s.revenue)}
        />
        <StatTile
          label={t("admin.orders")}
          value={String(current.orders)}
          delta={pctDelta(current.orders, previous.orders)}
          deltaLabel={vsPrev}
          icon={<ShoppingBag size={16} />}
          spark={seriesNum.map((s) => s.orders)}
        />
        <StatTile
          label={t("admin.avgOrder")}
          value={formatDACompact(current.aov)}
          delta={pctDelta(parseFloat(current.aov), parseFloat(previous.aov))}
          deltaLabel={vsPrev}
          icon={<Receipt size={16} />}
        />
        <StatTile
          label={t("admin.itemsSold")}
          value={String(current.units)}
          delta={pctDelta(current.units, previous.units)}
          deltaLabel={vsPrev}
          icon={<Package size={16} />}
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat
          icon={<Wallet size={16} />}
          label={t("admin.allTimeRevenue")}
          value={formatDACompact(data.totals.revenue_all_time)}
          hint={t("admin.allTime")}
        />
        <MiniStat
          icon={<Clock size={16} />}
          label={t("admin.openOrders")}
          value={String(data.totals.open_orders)}
          hint={t("admin.needsAction")}
          highlight={data.totals.open_orders > 0}
        />
        <MiniStat
          icon={<AlertTriangle size={16} />}
          label={t("admin.cancelRate")}
          value={`${data.totals.cancel_rate}%`}
          hint={t("admin.periodPrev", { value: data.totals.cancel_rate_prev })}
        />
        <MiniStat
          icon={<UserPlus size={16} />}
          label={t("admin.newCustomers")}
          value={String(data.totals.new_customers)}
          hint={t("admin.thisPeriod")}
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
        {periodTotal === 0 ? (
          <Empty text={t("admin.noData")} />
        ) : (
          <RevenueArea
            data={seriesNum}
            granularity={data.period.granularity}
            locale={dateLocale}
            formatValue={formatDA}
          />
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status donut */}
        <Panel title={t("admin.statusBreakdown")}>
          {periodTotal === 0 ? (
            <Empty text={t("admin.noData")} />
          ) : (
            <StatusDonut
              total={periodTotal}
              centerLabel={t("admin.ordersLabel")}
              data={STATUS_ORDER.filter((s) => data.status_counts[s]).map((s) => ({
                key: s,
                label: t(`order.status.${s}`),
                value: data.status_counts[s] ?? 0,
                color: STATUS_COLORS[s],
              }))}
            />
          )}
        </Panel>

        {/* Top products by revenue */}
        <Panel title={t("admin.topProducts")}>
          {data.top_products.length === 0 ? (
            <Empty text={t("admin.noData")} />
          ) : (
            <RankBars
              palette="product"
              formatValue={formatDA}
              items={data.top_products.map((p) => ({
                name: p.name,
                value: parseFloat(p.revenue),
                sub: t("admin.unitsSold", { count: p.units }),
              }))}
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sales by wilaya */}
        <Panel title={t("admin.topWilayas")}>
          {data.top_wilayas.length === 0 ? (
            <Empty text={t("admin.noData")} />
          ) : (
            <RankBars
              formatValue={formatDA}
              items={data.top_wilayas.map((w) => ({
                name: w.name,
                value: parseFloat(w.revenue),
                sub: t("admin.ordersCount", { count: w.orders }),
              }))}
            />
          )}
        </Panel>

        {/* Top products by quantity */}
        <Panel title={t("admin.topProductsQty")}>
          {data.top_products_qty.length === 0 ? (
            <Empty text={t("admin.noData")} />
          ) : (
            <RankBars
              palette="product"
              formatValue={(v) => t("admin.unitsShort", { count: v })}
              items={data.top_products_qty.map((p) => ({
                name: p.name,
                value: p.units,
                sub: formatDACompact(p.revenue),
              }))}
            />
          )}
        </Panel>
      </div>

      {/* Heatmap */}
      <Panel
        title={t("admin.heatmapTitle")}
        action={
          <span className="text-xs" style={{ color: VIZ.muted }}>
            {t("admin.heatmapSub")}
          </span>
        }
      >
        {data.heatmap.length === 0 ? (
          <Empty text={t("admin.noData")} />
        ) : (
          <OrdersHeatmap cells={data.heatmap} dowLabels={dowLabels} />
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {/* Low stock */}
        <Panel title={t("admin.lowStock")}>
          {data.low_stock.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span
                className="mb-3 flex h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: VIZ.good + "1f", color: VIZ.good }}
              >
                <CheckCircle2 size={20} />
              </span>
              <p className="text-sm font-medium text-white">{t("admin.stockHealthy")}</p>
              <p className="mt-1 text-xs" style={{ color: VIZ.muted }}>
                {t("admin.stockHealthyHint")}
              </p>
            </div>
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
            <Link to="/admin/orders" className="text-xs text-white/50 transition hover:text-white">
              {t("admin.seeAll")} →
            </Link>
          }
        >
          {data.recent_orders.length === 0 ? (
            <Empty text={t("admin.noData")} />
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
                      {" · "}
                      {t("admin.itemsCount", { count: o.items_count })}
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

function Empty({ text }: { text: string }) {
  return (
    <p className="py-10 text-center text-sm" style={{ color: VIZ.muted }}>
      {text}
    </p>
  );
}

function MiniStat({
  icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border px-4 py-3.5"
      style={{
        backgroundColor: VIZ.surface,
        borderColor: highlight ? VIZ.warning + "66" : "rgba(255,255,255,0.1)",
      }}
    >
      <div className="mb-2 flex items-center gap-2" style={{ color: VIZ.muted }}>
        <span style={{ color: highlight ? VIZ.warning : VIZ.muted }}>{icon}</span>
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-semibold text-white">{value}</p>
      <p className="mt-0.5 text-[11px]" style={{ color: VIZ.muted }}>
        {hint}
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl skeleton" />
        ))}
      </div>
      <div className="h-20 rounded-2xl skeleton" />
      <div className="h-80 rounded-2xl skeleton" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-2xl skeleton" />
        <div className="h-64 rounded-2xl skeleton" />
      </div>
    </div>
  );
}
