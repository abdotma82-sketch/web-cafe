import { useEffect, useState } from "react";
import { api, money } from "../lib/api";

interface Expense {
  category: string;
  amount: number;
  vendor: string | null;
  date: string;
}
interface Pnl {
  income: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  recent: Expense[];
}

function Stat({ icon, value, label, tone }: { icon: string; value: string; label: string; tone?: "good" | "bad" }) {
  const color = tone === "bad" ? "text-red-500" : tone === "good" ? "text-blue-500 dark:text-blue-400" : "";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131c2e]">
      <div className="text-lg">{icon}</div>
      <div className={`mt-1 text-xl font-extrabold ${color}`}>{value}</div>
      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

/** Finance — this month's Profit & Loss + recent expenses (reads /api/finance/pnl). */
export default function Finance() {
  const [data, setData] = useState<Pnl | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Pnl>("/api/finance/pnl")
      .then((r) => setData(r.data))
      .catch(() => setError("Could not load finance data."));
  }, []);

  return (
    <div className="page page-wide">
      <h1 className="mb-1 text-2xl font-bold">Finance</h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Profit &amp; loss · this month</p>
      {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

      <div className="grid-kpi">
        <Stat icon="💰" value={money(data?.income)} label="Income (sales)" tone="good" />
        <Stat icon="📈" value={money(data?.grossProfit)} label="Gross profit" />
        <Stat icon="💸" value={money(data?.expenses)} label="Expenses" tone="bad" />
        <Stat icon="🏦" value={money(data?.netProfit)} label="Net profit" tone="good" />
      </div>

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">Recent expenses</h2>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131c2e]">
        {(data?.recent ?? []).map((x, i) => (
          <div key={i} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-slate-800">{x.category}</span>
              <span className="text-sm">{x.vendor || "—"}</span>
            </div>
            <span className="font-semibold text-red-500">{money(x.amount)}</span>
          </div>
        ))}
        {(data?.recent?.length ?? 0) === 0 && <div className="px-4 py-6 text-sm text-slate-400">No expenses recorded.</div>}
      </div>
    </div>
  );
}
