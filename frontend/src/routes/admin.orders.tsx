// Admin order management: period/status/wilaya filters + search, a selection
// summary, CSV export, per-order WhatsApp message + delivery-slip print, and
// legal status transitions (cancellation requires a reason).
import { Fragment, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Download,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  Search,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PeriodFilter, type PeriodValue } from "@/components/admin/PeriodFilter";
import { Panel, VIZ } from "@/components/admin/viz";
import { api, apiErrorMessage } from "@/lib/api";
import { formatDA } from "@/lib/format";
import { inRange, resolvePeriod } from "@/lib/period";
import { buildOrderMessage, whatsappUrl } from "@/lib/whatsapp";
import { printDeliverySlip } from "@/lib/slip";
import type { Order, OrderStatus, Paginated, StoreSettings, Wilaya } from "@/lib/types";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "Admin · Commandes — AV Parfums" }] }),
  component: AdminOrders,
});

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

const CANCEL_REASONS = ["unreachable", "refused", "out_of_zone", "other"] as const;

function AdminOrders() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<PeriodValue>({ preset: "this_month" });
  const [wilaya, setWilaya] = useState("");
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<Order | null>(null);

  const { data, isPending } = useQuery<Paginated<Order>>({
    queryKey: ["admin", "orders"],
    queryFn: () => api<Paginated<Order>>("/api/v1/admin/orders/?page_size=200"),
  });
  const { data: wilayas = [] } = useQuery<Wilaya[]>({
    queryKey: ["wilayas"],
    queryFn: () => api<Wilaya[]>("/api/v1/wilayas/"),
    staleTime: Infinity,
  });
  const { data: settings } = useQuery<StoreSettings>({
    queryKey: ["settings"],
    queryFn: () => api<StoreSettings>("/api/v1/settings/"),
    staleTime: 5 * 60 * 1000,
  });

  const range = useMemo(() => resolvePeriod(period.preset, period.start, period.end), [period]);

  // Period + wilaya + search filter (status handled by the tab count logic).
  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.results ?? []).filter((o) => {
      if (!inRange(o.created_at, range)) return false;
      if (wilaya && String(o.shipping_address?.wilaya) !== wilaya) return false;
      if (q) {
        const hit =
          o.number.toLowerCase().includes(q) ||
          o.shipping_address?.full_name.toLowerCase().includes(q) ||
          o.shipping_address?.phone.includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [data, range, wilaya, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: scoped.length };
    for (const o of scoped) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [scoped]);

  const orders = tab === "all" ? scoped : scoped.filter((o) => o.status === tab);

  // Selection summary: revenue excludes cancelled; cancellation rate over all.
  const summary = useMemo(() => {
    const total = scoped.length;
    const cancelled = scoped.filter((o) => o.status === "cancelled");
    const revenue = scoped
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + parseFloat(o.total), 0);
    return {
      total,
      revenue,
      cancelRate: total ? Math.round((cancelled.length / total) * 1000) / 10 : 0,
    };
  }, [scoped]);

  const setStatus = useMutation({
    mutationFn: (vars: { number: string; status: OrderStatus; cancel_reason?: string }) =>
      api<Order>(`/api/v1/admin/orders/${vars.number}/status/`, {
        method: "POST",
        body: { status: vars.status, cancel_reason: vars.cancel_reason },
      }),
    onSuccess: () => {
      toast.success(t("admin.saved"));
      setCancelling(null);
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

  const openWhatsApp = (order: Order) => {
    window.open(whatsappUrl(settings?.whatsapp_number ?? "", buildOrderMessage(order)), "_blank");
  };

  const exportCsv = () => {
    const head = [
      t("admin.orderNumber"),
      t("admin.date"),
      t("admin.customer"),
      t("admin.phone"),
      t("admin.wilaya"),
      t("admin.commune"),
      t("admin.items"),
      t("order.total"),
      t("admin.status"),
    ];
    const rows = orders.map((o) => [
      o.number,
      new Date(o.created_at).toISOString(),
      o.shipping_address?.full_name ?? "",
      o.shipping_address?.phone ?? "",
      o.shipping_address?.wilaya_name ?? "",
      o.shipping_address?.commune ?? "",
      o.items.map((i) => `${i.product_name} x${i.quantity}`).join(" | "),
      o.total,
      t(`order.status.${o.status}`),
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectCls =
    "rounded-full border border-white/15 bg-transparent px-3 py-2 text-sm text-white/80 [color-scheme:dark] focus:border-white/40 focus:outline-none";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl uppercase" style={{ fontFamily: "Anton, sans-serif" }}>
          {t("admin.orders")}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("admin.searchOrders")}
              className="w-56 rounded-full border border-white/15 bg-transparent py-2 pl-9 pr-4 text-sm placeholder:text-white/30 focus:border-white/40 focus:outline-none transition"
            />
          </div>
          <select value={wilaya} onChange={(e) => setWilaya(e.target.value)} className={selectCls}>
            <option value="">{t("admin.allWilayas")}</option>
            {wilayas.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <PeriodFilter value={period} onChange={setPeriod} />
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/30"
          >
            <Download size={15} /> {t("admin.exportCsv")}
          </button>
        </div>
      </div>

      {/* Selection summary */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <SummaryCard label={t("admin.ordersSelected")} value={String(summary.total)} />
        <SummaryCard label={t("admin.revenueSelected")} value={formatDA(summary.revenue)} />
        <SummaryCard
          label={t("admin.cancelRate")}
          value={`${summary.cancelRate}%`}
          tone={summary.cancelRate > 15 ? VIZ.warning : undefined}
        />
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
                  <th className="px-5 py-3.5 font-medium">{t("admin.wilaya")}</th>
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
                      colSpan={8}
                      className="px-5 py-10 text-center text-sm"
                      style={{ color: VIZ.muted }}
                    >
                      {t("admin.noResults")}
                    </td>
                  </tr>
                )}
                {orders.map((order) => {
                  const expanded = openRow === order.number;
                  return (
                    <Fragment key={order.number}>
                      <tr
                        onClick={() => setOpenRow(expanded ? null : order.number)}
                        className="cursor-pointer border-t border-white/[0.06] transition hover:bg-white/[0.03]"
                      >
                        <td className="px-5 py-3 font-semibold tracking-wide">{order.number}</td>
                        <td className="px-5 py-3">
                          <p className="font-medium">{order.shipping_address?.full_name}</p>
                          <p className="text-xs" style={{ color: VIZ.muted }}>
                            {order.shipping_address?.phone}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-white/70">
                          {order.shipping_address?.wilaya_name}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-white/60">
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
                            className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            style={{
                              color: STATUS_COLORS[order.status],
                              backgroundColor: STATUS_COLORS[order.status] + "26",
                            }}
                          >
                            {t(`order.status.${order.status}`)}
                          </span>
                        </td>
                        <td
                          className="whitespace-nowrap px-5 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            <IconBtn
                              title={t("admin.whatsapp")}
                              onClick={() => openWhatsApp(order)}
                              className="text-green-400 hover:bg-green-500/15"
                            >
                              <MessageCircle size={15} />
                            </IconBtn>
                            <IconBtn
                              title={t("admin.printSlip")}
                              onClick={() => printDeliverySlip(order, settings?.store_name)}
                            >
                              <Printer size={15} />
                            </IconBtn>
                            {NEXT_ACTIONS[order.status].map((action) =>
                              action.status === "cancelled" ? (
                                <button
                                  key="cancel"
                                  onClick={() => setCancelling(order)}
                                  className="rounded-full border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/15"
                                >
                                  {t("admin.cancel")}
                                </button>
                              ) : (
                                <button
                                  key={action.status}
                                  onClick={() =>
                                    setStatus.mutate({
                                      number: order.number,
                                      status: action.status,
                                    })
                                  }
                                  disabled={setStatus.isPending}
                                  className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10 disabled:opacity-50"
                                >
                                  {t(action.labelKey)}
                                </button>
                              ),
                            )}
                          </div>
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
                          <td colSpan={8} className="px-5 py-4">
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
                                {order.status === "cancelled" && order.cancel_reason && (
                                  <p className="mt-3 text-xs text-red-400">
                                    {t("admin.cancelReasonLabel")}: {order.cancel_reason}
                                  </p>
                                )}
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
                                  {order.shipping_address?.commune} —{" "}
                                  {order.shipping_address?.wilaya_name}
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

      {cancelling && (
        <CancelModal
          order={cancelling}
          pending={setStatus.isPending}
          onClose={() => setCancelling(null)}
          onConfirm={(reason) =>
            setStatus.mutate({
              number: cancelling.number,
              status: "cancelled",
              cancel_reason: reason,
            })
          }
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div
      className="rounded-2xl border border-white/10 px-4 py-3"
      style={{ backgroundColor: VIZ.surface }}
    >
      <p className="text-xs" style={{ color: VIZ.muted }}>
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold" style={{ color: tone ?? "#fff" }}>
        {value}
      </p>
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:bg-white/10 ${className}`}
    >
      {children}
    </button>
  );
}

function CancelModal({
  order,
  pending,
  onClose,
  onConfirm,
}: {
  order: Order;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<(typeof CANCEL_REASONS)[number]>("unreachable");
  const [note, setNote] = useState("");
  const value = reason === "other" ? note.trim() : t(`admin.reason.${reason}`);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 p-5"
        style={{ backgroundColor: VIZ.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-white">
            {t("admin.cancelOrder")} {order.number}
          </h3>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <p className="mb-3 text-xs" style={{ color: VIZ.muted }}>
          {t("admin.cancelReasonRequired")}
        </p>
        <div className="space-y-2">
          {CANCEL_REASONS.map((r) => (
            <label
              key={r}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 px-3.5 py-2.5 text-sm has-[:checked]:border-white/40"
            >
              <input
                type="radio"
                name="reason"
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-white"
              />
              {t(`admin.reason.${r}`)}
            </label>
          ))}
          {reason === "other" && (
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("admin.reasonOther")}
              className="w-full rounded-xl border border-white/10 bg-white/[0.07] px-3.5 py-2.5 text-sm placeholder:text-white/30 focus:border-white/40 focus:outline-none"
            />
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            {t("admin.back")}
          </button>
          <button
            disabled={pending || !value}
            onClick={() => onConfirm(value)}
            className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
          >
            {t("admin.confirmCancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
