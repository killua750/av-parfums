// Printable delivery slip (bon de livraison) — opens a clean print window.
import { formatDA } from "@/lib/format";
import type { Order } from "@/lib/types";

export function printDeliverySlip(order: Order, storeName = "AV Parfums"): void {
  const a = order.shipping_address;
  const esc = (s: string) =>
    s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
  const date = new Date(order.created_at).toLocaleString("fr-DZ");
  const rows = order.items
    .map(
      (i) =>
        `<tr><td>${esc(i.product_name)} <span class="muted">${esc(i.variant_size)}</span></td>` +
        `<td class="c">${i.quantity}</td>` +
        `<td class="r">${formatDA(parseFloat(i.unit_price) * i.quantity)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>${esc(order.number)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 32px; max-width: 720px; margin: 0 auto; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 16px; }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; }
  .num { font-size: 22px; font-weight: 800; }
  .muted { color: #777; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #777; margin: 24px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  td, th { padding: 9px 6px; border-bottom: 1px solid #e5e5e5; font-size: 14px; text-align: left; }
  .c { text-align: center; } .r { text-align: right; }
  .totals { margin-top: 12px; margin-left: auto; width: 260px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
  .totals .grand { border-top: 2px solid #111; margin-top: 6px; padding-top: 10px; font-weight: 800; font-size: 17px; }
  .cod { margin-top: 28px; border: 2px dashed #111; padding: 12px; text-align: center; font-weight: 700; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="top">
    <div><div class="brand">${esc(storeName)}</div><div class="muted">Bon de livraison</div></div>
    <div style="text-align:right"><div class="num">${esc(order.number)}</div><div class="muted">${esc(date)}</div></div>
  </div>

  <h2>Client</h2>
  <div><strong>${esc(a?.full_name ?? "")}</strong></div>
  <div>${esc(a?.phone ?? "")}</div>
  <div>${esc(a?.address ?? "")}, ${esc(a?.commune ?? "")} — ${esc(a?.wilaya_name ?? "")}</div>

  <h2>Produits</h2>
  <table><thead><tr><th>Produit</th><th class="c">Qté</th><th class="r">Montant</th></tr></thead>
  <tbody>${rows}</tbody></table>

  <div class="totals">
    <div><span class="muted">Sous-total</span><span>${formatDA(order.subtotal)}</span></div>
    <div><span class="muted">Livraison</span><span>${formatDA(order.shipping_fee)}</span></div>
    <div class="grand"><span>Total</span><span>${formatDA(order.total)}</span></div>
  </div>

  <div class="cod">💵 Paiement à la livraison — ${formatDA(order.total)}</div>
</body></html>`;

  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}
