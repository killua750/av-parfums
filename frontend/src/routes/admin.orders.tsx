import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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

function AdminOrders() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data, isPending } = useQuery<Paginated<Order>>({
    queryKey: ["admin", "orders"],
    queryFn: () => api<Paginated<Order>>("/api/v1/admin/orders/"),
  });

  const setStatus = useMutation({
    mutationFn: (vars: { number: string; status: OrderStatus }) =>
      api<Order>(`/api/v1/admin/orders/${vars.number}/status/`, {
        method: "POST",
        body: { status: vars.status },
      }),
    onSuccess: () => {
      toast.success(t("admin.saved"));
      void qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, t("common.error"))),
  });

  if (isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data?.results.length === 0 && (
        <p className="text-white/40 py-8 text-center">{t("account.noOrders")}</p>
      )}
      {data?.results.map((order) => (
        <div
          key={order.number}
          className="rounded-2xl border border-white/10 p-5 flex flex-wrap items-center gap-4 justify-between"
        >
          <div className="min-w-0">
            <p className="font-bold tracking-wider">{order.number}</p>
            <p className="text-xs text-white/50">
              {new Date(order.created_at).toLocaleString("fr-DZ")} ·{" "}
              {order.shipping_address?.full_name} · {order.shipping_address?.phone}
            </p>
            <p className="text-xs text-white/40 mt-1">
              {order.items.map((i) => `${i.product_name} ×${i.quantity}`).join(", ")}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold">{formatDA(order.total)}</span>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: STATUS_COLORS[order.status] + "33",
                color: STATUS_COLORS[order.status],
              }}
            >
              {t(`order.status.${order.status}`)}
            </span>
            {NEXT_ACTIONS[order.status].map((action) => (
              <button
                key={action.status}
                onClick={() => setStatus.mutate({ number: order.number, status: action.status })}
                disabled={setStatus.isPending}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition disabled:opacity-50 ${
                  action.status === "cancelled"
                    ? "border-red-500/40 text-red-400 hover:bg-red-500/15"
                    : "border-white/25 hover:bg-white/10"
                }`}
              >
                {t(action.labelKey)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
