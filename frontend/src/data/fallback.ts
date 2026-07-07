// Offline/dev fallback shown when the API is unreachable, so the hero never
// renders empty. Mirrors the seeded products fixture. The SVG placeholders in
// /public/images can be replaced with the real renders exported from Lovable.
import type { Product } from "@/lib/types";

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Sweet Dreams",
    slug: "sweet-dreams",
    tagline: "Floral · Fruits rouges · Musc",
    tint: "#E88BB0",
    category: { id: 1, name: "Brumes parfumées", slug: "brumes-parfumees" },
    bottle_image: "/images/sweet-dreams-bottle.svg",
    background_image: "/images/sweet-dreams-bg.svg",
    price: "2500.00",
    in_stock: true,
    featured: true,
  },
  {
    id: 2,
    name: "Honey Touch",
    slug: "honey-touch",
    tagline: "Vanille · Miel · Chaleur",
    tint: "#D9A25A",
    category: { id: 1, name: "Brumes parfumées", slug: "brumes-parfumees" },
    bottle_image: "/images/honey-touch-bottle.svg",
    background_image: "/images/honey-touch-bg.svg",
    price: "2800.00",
    in_stock: true,
    featured: true,
  },
];

export const FALLBACK_DESCRIPTIONS: Record<string, string> = {
  "sweet-dreams":
    "Brume parfumée florale — pétales de rose, fruits rouges et une touche de musc pour une signature enveloppante.",
  "honey-touch":
    "Un sillage chaud et gourmand — miel doré, vanille bourbon et bois précieux pour une aura solaire.",
};
