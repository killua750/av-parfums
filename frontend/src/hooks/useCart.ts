// One cart interface for the whole UI. Guests use the persisted zustand
// store; authenticated users read/write the server cart with optimistic
// quantity updates.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Product, ProductVariant, ServerCart } from "@/lib/types";
import { useUser } from "@/hooks/useAuth";
import { cartCount, cartSubtotal, useCartStore, type LocalCartItem } from "@/stores/cart";

export interface UiCartItem {
  key: string;
  serverItemId?: number;
  variantId: number;
  quantity: number;
  price: string;
  size: string;
  productName: string;
  productSlug: string;
  tint: string;
  bottleImage: string | null;
}

const CART_KEY = ["cart"];

export function useCart() {
  const qc = useQueryClient();
  const { data: user } = useUser();
  const isAuthed = !!user;
  const local = useCartStore();

  const serverCart = useQuery<ServerCart>({
    queryKey: CART_KEY,
    queryFn: () => api<ServerCart>("/api/v1/cart/"),
    enabled: isAuthed,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: CART_KEY });

  const addServer = useMutation({
    mutationFn: (vars: { variantId: number; quantity: number }) =>
      api<ServerCart>("/api/v1/cart/items/", {
        method: "POST",
        body: { variant_id: vars.variantId, quantity: vars.quantity },
      }),
    onSuccess: (data) => qc.setQueryData(CART_KEY, data),
    onError: invalidate,
  });

  const updateServer = useMutation({
    mutationFn: (vars: { itemId: number; quantity: number }) =>
      api<ServerCart>(`/api/v1/cart/items/${vars.itemId}/`, {
        method: "PATCH",
        body: { quantity: vars.quantity },
      }),
    // Optimistic: adjust the cached cart immediately, roll back on error.
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: CART_KEY });
      const previous = qc.getQueryData<ServerCart>(CART_KEY);
      if (previous) {
        const items = previous.items
          .map((i) => (i.id === vars.itemId ? { ...i, quantity: vars.quantity } : i))
          .filter((i) => i.quantity > 0);
        qc.setQueryData<ServerCart>(CART_KEY, {
          ...previous,
          items,
          count: items.reduce((s, i) => s + i.quantity, 0),
        });
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(CART_KEY, ctx.previous),
    onSettled: invalidate,
  });

  const clearServer = useMutation({
    mutationFn: () => api<ServerCart>("/api/v1/cart/", { method: "DELETE" }),
    onSuccess: (data) => qc.setQueryData(CART_KEY, data),
  });

  const items: UiCartItem[] = isAuthed
    ? (serverCart.data?.items ?? []).map((i) => ({
        key: `s-${i.id}`,
        serverItemId: i.id,
        variantId: i.variant.id,
        quantity: i.quantity,
        price: i.variant.price,
        size: i.variant.size,
        productName: i.product.name,
        productSlug: i.product.slug,
        tint: i.product.tint,
        bottleImage: i.product.bottle_image,
      }))
    : local.items.map((i: LocalCartItem) => ({
        key: `l-${i.variantId}`,
        variantId: i.variantId,
        quantity: i.quantity,
        price: i.price,
        size: i.size,
        productName: i.productName,
        productSlug: i.productSlug,
        tint: i.tint,
        bottleImage: i.bottleImage,
      }));

  const add = (product: Product, variant: ProductVariant, quantity = 1) => {
    if (isAuthed) {
      addServer.mutate({ variantId: variant.id, quantity });
      local.openCart();
    } else {
      local.add(
        {
          variantId: variant.id,
          price: variant.price,
          size: variant.size,
          productName: product.name,
          productSlug: product.slug,
          tint: product.tint,
          bottleImage: product.bottle_image,
        },
        quantity,
      );
    }
  };

  const setQuantity = (item: UiCartItem, quantity: number) => {
    if (isAuthed && item.serverItemId) {
      updateServer.mutate({ itemId: item.serverItemId, quantity });
    } else {
      local.setQuantity(item.variantId, quantity);
    }
  };

  const remove = (item: UiCartItem) => setQuantity(item, 0);

  const clear = () => {
    if (isAuthed) clearServer.mutate();
    else local.clear();
  };

  return {
    items,
    count: isAuthed ? (serverCart.data?.count ?? 0) : cartCount(local.items),
    subtotal: isAuthed ? parseFloat(serverCart.data?.subtotal ?? "0") : cartSubtotal(local.items),
    isOpen: local.isOpen,
    openCart: local.openCart,
    closeCart: local.closeCart,
    toggleCart: local.toggleCart,
    add,
    setQuantity,
    remove,
    clear,
  };
}
