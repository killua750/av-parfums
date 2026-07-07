import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/data/products";

export type CartItem = { product: Product; qty: number };

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  add: (p: Product, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const add = useCallback((p: Product, qty = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((it) => it.product.id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [...prev, { product: p, qty }];
    });
    setIsOpen(true);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.product.id !== id));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((it) => (it.product.id === id ? { ...it, qty: Math.max(0, qty) } : it))
        .filter((it) => it.qty > 0),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartCtx>(() => {
    const count = items.reduce((s, it) => s + it.qty, 0);
    const subtotal = items.reduce((s, it) => s + it.qty * it.product.price, 0);
    return {
      items,
      count,
      subtotal,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      toggleCart: () => setIsOpen((v) => !v),
      add,
      remove,
      setQty,
      clear,
    };
  }, [items, isOpen, add, remove, setQty, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}