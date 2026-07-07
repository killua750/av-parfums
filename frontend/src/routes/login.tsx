import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { useLogin } from "@/hooks/useAuth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion — AV Parfums" }] }),
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  const inputCls =
    "w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-sm placeholder:text-white/40 focus:outline-none focus:border-white/50";

  const onSubmit = handleSubmit(async (data) => {
    try {
      await login.mutateAsync(data);
      toast.success(t("auth.welcome"));
      void navigate({ to: "/" });
    } catch {
      toast.error(t("auth.loginFailed"));
    }
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-white pt-24 px-4 flex items-start justify-center">
      <div className="w-full max-w-sm mt-12">
        <h1 className="text-4xl uppercase mb-8" style={{ fontFamily: "Anton, sans-serif" }}>
          {t("auth.login")}
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
          <div>
            <input
              {...register("password")}
              type="password"
              placeholder={t("auth.password")}
              className={inputCls}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-full bg-white text-black text-sm font-semibold uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50"
          >
            {t("auth.login")}
          </button>
        </form>
        <p className="mt-6 text-sm text-white/60">
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="text-white underline">
            {t("auth.register")}
          </Link>
        </p>
      </div>
    </main>
  );
}
