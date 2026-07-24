// The signature catalog, served statically from the Vercel CDN: used as
// instant placeholder data while the (free-tier, cold-startable) API wakes up,
// and as the offline fallback. Images are the real renders in /public/images.
import type { Product } from "@/lib/types";

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Sweet Dreams",
    slug: "sweet-dreams",
    tagline: "Floral · Fruits rouges · Musc",
    description:
      "Brume parfumée florale — pétales de rose, fruits rouges et une touche de musc pour une signature enveloppante.",
    volume: "Brume 200ml",
    tint: "#E88BB0",
    category: { id: 1, name: "Brumes parfumées", slug: "brumes-parfumees" },
    bottle_image: "/images/sweet-dreams-bottle.png",
    background_image: "/images/sweet-dreams-bg.jpg",
    price: "2500.00",
    in_stock: true,
    featured: true,
  },
  {
    id: 2,
    name: "Honey Touch",
    slug: "honey-touch",
    tagline: "Vanille · Miel · Chaleur",
    description:
      "Un sillage chaud et gourmand — miel doré, vanille bourbon et bois précieux pour une aura solaire.",
    volume: "Brume 200ml",
    tint: "#D9A25A",
    category: { id: 1, name: "Brumes parfumées", slug: "brumes-parfumees" },
    bottle_image: "/images/honey-touch-bottle.png",
    background_image: "/images/honey-touch-bg.jpg",
    price: "2800.00",
    in_stock: true,
    featured: true,
  },
  {
    id: 3,
    name: "Dziria",
    slug: "dziria",
    tagline: "Néroli · Fleur d'oranger · Ambre",
    description:
      "Une brume solaire inspirée d'Alger — néroli, fleur d'oranger et ambre doré, comme un coucher de soleil sur la Casbah.",
    volume: "Brume 200ml",
    tint: "#C9873E",
    category: { id: 1, name: "Brumes parfumées", slug: "brumes-parfumees" },
    bottle_image: "/images/dziria-bottle.png",
    background_image: "/images/dziria-bg.jpg",
    price: "2800.00",
    in_stock: true,
    featured: true,
  },
  {
    id: 4,
    name: "Afro Passion",
    slug: "afro-passion",
    tagline: "Ananas · Coco · Fruits exotiques",
    description:
      "Une brume tropicale évasion — ananas juteux, noix de coco et fruits exotiques sur un coucher de soleil doré.",
    volume: "Brume 200ml",
    tint: "#2FA69A",
    category: { id: 1, name: "Brumes parfumées", slug: "brumes-parfumees" },
    bottle_image: "/images/afro-passion-bottle.png",
    background_image: "/images/afro-passion-bg.jpg",
    price: "2800.00",
    in_stock: true,
    featured: true,
  },
];

// Slug → static CDN image pair for the evergreen catalog. API rows for these
// slugs get their imagery pinned to the bundled static assets, so product
// images never depend on the free-tier API's ephemeral /media disk (and never
// flicker on refetch). Admin-added products aren't in the map and keep their
// server image URLs untouched.
const STATIC_IMAGES = new Map(
  FALLBACK_PRODUCTS.map((p) => [p.slug, [p.bottle_image, p.background_image] as const]),
);

export function pinStaticImages<
  T extends { slug: string; bottle_image: string | null; background_image: string | null },
>(product: T): T {
  const pinned = STATIC_IMAGES.get(product.slug);
  return pinned ? { ...product, bottle_image: pinned[0], background_image: pinned[1] } : product;
}
