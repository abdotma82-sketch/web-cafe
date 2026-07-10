import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { api } from "./api";

/**
 * One shared QueryClient for the app. Sensible enterprise defaults: data is considered fresh for
 * 15 s (so navigating between pages doesn't refetch needlessly), failed requests retry once, and
 * we don't spam refetches on window focus for a back-office tool. A 401 is already handled globally
 * by the axios interceptor, so there's nothing to retry there — retries are skipped for auth errors.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 1;
      },
    },
  },
});

/** Stable query keys — one place so invalidation and reads never drift apart. */
export const qk = {
  dashboard: ["dashboard"] as const,
  floorplan: ["floorplan"] as const,
  orders: ["orders"] as const,
  products: ["products"] as const,
  inventory: (low?: boolean, q?: string) => ["inventory", { low: !!low, q: q ?? "" }] as const,
  categories: ["inventory", "categories"] as const,
  customers: ["customers"] as const,
  employees: ["employees"] as const,
  finance: ["finance"] as const,
  report: (days: number) => ["report", days] as const,
  purchases: ["purchases"] as const,
};

/** Typed GET hook. `refetchInterval` turns a query into a live, self-refreshing feed. */
export function useApiQuery<T>(
  key: QueryKey,
  url: string,
  opts?: { refetchInterval?: number; enabled?: boolean },
) {
  return useQuery<T>({
    queryKey: key,
    queryFn: async ({ signal }) => (await api.get<T>(url, { signal })).data,
    refetchInterval: opts?.refetchInterval,
    enabled: opts?.enabled,
  });
}

/** Returns an invalidator so a write can refresh exactly the caches it touched. */
export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: QueryKey[]) => keys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
}

/** Convenience wrapper around useMutation that invalidates the given keys on success. */
export function useApiMutation<TVars, TData = unknown>(
  mutationFn: (vars: TVars) => Promise<TData>,
  invalidateKeys: QueryKey[] = [],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key })),
  });
}

/** Extract a human-readable message from an axios error (server `error` field or a fallback). */
export function errText(e: unknown, fallback = "Something went wrong."): string {
  const r = (e as { response?: { status?: number; data?: { error?: string } } })?.response;
  if (r?.status === 403) return "You don't have permission for this.";
  return r?.data?.error || fallback;
}
