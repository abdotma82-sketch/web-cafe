import { useCallback, useEffect, useState } from "react";
import { api, clearSession, money } from "../lib/api";

interface NamedAmount {
  name: string;
  amount: number;
}
interface HourSales {
  hour: number;
  amount: number;
}
interface TopSeller {
  name: string;
  quantity: number;
  revenue: number;
}
interface DashboardData {
  day: string;
  totalSales: number;
  grossProfit: number;
  profitMarginPercent: number;
  taxCollected: number;
  discounts: number;
  orderCount: number;
  itemsSold: number;
  averageTicket: number;
  salesByHour: HourSales[];
  salesByCategory: NamedAmount[];
  salesByPayment: NamedAmount[];
  topSellers: TopSeller[];
}

function Kpi({ icon, value, label, accent }: { icon: string; value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131c2e]">
      <div className="text-lg">{icon}</div>
      <div className={`mt-1 truncate text-xl font-extrabold ${accent ? "text-blue-500 dark:text-blue-400" : ""}`}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

/** Live owner dashboard — refreshes every 10 s from /api/dashboard/today. */
export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .get<DashboardData>("/api/dashboard/today")
      .then((r) => {
        setData(r.data);
        setError("");
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403) {
          // Stale / expired session — bounce to login for a fresh token.
          clearSession();
          location.href = "/login";
          return;
        }
        setError(
          status
            ? `Could not load the dashboard (HTTP ${status}).`
            : "Cannot reach the till API — is the server running on port 5088?",
        );
      });
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  const hours = (data?.salesByHour ?? []).filter((h) => h.hour >= 6 && h.hour <= 22);
  const maxHour = Math.max(1, ...hours.map((h) => h.amount));

  return (
    <div className="page page-wide">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{data?.day ?? "…"} · live, refreshes every 10 s</p>
        </div>
        <button
          onClick={load}
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          ⟳ Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* KPI grid */}
      <div className="grid-kpi">
        <Kpi icon="💰" value={money(data?.totalSales)} label="Sales today" accent />
        <Kpi icon="📈" value={money(data?.grossProfit)} label={`Gross profit · ${data?.profitMarginPercent ?? 0}%`} />
        <Kpi icon="🧾" value={String(data?.orderCount ?? 0)} label="Orders" />
        <Kpi icon="🎫" value={money(data?.averageTicket)} label="Avg ticket" />
        <Kpi icon="📦" value={String(data?.itemsSold ?? 0)} label="Items sold" />
        <Kpi icon="🧮" value={money(data?.taxCollected)} label="Tax collected" />
      </div>

      <div className="mt-4 grid-panels">
        {/* Sales by hour */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131c2e]">
          <h2 className="mb-3 text-sm font-semibold">Sales by hour</h2>
          <div className="flex h-36 items-end gap-1">
            {hours.map((h) => (
              <div key={h.hour} className="flex flex-1 flex-col items-center gap-1" title={money(h.amount)}>
                <div
                  className="w-full rounded-t bg-blue-500/80 transition-all"
                  style={{ height: `${Math.max(2, (h.amount / maxHour) * 100)}%` }}
                />
                <span className="text-[9px] text-slate-400">{h.hour}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Top sellers */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131c2e]">
          <h2 className="mb-3 text-sm font-semibold">Top sellers</h2>
          {(data?.topSellers?.length ?? 0) === 0 && (
            <p className="text-sm text-slate-400">No sales yet today.</p>
          )}
          {data?.topSellers?.slice(0, 6).map((t, i) => (
            <div
              key={t.name}
              className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-800"
            >
              <span className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-xs font-bold dark:bg-slate-800">
                  {i + 1}
                </span>
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-slate-400">{t.quantity} sold</span>
              </span>
              <span className="font-semibold">{money(t.revenue)}</span>
            </div>
          ))}
        </section>

        {/* Payment mix */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131c2e]">
          <h2 className="mb-3 text-sm font-semibold">Payment mix</h2>
          {(data?.salesByPayment?.length ?? 0) === 0 && <p className="text-sm text-slate-400">—</p>}
          {data?.salesByPayment?.map((p) => (
            <div
              key={p.name}
              className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-800"
            >
              <span>{p.name}</span>
              <span className="font-semibold">{money(p.amount)}</span>
            </div>
          ))}
        </section>

        {/* Sales by category */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131c2e]">
          <h2 className="mb-3 text-sm font-semibold">Sales by category</h2>
          {(data?.salesByCategory?.length ?? 0) === 0 && <p className="text-sm text-slate-400">—</p>}
          {data?.salesByCategory?.map((c) => {
            const max = Math.max(1, ...(data?.salesByCategory ?? []).map((x) => x.amount));
            return (
              <div key={c.name} className="py-1.5">
                <div className="flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="font-semibold">{money(c.amount)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${(c.amount / max) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
