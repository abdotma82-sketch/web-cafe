import { useState } from "react";
import { money } from "../lib/api";
import { qk, useApiQuery } from "../lib/queries";

interface Row {
  label: string;
  amount: number;
  count: number;
}
interface SalesReport {
  from: string;
  to: string;
  totalSales: number;
  grossProfit: number;
  taxCollected: number;
  orderCount: number;
  itemsSold: number;
  averageTicket: number;
  dailySales: Row[];
  topProducts: Row[];
  paymentMix: Row[];
}

const RANGES = [7, 30, 90];

/** Sales report over a selectable range — reads /api/reports/sales?days=N. */
export default function Reports() {
  const [days, setDays] = useState(7);
  const { data, isError } = useApiQuery<SalesReport>(qk.report(days), `/api/reports/sales?days=${days}`);
  const error = isError ? "Could not load the report." : "";

  const maxDay = Math.max(1, ...(data?.dailySales ?? []).map((r) => r.amount));

  return (
    <div className="page page-wide">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-1 rounded-xl border border-slate-200 p-1 dark:border-slate-700">
          {RANGES.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1 text-sm ${
                days === d ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

      <div className="grid-kpi">
        <Kpi value={money(data?.totalSales)} label="Total sales" accent />
        <Kpi value={money(data?.grossProfit)} label="Gross profit" />
        <Kpi value={String(data?.orderCount ?? 0)} label="Orders" />
        <Kpi value={money(data?.averageTicket)} label="Avg ticket" />
        <Kpi value={String(data?.itemsSold ?? 0)} label="Items" />
        <Kpi value={money(data?.taxCollected)} label="Tax" />
      </div>

      <div className="mt-4 grid-panels">
        <Panel title="Daily sales">
          <div className="flex h-40 items-end gap-1">
            {(data?.dailySales ?? []).map((r) => (
              <div key={r.label} className="flex flex-1 flex-col items-center gap-1" title={`${r.label}: ${money(r.amount)}`}>
                <div className="w-full rounded-t bg-blue-500/80" style={{ height: `${Math.max(2, (r.amount / maxDay) * 100)}%` }} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Top products">
          {(data?.topProducts ?? []).slice(0, 8).map((r) => (
            <RowLine key={r.label} left={r.label} sub={`${r.count} sold`} right={money(r.amount)} />
          ))}
          {(data?.topProducts?.length ?? 0) === 0 && <p className="text-sm text-slate-400">No sales in range.</p>}
        </Panel>
        <Panel title="Payment mix">
          {(data?.paymentMix ?? []).map((r) => (
            <RowLine key={r.label} left={r.label} right={money(r.amount)} />
          ))}
          {(data?.paymentMix?.length ?? 0) === 0 && <p className="text-sm text-slate-400">—</p>}
        </Panel>
      </div>
    </div>
  );
}

function Kpi({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131c2e]">
      <div className={`truncate text-lg font-extrabold ${accent ? "text-blue-500 dark:text-blue-400" : ""}`}>{value}</div>
      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131c2e]">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function RowLine({ left, sub, right }: { left: string; sub?: string; right: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-800">
      <span>
        {left}
        {sub && <span className="ml-2 text-xs text-slate-400">{sub}</span>}
      </span>
      <span className="font-semibold">{right}</span>
    </div>
  );
}
