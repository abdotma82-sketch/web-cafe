import axios from "axios";

/** The signed-in session returned by POST /api/auth/login. */
export interface Session {
  token: string;
  employeeId: string;
  name: string;
  role: string;
  permissions: string[];
}

const KEY = "cafepos.session";

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

export function hasPermission(perm: string): boolean {
  return getSession()?.permissions.includes(perm) ?? false;
}

/**
 * Base URL of the API. Empty means "same origin" — used for local dev (Vite proxy) and for a
 * Vercel deploy that proxies /api via vercel.json rewrites. Set VITE_API_URL in the host's env
 * (e.g. https://cafepos-api.onrender.com) to call the deployed backend directly. Trailing
 * slashes are trimmed so `${API_BASE}/api/...` never doubles up.
 */
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

/** Absolute URL for a server media path like "/img/x.jpg" (honors VITE_API_URL in direct mode). */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return API_BASE ? API_BASE + path : path;
}

/** Axios instance with the bearer token attached; 401 clears the session. */
export const api = axios.create({ baseURL: API_BASE || "/" });

api.interceptors.request.use((config) => {
  const s = getSession();
  if (s) config.headers.Authorization = `Bearer ${s.token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401) {
      clearSession();
      if (location.pathname !== "/login") location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export async function login(username: string, password: string): Promise<Session> {
  // Use the configured `api` instance (not bare axios) so login honors API_BASE in direct mode.
  const { data } = await api.post<Session>("/api/auth/login", { username, password });
  localStorage.setItem(KEY, JSON.stringify(data));
  return data;
}

/** Money in the store currency (Moroccan Dirham). */
export function money(v: number | undefined | null): string {
  return (
    (v ?? 0).toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
    " DH"
  );
}
