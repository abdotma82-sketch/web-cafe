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

/** Axios instance with the bearer token attached; 401 clears the session. */
export const api = axios.create({ baseURL: "/" });

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
  const { data } = await axios.post<Session>("/api/auth/login", { username, password });
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
