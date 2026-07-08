// Admin product management: searchable table with thumbnails + slide-over
// editor (image previews, variant pricing). Server-side rules still apply.
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Panel, VIZ } from "@/components/admin/viz";
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
  bottlePreview?: string;
  backgroundPreview?: string;
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
  const [query, setQuery] = useState("");

  const { data, isPending } = useQuery<Paginated<ProductDetail>>({
    queryKey: ["admin", "products"],
    queryFn: () => api<Paginated<ProductDetail>>("/api/v1/admin/products/"),
  });
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/api/v1/categories/"),
  });

  const products = useMemo(() => {
    const list = data?.results ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.variants.some((v) => v.sku.toLowerCase().includes(q)),
    );
  }, [data, query]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin"] });
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
      // Nested variants must go as JSON — send via a second JSON PATCH, since
      // multipart + nested writes don't mix.
      const product = f.id
        ? await api<ProductDetail>(`/api/v1/admin/products/${f.id}/`, { method: "PATCH", body })
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
    "w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 text-sm " +
    "placeholder:text-white/30 focus:outline-none focus:border-white/40 transition";
  const labelCls = "block text-xs font-medium text-white/50 mb-1.5";

  const setFile = (field: "bottle" | "background") => (file: File | null) => {
    if (!form) return;
    setForm({
      ...form,
      [field]: file,
      [`${field}Preview`]: file ? URL.createObjectURL(file) : undefined,
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl uppercase" style={{ fontFamily: "Anton, sans-serif" }}>
          {t("admin.products")}
          <span className="ml-3 align-middle text-sm normal-case text-white/40 font-sans">
            {data ? data.count : ""}
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("admin.searchProducts")}
              className="w-52 rounded-full border border-white/15 bg-transparent py-2 pl-9 pr-4 text-sm placeholder:text-white/30 focus:border-white/40 focus:outline-none transition"
            />
          </div>
          <button
            onClick={() => setForm(EMPTY_FORM)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90 transition"
          >
            <Plus size={16} /> {t("admin.newProduct")}
          </button>
        </div>
      </div>

      {/* Table */}
      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl skeleton" />
          ))}
        </div>
      ) : (
        <Panel title="" className="!p-0 overflow-hidden [&>header]:hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left text-[11px] uppercase tracking-widest"
                  style={{ color: VIZ.muted }}
                >
                  <th className="px-5 py-3.5 font-medium">{t("admin.name")}</th>
                  <th className="px-5 py-3.5 font-medium">{t("admin.category")}</th>
                  <th className="px-5 py-3.5 font-medium text-right">{t("admin.price")}</th>
                  <th className="px-5 py-3.5 font-medium text-right">{t("admin.stock")}</th>
                  <th className="px-5 py-3.5 font-medium">{t("admin.status")}</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const variant = p.variants[0];
                  return (
                    <tr
                      key={p.id}
                      className="border-t border-white/[0.06] hover:bg-white/[0.03] transition"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                            style={{ backgroundColor: p.tint + "2e" }}
                          >
                            {p.bottle_image ? (
                              <img
                                src={p.bottle_image}
                                alt=""
                                className="h-full w-full object-contain p-1"
                                loading="lazy"
                              />
                            ) : (
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: p.tint }}
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-xs" style={{ color: VIZ.muted }}>
                              {variant?.sku ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-white/60">{p.category?.name ?? "—"}</td>
                      <td
                        className="px-5 py-3 text-right font-medium"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {variant ? formatDA(variant.price) : "—"}
                      </td>
                      <td
                        className="px-5 py-3 text-right"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {variant?.stock ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{
                            color: p.in_stock ? VIZ.good : VIZ.critical,
                            backgroundColor: (p.in_stock ? VIZ.good : VIZ.critical) + "1f",
                          }}
                        >
                          {p.in_stock ? t("admin.active") : t("shop.outOfStock")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() =>
                            setForm({
                              id: p.id,
                              name: p.name,
                              category: p.category?.id ?? "",
                              tagline: p.tagline,
                              description: p.description,
                              tint: p.tint,
                              price: variant?.price ?? "",
                              stock: String(variant?.stock ?? 0),
                              size: variant?.size ?? "Brume 200ml",
                              sku: variant?.sku ?? "",
                              bottlePreview: p.bottle_image ?? undefined,
                              backgroundPreview: p.background_image ?? undefined,
                            })
                          }
                          aria-label={t("admin.edit")}
                          className="rounded-full p-2 hover:bg-white/10 transition"
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
                          className="rounded-full p-2 text-red-400 hover:bg-red-500/15 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm"
                      style={{ color: VIZ.muted }}
                    >
                      {t("admin.noResults")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Slide-over editor */}
      {form && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            aria-label={t("cart.close")}
            onClick={() => setForm(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div
            className="relative h-full w-full max-w-md overflow-y-auto border-l border-white/10 p-6"
            style={{ backgroundColor: "#161615" }}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold uppercase tracking-widest">
                {form.id ? t("admin.edit") : t("admin.newProduct")}
              </h2>
              <button
                onClick={() => setForm(null)}
                aria-label={t("cart.close")}
                className="rounded-full p-2 hover:bg-white/10 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>{t("admin.name")}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t("admin.category")}</label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value ? Number(e.target.value) : "" })
                    }
                    className={`${inputCls} [&>option]:text-black`}
                  >
                    <option value="">—</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t("admin.tint")}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.tint}
                      onChange={(e) => setForm({ ...form, tint: e.target.value })}
                      className="h-10 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                    />
                    <span className="text-xs uppercase" style={{ color: VIZ.muted }}>
                      {form.tint}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className={labelCls}>Tagline</label>
                <input
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t("admin.price")} (DA)</label>
                  <input
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    inputMode="decimal"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t("admin.stock")}</label>
                  <input
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    inputMode="numeric"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t("admin.size")}</label>
                  <input
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>SKU</label>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["bottle", t("admin.bottleImage"), form.bottlePreview],
                    ["background", t("admin.backgroundImage"), form.backgroundPreview],
                  ] as const
                ).map(([field, label, preview]) => (
                  <div key={field}>
                    <label className={labelCls}>{label}</label>
                    <label
                      className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-dashed border-white/20 bg-white/[0.04] text-xs text-white/40 hover:border-white/40 transition"
                      style={
                        preview
                          ? {
                              backgroundImage: `url(${preview})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    >
                      {!preview && (
                        <>
                          <ImagePlus size={18} />
                          {t("admin.chooseImage")}
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setFile(field)(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => save.mutate(form)}
              disabled={save.isPending || !form.name || form.category === ""}
              className="mt-6 w-full rounded-full bg-white py-3.5 text-sm font-semibold uppercase tracking-widest text-black transition hover:bg-white/90 disabled:opacity-40"
            >
              {save.isPending ? t("common.loading") : t("admin.save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
