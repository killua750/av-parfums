import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useCartStore } from "@/stores/cart";

export function useUser() {
  return useQuery<User | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await api<User>("/api/v1/auth/me/");
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useIsAdmin(): boolean {
  const { data: user } = useUser();
  return user?.role === "admin";
}

/** Push locally stored guest items to the server cart after login. */
async function pushLocalCart() {
  const { items, clear } = useCartStore.getState();
  for (const item of items) {
    await api("/api/v1/cart/items/", {
      method: "POST",
      body: { variant_id: item.variantId, quantity: item.quantity },
    }).catch(() => undefined);
  }
  clear();
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api<{ user: User }>("/api/v1/auth/login/", { method: "POST", body: data }),
    onSuccess: async () => {
      await pushLocalCart();
      await qc.invalidateQueries();
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email: string;
      password1: string;
      password2: string;
      first_name?: string;
      phone?: string;
    }) => api<{ user: User }>("/api/v1/auth/register/", { method: "POST", body: data }),
    onSuccess: async () => {
      await pushLocalCart();
      await qc.invalidateQueries();
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/api/v1/auth/logout/", { method: "POST" }),
    onSettled: async () => {
      qc.setQueryData(["auth", "me"], null);
      await qc.invalidateQueries();
    },
  });
}
