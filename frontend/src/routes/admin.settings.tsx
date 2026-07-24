// Admin settings: account info + change password (back-office).
import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { Panel } from "@/components/admin/viz";
import { useUser } from "@/hooks/useAuth";
import { api, apiErrorMessage } from "@/lib/api";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Admin · Paramètres — AV Parfums" }] }),
  component: AdminSettings,
});

function AdminSettings() {
  const { t } = useTranslation();
  const { data: user } = useUser();

  const schema = z
    .object({
      old_password: z.string().min(1, t("admin.pwdRequired")),
      new_password1: z.string().min(8, t("admin.pwdMin")),
      new_password2: z.string().min(1, t("admin.pwdRequired")),
    })
    .refine((d) => d.new_password1 === d.new_password2, {
      path: ["new_password2"],
      message: t("admin.pwdMismatch"),
    });
  type Form = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const change = useMutation({
    mutationFn: (body: Form) => api("/api/v1/auth/password/change/", { method: "POST", body }),
    onSuccess: () => {
      toast.success(t("admin.pwdChanged"));
      reset();
    },
    onError: (err) => toast.error(apiErrorMessage(err, t("admin.pwdError"))),
  });

  const inputCls =
    "w-full rounded-xl border border-white/10 bg-white/[0.07] px-3.5 py-2.5 text-sm " +
    "placeholder:text-white/30 focus:border-white/40 focus:outline-none transition";
  const labelCls = "mb-1.5 block text-xs font-medium text-white/50";

  const onSubmit = handleSubmit((data) => change.mutate(data));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl uppercase" style={{ fontFamily: "Anton, sans-serif" }}>
          {t("admin.settings")}
        </h1>
        <p className="mt-1 text-sm text-white/40">{t("admin.settingsSub")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {/* Account */}
        <Panel title={t("admin.account")}>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg font-semibold uppercase">
              {(user?.first_name || user?.email || "A")[0]}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {user?.first_name || t("admin.admin")}
              </p>
              <p className="truncate text-sm text-white/50">{user?.email}</p>
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/70">
                <ShieldCheck size={12} /> {t("admin.roleAdmin")}
              </span>
            </div>
          </div>
        </Panel>

        {/* Change password */}
        <Panel title={t("admin.changePassword")}>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div>
              <label className={labelCls}>{t("admin.currentPassword")}</label>
              <input
                {...register("old_password")}
                type="password"
                className={inputCls}
                autoComplete="current-password"
              />
              {errors.old_password && (
                <p className="mt-1 text-xs text-red-400">{errors.old_password.message}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>{t("admin.newPassword")}</label>
              <input
                {...register("new_password1")}
                type="password"
                className={inputCls}
                autoComplete="new-password"
              />
              {errors.new_password1 && (
                <p className="mt-1 text-xs text-red-400">{errors.new_password1.message}</p>
              )}
              <p className="mt-1 text-[11px] text-white/35">{t("admin.pwdHint")}</p>
            </div>
            <div>
              <label className={labelCls}>{t("admin.confirmPassword")}</label>
              <input
                {...register("new_password2")}
                type="password"
                className={inputCls}
                autoComplete="new-password"
              />
              {errors.new_password2 && (
                <p className="mt-1 text-xs text-red-400">{errors.new_password2.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={change.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
            >
              <KeyRound size={15} />
              {change.isPending ? t("admin.saving") : t("admin.updatePassword")}
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
