// Admin promo codes: CRUD table with live usage + revenue attribution.
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Panel, VIZ } from "@/components/admin/viz";
import { api, apiErrorMessage } from "@/lib/api";
import { formatDA, formatDACompact } from "@/lib/format";
import type { PromoCode, PromoKind } from "@/lib/types";

export const Route = createFileRoute("/admin/promos")({
  head: () => ({ meta: [{ title: "Admin · Codes promo — AV Parfums" }] }),
  component: AdminPromos,
});

interface PromoForm {
  id?: number;
  code: string;
  kind: PromoKind;
  value: string;
  min_order: string;
  expires_at: string;
  usage_limit: string;
  per_customer_limit: string;
  is_active: boolean;
}

const EMPTY: PromoForm = {
  code: "",
  kind: "percent",
  value: "10",
  min_order: "0",
  expires_at: "",
  usage_limit: "",
  per_customer_limit: "0",
  is_active: true,
};

function AdminPromos() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState<PromoForm | null>(null);

  const { data: promos = [], isPending } = useQuery<PromoCode[]>({
    queryKey: ["admin", "promos"],
    queryFn: () => api<PromoCode[]>("/api/v1/admin/promos/"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "promos"] });

  const save = useMutation({
    mutationFn: (f: PromoForm) => {
      const body = {
        code: f.code,
        kind: f.kind,
        value: f.value || "0",
        min_order: f.min_order || "0",
        expires_at: f.expires_at || null,
        usage_limit: f.usage_limit ? parseInt(f.usage_limit, 10) : null,
        per_customer_limit: parseInt(f.per_customer_limit || "0", 10),
        is_active: f.is_active,
      };
      return f.id
        ? api(`/api/v1/admin/promos/${f.id}/`, { method: "PATCH", body })
        : api("/api/v1/admin/promos/", { method: "POST", body });
    },
    onSuccess: () => {
      toast.success(t("admin.saved"));
      setForm(null);
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, t("common.error"))),
  });

  const destroy = useMutation({
    mutationFn: (id: number) => api(`/api/v1/admin/promos/${id}/`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err, t("common.error"))),
  });

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/40 transition";
  const labelCls = "block text-xs font-medium text-white/50 mb-1.5";

  const describe = (p: PromoCode) =>
    p.kind === "percent"
      ? `−${parseFloat(p.value)}%`
      : p.kind === "fixed"
        ? `−${formatDACompact(p.value)}`
        : t("admin.freeShipping");

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-3xl uppercase" style={{ fontFamily: "Anton, sans-serif" }}>
          {t("admin.promos")}
          <span className="ml-3 align-middle font-sans text-sm normal-case text-white/40">
            {promos.length}
          </span>
        </h1>
        <button
          onClick={() => setForm(EMPTY)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
        >
          <Plus size={16} /> {t("admin.newPromo")}
        </button>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
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
                  <th className="px-5 py-3.5 font-medium">{t("admin.code")}</th>
                  <th className="px-5 py-3.5 font-medium">{t("admin.discount")}</th>
                  <th className="px-5 py-3.5 font-medium text-right">{t("admin.usage")}</th>
                  <th className="px-5 py-3.5 font-medium text-right">{t("admin.revenue")}</th>
                  <th className="px-5 py-3.5 font-medium">{t("admin.status")}</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {promos.length === 0 && (
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
                {promos.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-white/[0.06] transition hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-3">
                      <span className="rounded-md bg-white/10 px-2 py-1 font-mono text-xs font-semibold tracking-wider">
                        {p.code}
                      </span>
                      {parseFloat(p.min_order) > 0 && (
                        <span className="ml-2 text-xs" style={{ color: VIZ.muted }}>
                          {t("admin.min")} {formatDACompact(p.min_order)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-medium">{describe(p)}</td>
                    <td
                      className="px-5 py-3 text-right"
                      style={{ fontVariantNumeric: "tabular-nums", color: VIZ.secondary }}
                    >
                      {p.used_count}
                      {p.usage_limit ? ` / ${p.usage_limit}` : ""}
                    </td>
                    <td
                      className="px-5 py-3 text-right font-medium"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatDA(p.revenue)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{
                          color: p.is_active ? VIZ.good : VIZ.muted,
                          backgroundColor: (p.is_active ? VIZ.good : VIZ.muted) + "1f",
                        }}
                      >
                        {p.is_active ? t("admin.active") : t("admin.inactive")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() =>
                          setForm({
                            id: p.id,
                            code: p.code,
                            kind: p.kind,
                            value: p.value,
                            min_order: p.min_order,
                            expires_at: p.expires_at ?? "",
                            usage_limit: p.usage_limit ? String(p.usage_limit) : "",
                            per_customer_limit: String(p.per_customer_limit),
                            is_active: p.is_active,
                          })
                        }
                        aria-label={t("admin.edit")}
                        className="rounded-full p-2 transition hover:bg-white/10"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`${t("admin.delete")} ${p.code}?`))
                            destroy.mutate(p.id);
                        }}
                        aria-label={t("admin.delete")}
                        className="rounded-full p-2 text-red-400 transition hover:bg-red-500/15"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

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
                {form.id ? t("admin.edit") : t("admin.newPromo")}
              </h2>
              <button
                onClick={() => setForm(null)}
                aria-label={t("cart.close")}
                className="rounded-full p-2 hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>{t("admin.code")}</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="WELCOME10"
                  className={`${inputCls} font-mono tracking-wider`}
                />
              </div>
              <div>
                <label className={labelCls}>{t("admin.discountType")}</label>
                <select
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value as PromoKind })}
                  className={`${inputCls} [&>option]:text-black`}
                >
                  <option value="percent">{t("admin.kindPercent")}</option>
                  <option value="fixed">{t("admin.kindFixed")}</option>
                  <option value="free_shipping">{t("admin.freeShipping")}</option>
                </select>
              </div>
              {form.kind !== "free_shipping" && (
                <div>
                  <label className={labelCls}>
                    {form.kind === "percent" ? t("admin.percentValue") : t("admin.fixedValue")}
                  </label>
                  <input
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    inputMode="decimal"
                    className={inputCls}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t("admin.minOrder")} (DA)</label>
                  <input
                    value={form.min_order}
                    onChange={(e) => setForm({ ...form, min_order: e.target.value })}
                    inputMode="decimal"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t("admin.expiry")}</label>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className={`${inputCls} [color-scheme:dark]`}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t("admin.usageLimit")}</label>
                  <input
                    value={form.usage_limit}
                    onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                    inputMode="numeric"
                    placeholder="∞"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t("admin.perCustomer")}</label>
                  <input
                    value={form.per_customer_limit}
                    onChange={(e) => setForm({ ...form, per_customer_limit: e.target.value })}
                    inputMode="numeric"
                    className={inputCls}
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 accent-white"
                />
                {t("admin.activeCode")}
              </label>
            </div>

            <button
              onClick={() => save.mutate(form)}
              disabled={save.isPending || !form.code}
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
