// Full-page cart mirror of the drawer, for direct navigation / shared links.
import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCart } from "@/hooks/useCart";
import { formatDA } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Panier — AV Parfums" }] }),
  component: CartPage,
});

function CartPage() {
  const { t } = useTranslation();
  const { items, subtotal, setQuantity, remove } = useCart();

  return (
    <main className="min-h-screen bg-neutral-950 text-white pt-24 pb-16 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto">
        <h1
          className="text-4xl sm:text-6xl uppercase mb-8"
          style={{ fontFamily: "Anton, sans-serif" }}
        >
          {t("cart.title")}
        </h1>

        {items.length === 0 ? (
          <p className="text-white/50 py-16 text-center">{t("cart.empty")}</p>
        ) : (
          <>
            <ul className="divide-y divide-white/10">
              {items.map((item) => (
                <li key={item.key} className="flex gap-4 py-5">
                  <Link
                    to="/product/$slug"
                    params={{ slug: item.productSlug }}
                    className="w-24 h-24 rounded-xl shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: item.tint + "33" }}
                  >
                    {item.bottleImage && (
                      <img
                        src={item.bottleImage}
                        alt={item.productName}
                        className="max-h-20 w-auto object-contain"
                      />
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <h3 className="font-semibold">{item.productName}</h3>
                      <button
                        onClick={() => remove(item)}
                        aria-label={t("cart.remove")}
                        className="text-white/40 hover:text-red-400 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-xs text-white/50">{item.size}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center border border-white/20 rounded-full">
                        <button
                          onClick={() => setQuantity(item, item.quantity - 1)}
                          aria-label={t("cart.decrease")}
                          className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-l-full"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-9 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => setQuantity(item, item.quantity + 1)}
                          aria-label={t("cart.increase")}
                          className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-r-full"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="font-semibold">
                        {formatDA(parseFloat(item.price) * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t border-white/10 pt-6 flex items-center justify-between">
              <span className="text-lg font-semibold">{t("cart.subtotal")}</span>
              <span className="text-2xl font-bold" style={{ fontFamily: "Anton, sans-serif" }}>
                {formatDA(subtotal)}
              </span>
            </div>

            <Link
              to="/checkout"
              className="mt-6 block w-full py-4 rounded-full bg-white text-black text-center text-sm font-semibold uppercase tracking-widest hover:opacity-90 transition"
            >
              {t("cart.checkout")}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
