// Admin product CRUD: list, edit price/stock inline, create with image upload.
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { api, apiErrorMessage } from "@/lib/api";
import { formatDA } from "@/lib/format";
import type { Category, Paginated, ProductDetail } from "@/lib/types";

export const Route = createFileRoute("/admin/products")({
  head: () => ({ meta: [{ title: "Admin · Produits — AV Parfums" }] }),
  component: AdminProducts,
});

interface ProductFormState {
  id?: number;
  name: string;
  category: number | "";
  tagline: string;
  description: string;
  tint: string;
  price: string;
  stock: string;
  size: string;
  sku: string;
  bottle?: File | null;
  background?: File | null;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  category: "",
  tagline: "",
  description: "",
  tint: "#E88BB0",
  price: "",
  stock: "0",
  size: "Brume 200ml",
  sku: "",
};

function AdminProducts() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductFormState | null>(null);

  const { data, isPending } = useQuery<Paginated<ProductDetail>>({
    queryKey: ["admin", "products"],
    queryFn: () => api<Paginated<ProductDetail>>("/api/v1/admin/products/"),
  });
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/api/v1/categories/"),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "products"] });
    void qc.invalidateQueries({ queryKey: ["products"] });
  };

  const save = useMutation({
    mutationFn: async (f: ProductFormState) => {
      const body = new FormData();
      body.set("name", f.name);
      if (f.category !== "") body.set("category", String(f.category));
      body.set("tagline", f.tagline);
      body.set("description", f.description);
      body.set("tint", f.tint);
      if (f.bottle) body.set("bottle_image", f.bottle);
      if (f.background) body.set("background_image", f.background);
      // Nested variants must go as JSON — send via a second JSON PATCH when
      // creating, since multipart + nested writes don't mix.
      const product = f.id
        ? await api<ProductDetail>(`/api/v1/admin/products/${f.id}/`, {
            method: "PATCH",
            body,
          })
        : await api<ProductDetail>("/api/v1/admin/products/", { method: "POST", body });
      if (f.price) {
        await api<ProductDetail>(`/api/v1/admin/products/${product.id}/`, {
          method: "PATCH",
          body: {
            variants: [
              {
                sku: f.sku || `AV-${product.id}-${Date.now() % 10000}`,
                size: f.size,
                price: f.price,
                stock: parseInt(f.stock || "0", 10),
              },
            ],
          },
        });
      }
      return product;
    },
    onSuccess: () => {
      toast.success(t("admin.saved"));
      setForm(null);
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, t("common.error"))),
  });

  const destroy = useMutation({
    mutationFn: (id: number) => api(`/api/v1/admin/products/${id}/`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err, t("common.error"))),
  });

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm focus:outline-none focus:border-white/50";

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setForm(EMPTY_FORM)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold"
        >
          <Plus size={16} /> {t("admin.newProduct")}
        </button>
      </div>

      {/* Editor */}
      {form && (
        <div className="mb-8 rounded-2xl border border-white/15 p-5 bg-white/5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold uppercase tracking-widest text-sm">
              {form.id ? t("admin.edit") : t("admin.newProduct")}
            </h2>
            <button onClick={() => setForm(null)} aria-label={t("cart.close")}>
              <X size={18} />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("admin.name")}
              className={inputCls}
            />
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value ? Number(e.target.value) : "" })
              }
              className={`${inputCls} [&>option]:text-black`}
            >
              <option value="">{t("admin.category")} —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="Tagline"
              className={inputCls}
            />
            <label className="flex items-center gap-3 text-sm text-white/70">
              {t("admin.tint")}
              <input
                type="color"
                value={form.tint}
                onChange={(e) => setForm({ ...form, tint: e.target.value })}
                className="h-9 w-14 rounded cursor-pointer bg-transparent"
              />
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              rows={2}
              className={`${inputCls} sm:col-span-2 resize-none`}
            />
            <input
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder={`${t("admin.price")} (DA)`}
              inputMode="decimal"
              className={inputCls}
            />
            <input
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              placeholder={t("admin.stock")}
              inputMode="numeric"
              className={inputCls}
            />
            <input
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              placeholder="Taille (ex: Brume 200ml)"
              className={inputCls}
            />
            <input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="SKU"
              className={inputCls}
            />
            <label className="text-sm text-white/70">
              {t("admin.bottleImage")}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setForm({ ...form, bottle: e.target.files?.[0] ?? null })}
                className="block mt-1 text-xs"
              />
            </label>
            <label className="text-sm text-white/70">
              {t("admin.backgroundImage")}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setForm({ ...form, background: e.target.files?.[0] ?? null })}
                className="block mt-1 text-xs"
              />
            </label>
          </div>
          <button
            onClick={() => save.mutate(form)}
            disabled={save.isPending || !form.name || form.category === ""}
            className="mt-4 px-6 py-3 rounded-full bg-white text-black text-sm font-semibold uppercase tracking-widest disabled:opacity-50"
          >
            {t("admin.save")}
          </button>
        </div>
      )}

      {/* Table */}
      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl skeleton" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 uppercase text-xs tracking-widest">
                <th className="px-4 py-3">{t("admin.name")}</th>
                <th className="px-4 py-3">{t("admin.price")}</th>
                <th className="px-4 py-3">{t("admin.stock")}</th>
                <th className="px-4 py-3">{t("admin.status")}</th>
                <th className="px-4 py-3 text-right">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data?.results.map((p) => {
                const variant = p.variants[0];
                return (
                  <tr key={p.id} className="border-t border-white/10">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: p.tint }}
                        />
                        <span className="font-semibold">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{variant ? formatDA(variant.price) : "—"}</td>
                    <td className="px-4 py-3">{variant?.stock ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          p.in_stock
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {p.in_stock ? "OK" : t("shop.outOfStock")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          setForm({
                            id: p.id,
                            name: p.name,
                            category: p.category.id,
                            tagline: p.tagline,
                            description: p.description,
                            tint: p.tint,
                            price: variant?.price ?? "",
                            stock: String(variant?.stock ?? 0),
                            size: variant?.size ?? "Brume 200ml",
                            sku: variant?.sku ?? "",
                          })
                        }
                        aria-label={t("admin.edit")}
                        className="p-2 rounded-full hover:bg-white/10 transition"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`${t("admin.delete")} ${p.name}?`)) {
                            destroy.mutate(p.id);
                          }
                        }}
                        aria-label={t("admin.delete")}
                        className="p-2 rounded-full hover:bg-red-500/20 text-red-400 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
