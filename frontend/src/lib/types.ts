// API contract types mirroring the DRF serializers.
// Regenerate the raw OpenAPI types with `npm run gen:api` (drf-spectacular →
// openapi-typescript) after backend changes; these hand-curated types are the
// ergonomic layer the app consumes.

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface ProductVariant {
  id: number;
  sku: string;
  size: string;
  price: string;
  stock: number;
  in_stock: boolean;
}

export interface ProductImage {
  id: number;
  image: string;
  image_md: string | null;
  image_sm: string | null;
  alt: string;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  volume: string | null;
  tint: string;
  category: Category;
  bottle_image: string | null;
  background_image: string | null;
  price: string | null;
  in_stock: boolean;
  featured: boolean;
}

export interface ProductDetail extends Product {
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Wilaya {
  id: number;
  code: number;
  name: string;
  name_ar: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: "customer" | "admin";
}

export interface CartItemProduct {
  id: number;
  name: string;
  slug: string;
  tint: string;
  bottle_image: string | null;
}

export interface ServerCartItem {
  id: number;
  variant: ProductVariant;
  product: CartItemProduct;
  quantity: number;
  line_total: string;
}

export interface ServerCart {
  id: number;
  items: ServerCartItem[];
  subtotal: string;
  count: number;
  updated_at: string;
}

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface OrderItem {
  id: number;
  variant: number | null;
  product_name: string;
  variant_size: string;
  unit_price: string;
  quantity: number;
}

export interface ShippingAddress {
  full_name: string;
  phone: string;
  wilaya: number;
  wilaya_name?: string;
  commune: string;
  address: string;
}

export interface Order {
  id: number;
  number: string;
  status: OrderStatus;
  subtotal: string;
  shipping_fee: string;
  total: string;
  items: OrderItem[];
  shipping_address: ShippingAddress;
  created_at: string;
}
