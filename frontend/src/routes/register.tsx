import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { useRegister } from "@/hooks/useAuth";
import { apiErrorMessage } from "@/lib/api";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Créer un compte — AV Parfums" }] }),
  component: RegisterPage,
});

const registerSchema = z
  .object({
    email: z.string().email(),
    first_name: z.string().optional(),
    phone: z
      .string()
      .transform((s) => s.replace(/\s/g, ""))
      .pipe(
        z
          .string()
          .regex(/^(\+213|0)(5|6|7)[0-9]{8}$/)
          .or(z.literal("")),
      ),
    password1: z.string().min(8),
    password2: z.string(),
  })
  .refine((d) => d.password1 === d.password2, {
    path: ["password2"],
    message: "different",
  });

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });

  const inputCls =
    "w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-sm placeholder:text-white/40 focus:outline-none focus:border-white/50";

  const onSubmit = handleSubmit(async (data) => {
    try {
      await registerMutation.mutateAsync(data);
      toast.success(t("auth.welcome"));
      void navigate({ to: "/" });
    } catch (err) {
      toast.error(apiErrorMessage(err, t("common.error")));
    }
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-white pt-24 px-4 flex items-start justify-center">
      <div className="w-full max-w-sm mt-12">
        <h1 className="text-4xl uppercase mb-8" style={{ fontFamily: "Anton, sans-serif" }}>
          {t("auth.register")}
        </h1>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <div>
            <input
              {...register("email")}
              type="email"
              placeholder={t("auth.email")}
              className={inputCls}
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <input
            {...register("first_name")}
            placeholder={t("auth.firstName")}
            className={inputCls}
          />
          <div>
            <input
              {...register("phone")}
              inputMode="tel"
              placeholder={t("auth.phone")}
              className={inputCls}
            />
            {errors.phone && (
              <p className="text-red-400 text-xs mt-1">{t("checkout.errors.phone")}</p>
            )}
          </div>
          <div>
            <input
              {...register("password1")}
              type="password"
              placeholder={t("auth.password")}
              className={inputCls}
            />
            {errors.password1 && (
              <p className="text-red-400 text-xs mt-1">{errors.password1.message}</p>
            )}
          </div>
          <div>
            <input
              {...register("password2")}
              type="password"
              placeholder={t("auth.passwordConfirm")}
              className={inputCls}
            />
            {errors.password2 && (
              <p className="text-red-400 text-xs mt-1">{t("auth.passwordConfirm")}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-full bg-white text-black text-sm font-semibold uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50"
          >
            {t("auth.register")}
          </button>
        </form>
        <p className="mt-6 text-sm text-white/60">
          {t("auth.haveAccount")}{" "}
          <Link to="/login" className="text-white underline">
            {t("auth.login")}
          </Link>
        </p>
      </div>
    </main>
  );
}
