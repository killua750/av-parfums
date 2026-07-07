// Pathless layout gating /account and /orders/$id: resolves the httpOnly
// cookie session via /auth/me before rendering, else bounces to /login.
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData({
      queryKey: ["auth", "me"],
      queryFn: async (): Promise<User | null> => {
        try {
          return await api<User>("/api/v1/auth/me/");
        } catch {
          return null;
        }
      },
      staleTime: 5 * 60 * 1000,
    });
    if (!user) {
      throw redirect({ to: "/login" });
    }
    return { user };
  },
  component: Outlet,
});
