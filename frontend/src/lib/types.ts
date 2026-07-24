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

export type PeriodPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

export type Granularity = "hour" | "day" | "month";

export interface DashboardWindow {
  revenue: string;
  orders: number;
  units: number;
  aov: string;
}

export interface DashboardData {
  period: {
    preset: PeriodPreset;
    start: string;
    end: string;
    granularity: Granularity;
  };
  totals: {
    current: DashboardWindow;
    previous: DashboardWindow;
    revenue_all_time: string;
    customers: number;
    new_customers: number;
    new_customers_prev: number;
    recurring_rate: number;
    open_orders: number;
    cancel_rate: number;
    cancel_rate_prev: number;
  };
  series: { bucket: string; revenue: string; orders: number }[];
  status_counts: Partial<Record<OrderStatus, number>>;
  top_products: { name: string; units: number; revenue: string }[];
  top_products_qty: { name: string; units: number; revenue: string }[];
  top_wilayas: { name: string; orders: number; revenue: string }[];
  heatmap: { dow: number; hour: number; count: number }[];
  low_stock: { product: string; size: string; sku: string; stock: number }[];
  recent_orders: {
    number: string;
    created_at: string;
    status: OrderStatus;
    total: string;
    customer: string;
    items_count: number;
  }[];
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
  cancel_reason?: string;
  items: OrderItem[];
  shipping_address: ShippingAddress;
  created_at: string;
}

export interface StoreSettings {
  whatsapp_number: string;
  store_name: string;
  contact_email: string;
  contact_phone: string;
  instagram: string;
  free_shipping_threshold: string;
}
