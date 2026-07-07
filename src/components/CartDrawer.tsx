import { useEffect, useState } from "react";
import { Minus, Plus, X, Trash2, CheckCircle2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatDA, WILAYAS } from "@/data/products";

export default function CartDrawer() {
  const { isOpen, closeCart, items, subtotal, setQty, remove, clear } = useCart();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    wilaya: "",
    address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const canSubmit =
    items.length > 0 &&
    form.fullName.trim().length >= 2 &&
    /^[0-9+\s]{8,}$/.test(form.phone.trim()) &&
    form.wilaya &&
    form.address.trim().length >= 3;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
      clear();
    }, 500);
  };

  const closeAll = () => {
    setSuccess(false);
    setForm({ fullName: "", phone: "", wilaya: "", address: "" });
    closeCart();
  };

  return (
    <>
      {/* overlay */}
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-[110] bg-black/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      {/* drawer */}
      <aside
        aria-hidden={!isOpen}
        className={`fixed top-0 right-0 z-[120] h-full w-full sm:w-[440px] bg-white text-black shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold uppercase tracking-widest">Mon panier</h2>
          <button
            onClick={closeCart}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full hover:bg-black/5 flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </header>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
            <CheckCircle2 size={64} className="text-green-600" />
            <h3 className="text-xl font-bold">Merci !</h3>
            <p className="text-sm text-neutral-600">
              Notre équipe va vous contacter par téléphone pour confirmer votre commande.
            </p>
            <button
              onClick={closeAll}
              className="mt-4 px-6 py-3 rounded-full bg-black text-white text-sm font-semibold uppercase tracking-widest hover:bg-neutral-800 transition"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* items */}
            <div className="px-5 py-4">
              {items.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-10">
                  Votre panier est vide.
                </p>
              ) : (
                <ul className="space-y-4">
                  {items.map((it) => (
                    <li key={it.product.id} className="flex gap-3">
                      <div
                        className="w-20 h-20 rounded-lg shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: it.product.tint + "22" }}
                      >
                        <img
                          src={it.product.bottle}
                          alt={it.product.name}
                          className="max-h-16 w-auto object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2">
                          <h3 className="font-semibold truncate">{it.product.name}</h3>
                          <button
                            onClick={() => remove(it.product.id)}
                            aria-label="Retirer"
                            className="text-neutral-400 hover:text-red-600 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-xs text-neutral-500">{it.product.volume}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center border rounded-full">
                            <button
                              onClick={() => setQty(it.product.id, it.qty - 1)}
                              aria-label="Diminuer"
                              className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-l-full"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-sm">{it.qty}</span>
                            <button
                              onClick={() => setQty(it.product.id, it.qty + 1)}
                              aria-label="Augmenter"
                              className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-r-full"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span className="font-semibold text-sm">
                            {formatDA(it.product.price * it.qty)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* subtotal */}
            {items.length > 0 && (
              <div className="px-5 py-3 border-t border-b bg-neutral-50 flex justify-between font-semibold">
                <span>Sous-total</span>
                <span>{formatDA(subtotal)}</span>
              </div>
            )}

            {/* COD form */}
            <form onSubmit={submit} className="px-5 py-5 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest mb-1">
                Paiement à la livraison
              </h3>
              <input
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Nom et prénom"
                maxLength={80}
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:outline-none focus:border-black text-sm"
              />
              <input
                required
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Numéro de téléphone"
                maxLength={20}
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:outline-none focus:border-black text-sm"
              />
              <select
                required
                value={form.wilaya}
                onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:outline-none focus:border-black text-sm bg-white"
              >
                <option value="">Wilaya —</option>
                {WILAYAS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              <textarea
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Commune / Adresse de livraison"
                rows={2}
                maxLength={200}
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:outline-none focus:border-black text-sm resize-none"
              />
              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="w-full py-4 rounded-full bg-black text-white text-sm font-semibold uppercase tracking-widest hover:bg-neutral-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Envoi..." : "Confirmer ma commande (Paiement à la livraison)"}
              </button>
            </form>
          </div>
        )}
      </aside>
    </>
  );
}