// Thin typed fetch client. JWTs live in httpOnly cookies set by the backend,
// so every request just sends credentials; on a 401 we try one silent refresh
// and replay the original request.

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown) {
    super(typeof data === "string" ? data : `API error ${status}`);
    this.status = status;
    this.data = data;
  }
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  refreshPromise ??= fetch(`${BASE_URL}/api/v1/auth/token/refresh/`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRFToken": getCookie("csrftoken") ?? "" },
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

export async function api<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown; retried?: boolean } = {},
): Promise<T> {
  const { body, retried, ...init } = options;
  const isForm = body instanceof FormData;
  const resp = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(isForm ? {} : body !== undefined ? { "Content-Type": "application/json" } : {}),
      "X-CSRFToken": getCookie("csrftoken") ?? "",
      ...init.headers,
    },
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (resp.status === 401 && !retried && !path.includes("/auth/")) {
    if (await tryRefresh()) {
      return api<T>(path, { ...options, retried: true });
    }
  }

  if (!resp.ok) {
    let data: unknown;
    try {
      data = await resp.json();
    } catch {
      data = await resp.text().catch(() => "");
    }
    throw new ApiError(resp.status, data);
  }
  if (resp.status === 204) return undefined as T;
  return (await resp.json()) as T;
}

/** Flatten a DRF error payload into a single displayable message. */
export function apiErrorMessage(err: unknown, fallback = "Une erreur est survenue."): string {
  if (err instanceof ApiError && err.data && typeof err.data === "object") {
    const parts: string[] = [];
    for (const value of Object.values(err.data as Record<string, unknown>)) {
      if (Array.isArray(value)) parts.push(value.map(String).join(" "));
      else if (typeof value === "string") parts.push(value);
    }
    if (parts.length) return parts.join(" ");
  }
  return fallback;
}
