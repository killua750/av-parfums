import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/api";
import { formatDA } from "@/lib/format";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: ({ params }) => ({ meta: [{ title: `Commande ${params.id} — AV Parfums` }] }),
  component: OrderPage,
});

const STEPS = ["pending", "confirmed", "shipped", "delivered"] as const;

function OrderPage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const { data: order, isPending } = useQuery<Order>({
    queryKey: ["orders", id],
    queryFn: () => api<Order>(`/api/v1/orders/${id}/`),
  });

  if (isPending) {
    return (
      <main className="min-h-screen bg-neutral-950 pt-24 px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-10 w-1/2 rounded skeleton" />
          <div className="h-40 w-full rounded-2xl skeleton" />
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white pt-32 text-center">
        <p className="text-white/60">{t("common.error")}</p>
      </main>
    );
  }

  const currentStep = STEPS.indexOf(order.status as (typeof STEPS)[number]);

  return (
    <main className="min-h-screen bg-neutral-950 text-white pt-24 pb-16 px-4 sm:px-8">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/account"
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white mb-8"
        >
          <ArrowLeft size={16} /> {t("common.back")}
        </Link>

        <h1
          className="text-3xl sm:text-5xl uppercase mb-8"
          style={{ fontFamily: "Anton, sans-serif" }}
        >
          {t("order.title", { number: order.number })}
        </h1>

        {/* Status timeline */}
        {order.status === "cancelled" ? (
          <p className="mb-8 inline-block px-4 py-2 rounded-full bg-red-500/20 text-red-400 text-sm font-semibold">
            {t("order.status.cancelled")}
          </p>
        ) : (
          <ol className="flex items-center gap-0 mb-10">
            {STEPS.map((step, i) => (
              <li key={step} className="flex-1 flex flex-col items-center relative">
                {i > 0 && (
                  <span
                    className="absolute top-3 h-0.5 w-full"
                    style={{
                      insetInlineStart: "-50%",
                      backgroundColor: i <= currentStep ? "#22c55e" : "rgba(255,255,255,0.15)",
                    }}
                  />
                )}
                <span
                  className="relative z-10 w-6 h-6 rounded-full border-2"
                  style={{
                    backgroundColor: i <= currentStep ? "#22c55e" : "#0a0a0a",
                    borderColor: i <= currentStep ? "#22c55e" : "rgba(255,255,255,0.25)",
                  }}
                />
                <span className="mt-2 text-[10px] sm:text-xs uppercase tracking-wider text-white/60">
                  {t(`order.status.${step}`)}
                </span>
              </li>
            ))}
          </ol>
        )}

        {/* Items */}
        <ul className="divide-y divide-white/10 border border-white/10 rounded-2xl px-5 mb-8">
          {order.items.map((item) => (
            <li key={item.id} className="py-3 flex justify-between text-sm">
              <span>
                {item.product_name} ({item.variant_size}) × {item.quantity}
              </span>
              <span className="font-semibold">
                {formatDA(parseFloat(item.unit_price) * item.quantity)}
              </span>
            </li>
          ))}
          <li className="py-3 flex justify-between font-bold">
            <span>{t("order.total")}</span>
            <span>{formatDA(order.total)}</span>
          </li>
        </ul>

        <section className="rounded-2xl border border-white/10 p-5 text-sm text-white/70">
          <h2 className="text-xs uppercase tracking-widest text-white/50 mb-2">
            {t("order.shippingTo")}
          </h2>
          <p className="text-white font-semibold">{order.shipping_address.full_name}</p>
          <p>{order.shipping_address.phone}</p>
          <p>
            {order.shipping_address.address}, {order.shipping_address.commune},{" "}
            {order.shipping_address.wilaya_name}
          </p>
        </section>
      </div>
    </main>
  );
}
