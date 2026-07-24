// WhatsApp order-message generator. The single store number lives in
// StoreSettings (Paramètres) — never hard-coded here.
import { formatDA } from "@/lib/format";
import type { Order } from "@/lib/types";

/** Build the formatted order message the owner receives / forwards. */
export function buildOrderMessage(order: Order): string {
  const a = order.shipping_address;
  const lines = [
    "🛒 NOUVELLE COMMANDE",
    "",
    `N° Commande: ${order.number}`,
    `Client: ${a?.full_name ?? ""}`,
    `Téléphone: ${a?.phone ?? ""}`,
    `Ville: ${a?.commune ?? ""} — Wilaya: ${a?.wilaya_name ?? ""}`,
    `Adresse: ${a?.address ?? ""}`,
    "",
    "Produits:",
    ...order.items.map((i) => `• ${i.product_name} (${i.variant_size}) x${i.quantity}`),
    "",
    `Sous-total: ${formatDA(order.subtotal)}`,
    `Livraison: ${formatDA(order.shipping_fee)}`,
    `Total: ${formatDA(order.total)}`,
  ];
  return lines.join("\n");
}

/** wa.me deep link. If `to` is empty, WhatsApp opens a contact picker. */
export function whatsappUrl(to: string, text: string): string {
  const num = to.replace(/\D/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
