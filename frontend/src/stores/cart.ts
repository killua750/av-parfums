// Guest cart lives in localStorage (zustand persist). Once authenticated the
// server cart is the source of truth (React Query, see hooks/useCart.ts) and
// the local items are pushed to /api/v1/cart on login.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LocalCartItem {
  variantId: number;
  quantity: number;
  price: string;
  size: string;
  productName: string;
  productSlug: string;
  tint: string;
  bottleImage: string | null;
}

interface CartState {
  items: LocalCartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  add: (item: Omit<LocalCartItem, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: number, quantity: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      add: (item, quantity = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.variantId === item.variantId);
          const items = existing
            ? s.items.map((i) =>
                i.variantId === item.variantId ? { ...i, quantity: i.quantity + quantity } : i,
              )
            : [...s.items, { ...item, quantity }];
          return { items, isOpen: true };
        }),
      setQuantity: (variantId, quantity) =>
        set((s) => ({
          items:
            quantity <= 0
              ? s.items.filter((i) => i.variantId !== variantId)
              : s.items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
        })),
      remove: (variantId) =>
        set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
      clear: () => set({ items: [] }),
    }),
    { name: "av-cart", partialize: (s) => ({ items: s.items }) },
  ),
);

export const cartCount = (items: LocalCartItem[]): number =>
  items.reduce((sum, i) => sum + i.quantity, 0);

export const cartSubtotal = (items: LocalCartItem[]): number =>
  items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);
