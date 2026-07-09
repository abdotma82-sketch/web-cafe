import { useEffect, useMemo, useState } from "react";
import { api, money } from "../lib/api";

interface Customer {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  loyaltyPoints: number;
  storeCredit: number;
}

/** Customer directory with loyalty points and store-credit balance — reads /api/customers. */
export default function Customers() {
  const [all, setAll] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<Customer[]>("/api/customers")
      .then((r) => setAll(r.data))
      .catch(() => setError("Could not load customers."));
  }, []);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s
      ? all.filter((c) => c.fullName.toLowerCase().includes(s) || (c.phone ?? "").includes(s))
      : all;
  }, [all, q]);

  return (
    <div className="page page-wide">
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">{list.length}</span>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or phone…"
        className="mb-4 w-full max-w-xl rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#131c2e]"
      />
      {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

      <div className="grid-cards grid-cards-lg">
        {list.map((c) => (
          <div key={c.id} className="card flex items-center gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {c.fullName[0]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{c.fullName}</div>
              <div className="truncate text-xs text-slate-400">{c.phone || c.email || "—"}</div>
            </div>
            <div className="text-right text-xs">
              <div className="font-semibold text-blue-500 dark:text-blue-400">⭐ {c.loyaltyPoints} pts</div>
              <div className="text-slate-400">{money(c.storeCredit)} credit</div>
            </div>
          </div>
        ))}
        {list.length === 0 && !error && <div className="text-sm text-slate-400">No customers.</div>}
      </div>
    </div>
  );
}
