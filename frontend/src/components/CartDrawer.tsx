// Slide-in cart drawer (same look as the original). The COD form moved to the
// dedicated /checkout route; the drawer summarizes and hands off.
import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCart, type UiCartItem } from "@/hooks/useCart";
import { formatDA } from "@/lib/format";

export default function CartDrawer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOpen, closeCart, items, subtotal, setQuantity, remove } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeCart]);

  const goCheckout = () => {
    closeCart();
    void navigate({ to: "/checkout" });
  };

  return (
    <>
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-[110] bg-black/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        aria-hidden={!isOpen}
        className={`fixed top-0 right-0 z-[120] h-full w-full sm:w-[440px] bg-white text-black shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-bold uppercase tracking-widest">{t("cart.title")}</h2>
          <button
            onClick={closeCart}
            aria-label={t("cart.close")}
            className="w-9 h-9 rounded-full hover:bg-black/5 flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-4">
            {items.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-10">{t("cart.empty")}</p>
            ) : (
              <ul className="space-y-4">
                {items.map((item: UiCartItem) => (
                  <li key={item.key} className="flex gap-3">
                    <Link
                      to="/product/$slug"
                      params={{ slug: item.productSlug }}
                      onClick={closeCart}
                      className="w-20 h-20 rounded-lg shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: item.tint + "22" }}
                    >
                      {item.bottleImage && (
                        <img
                          src={item.bottleImage}
                          alt={item.productName}
                          className="max-h-16 w-auto object-contain"
                        />
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <h3 className="font-semibold truncate">{item.productName}</h3>
                        <button
                          onClick={() => remove(item)}
                          aria-label={t("cart.remove")}
                          className="text-neutral-400 hover:text-red-600 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-xs text-neutral-500">{item.size}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center border border-neutral-200 rounded-full">
                          <button
                            onClick={() => setQuantity(item, item.quantity - 1)}
                            aria-label={t("cart.decrease")}
                            className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-l-full"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <button
                            onClick={() => setQuantity(item, item.quantity + 1)}
                            aria-label={t("cart.increase")}
                            className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-r-full"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <span className="font-semibold text-sm">
                          {formatDA(parseFloat(item.price) * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <footer className="border-t border-neutral-200">
            <div className="px-5 py-3 bg-neutral-50 flex justify-between font-semibold">
              <span>{t("cart.subtotal")}</span>
              <span>{formatDA(subtotal)}</span>
            </div>
            <div className="p-5">
              <button
                onClick={goCheckout}
                className="w-full py-4 rounded-full bg-black text-white text-sm font-semibold uppercase tracking-widest hover:bg-neutral-800 transition"
              >
                {t("cart.checkout")}
              </button>
            </div>
          </footer>
        )}
      </aside>
    </>
  );
}
