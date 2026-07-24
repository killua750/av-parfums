// Cash-on-Delivery checkout: react-hook-form + Zod (mirroring the DRF
// serializer rules) → POST /api/v1/orders → success screen with order number.
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { useCart } from "@/hooks/useCart";
import { useWilayas } from "@/hooks/useProducts";
import { api, apiErrorMessage } from "@/lib/api";
import { formatDA } from "@/lib/format";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Commander — AV Parfums" }] }),
  component: CheckoutPage,
});

const checkoutSchema = z.object({
  full_name: z.string().trim().min(2),
  phone: z
    .string()
    .transform((s) => s.replace(/\s/g, ""))
    .pipe(z.string().regex(/^(\+213|0)(5|6|7)[0-9]{8}$/)),
  wilaya: z.coerce.number().int().min(1),
  commune: z.string().trim().min(1),
  address: z.string().trim().min(3).max(255),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

function CheckoutPage() {
  const { t } = useTranslation();
  const { items, subtotal, clear } = useCart();
  const { data: wilayas = [] } = useWilayas();
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  const total = Math.max(subtotal - (promo?.discount ?? 0), 0);

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setCheckingPromo(true);
    try {
      const res = await api<{ valid: boolean; discount?: string; message: string }>(
        "/api/v1/promo/validate/",
        { method: "POST", body: { code, subtotal: String(subtotal) } },
      );
      if (res.valid) {
        setPromo({ code, discount: parseFloat(res.discount ?? "0") });
        setPromoMsg({ ok: true, text: res.message });
      } else {
        setPromo(null);
        setPromoMsg({ ok: false, text: res.message });
      }
    } catch {
      setPromoMsg({ ok: false, text: t("common.error") });
    } finally {
      setCheckingPromo(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutForm>({ resolver: zodResolver(checkoutSchema) });

  const inputCls =
    "w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-sm placeholder:text-white/40 focus:outline-none focus:border-white/50";

  const onSubmit = async (form: CheckoutForm) => {
    try {
      const order = await api<Order>("/api/v1/orders/", {
        method: "POST",
        body: {
          items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
          shipping_address: form,
          promo_code: promo?.code ?? "",
        },
      });
      clear();
      setPlacedOrder(order);
    } catch (err) {
      toast.error(apiErrorMessage(err, t("common.error")));
    }
  };

  if (placedOrder) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white pt-24 px-4 flex items-center justify-center">
        <div className="max-w-md text-center">
          <CheckCircle2 size={64} className="text-green-500 mx-auto" />
          <h1 className="text-3xl font-bold mt-6" style={{ fontFamily: "Anton, sans-serif" }}>
            {t("checkout.success")}
          </h1>
          <p className="text-white/70 mt-3">{t("checkout.successBody")}</p>
          <p className="mt-6 text-sm text-white/50 uppercase tracking-widest">
            {t("checkout.orderNumber")}
          </p>
          <p className="text-2xl font-bold tracking-wider mt-1">{placedOrder.number}</p>
          <Link
            to="/"
            className="mt-8 inline-flex px-8 py-3 rounded-full bg-white text-black text-sm font-semibold uppercase tracking-widest"
          >
            {t("common.back")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white pt-24 pb-16 px-4 sm:px-8">
      <div className="max-w-xl mx-auto">
        <h1
          className="text-4xl sm:text-5xl uppercase mb-8"
          style={{ fontFamily: "Anton, sans-serif" }}
        >
          {t("checkout.title")}
        </h1>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/50 mb-6">{t("checkout.emptyCart")}</p>
            <Link
              to="/shop"
              className="inline-flex px-6 py-3 rounded-full bg-white text-black text-sm font-semibold uppercase tracking-widest"
            >
              {t("nav.shop")}
            </Link>
          </div>
        ) : (
          <>
            {/* Summary */}
            <ul className="mb-8 divide-y divide-white/10 border border-white/10 rounded-2xl px-5">
              {items.map((item) => (
                <li key={item.key} className="py-3 flex justify-between text-sm">
                  <span>
                    {item.productName} ({item.size}) × {item.quantity}
                  </span>
                  <span className="font-semibold">
                    {formatDA(parseFloat(item.price) * item.quantity)}
                  </span>
                </li>
              ))}
              <li className="py-3 flex justify-between text-sm">
                <span className="text-white/60">{t("cart.subtotal")}</span>
                <span>{formatDA(subtotal)}</span>
              </li>
              <li className="pb-3">
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder={t("checkout.promoPlaceholder")}
                    className={`${inputCls} py-2.5 font-mono tracking-wider`}
                  />
                  <button
                    type="button"
                    onClick={applyPromo}
                    disabled={checkingPromo || !promoInput.trim()}
                    className="shrink-0 rounded-lg border border-white/25 px-4 text-xs font-semibold uppercase tracking-widest transition hover:bg-white hover:text-black disabled:opacity-40"
                  >
                    {t("checkout.apply")}
                  </button>
                </div>
                {promoMsg && (
                  <p
                    className={`mt-1.5 text-xs ${promoMsg.ok ? "text-green-400" : "text-red-400"}`}
                  >
                    {promoMsg.text}
                  </p>
                )}
              </li>
              {promo && promo.discount > 0 && (
                <li className="flex justify-between py-2 text-sm text-green-400">
                  <span>
                    {t("checkout.discount")} · {promo.code}
                  </span>
                  <span>−{formatDA(promo.discount)}</span>
                </li>
              )}
              <li className="flex justify-between border-t border-white/10 py-3 font-bold">
                <span>{t("order.total")}</span>
                <span>{formatDA(total)}</span>
              </li>
            </ul>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <input
                  {...register("full_name")}
                  placeholder={t("checkout.fullName")}
                  maxLength={120}
                  className={inputCls}
                />
                {errors.full_name && (
                  <p className="text-red-400 text-xs mt-1">{t("checkout.errors.name")}</p>
                )}
              </div>
              <div>
                <input
                  {...register("phone")}
                  inputMode="tel"
                  placeholder={t("checkout.phone")}
                  maxLength={20}
                  className={inputCls}
                />
                {errors.phone && (
                  <p className="text-red-400 text-xs mt-1">{t("checkout.errors.phone")}</p>
                )}
              </div>
              <div>
                <select
                  {...register("wilaya")}
                  defaultValue=""
                  className={`${inputCls} [&>option]:text-black`}
                >
                  <option value="" disabled>
                    {t("checkout.wilaya")} —
                  </option>
                  {wilayas.map((w) => (
                    <option key={w.id} value={w.id}>
                      {String(w.code).padStart(2, "0")} - {w.name}
                    </option>
                  ))}
                </select>
                {errors.wilaya && (
                  <p className="text-red-400 text-xs mt-1">{t("checkout.errors.wilaya")}</p>
                )}
              </div>
              <div>
                <input
                  {...register("commune")}
                  placeholder={t("checkout.commune")}
                  maxLength={120}
                  className={inputCls}
                />
                {errors.commune && (
                  <p className="text-red-400 text-xs mt-1">{t("checkout.errors.commune")}</p>
                )}
              </div>
              <div>
                <textarea
                  {...register("address")}
                  placeholder={t("checkout.address")}
                  rows={2}
                  maxLength={255}
                  className={`${inputCls} resize-none`}
                />
                {errors.address && (
                  <p className="text-red-400 text-xs mt-1">{t("checkout.errors.address")}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-full bg-white text-black text-sm font-semibold uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50"
              >
                {isSubmitting ? t("checkout.submitting") : t("checkout.submit")}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
