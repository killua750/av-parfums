import { beforeEach, describe, expect, it } from "vitest";

import { cartCount, cartSubtotal, useCartStore } from "@/stores/cart";

const ITEM = {
  variantId: 1,
  price: "2500.00",
  size: "Brume 200ml",
  productName: "Sweet Dreams",
  productSlug: "sweet-dreams",
  tint: "#E88BB0",
  bottleImage: null,
};

describe("cart store (guest)", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], isOpen: false });
  });

  it("adds an item and opens the drawer", () => {
    useCartStore.getState().add(ITEM, 2);
    const s = useCartStore.getState();
    expect(s.items).toHaveLength(1);
    expect(s.items[0].quantity).toBe(2);
    expect(s.isOpen).toBe(true);
  });

  it("merges quantities for the same variant", () => {
    useCartStore.getState().add(ITEM, 1);
    useCartStore.getState().add(ITEM, 2);
    const s = useCartStore.getState();
    expect(s.items).toHaveLength(1);
    expect(s.items[0].quantity).toBe(3);
  });

  it("removes an item when quantity hits zero", () => {
    useCartStore.getState().add(ITEM, 1);
    useCartStore.getState().setQuantity(1, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("computes count and subtotal", () => {
    useCartStore.getState().add(ITEM, 2);
    useCartStore.getState().add({ ...ITEM, variantId: 2, price: "2800.00" }, 1);
    const items = useCartStore.getState().items;
    expect(cartCount(items)).toBe(3);
    expect(cartSubtotal(items)).toBe(2 * 2500 + 2800);
  });

  it("clears the cart", () => {
    useCartStore.getState().add(ITEM, 5);
    useCartStore.getState().clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
