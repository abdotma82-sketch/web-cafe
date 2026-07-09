import { useEffect, useMemo, useState } from "react";
import { api, money } from "../lib/api";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  low: boolean;
  image: string | null;
}

/** Product catalogue with photos, price and live stock — reads /api/products. */
export default function Products() {
  const [all, setAll] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Product[]>("/api/products")
      .then((r) => setAll(r.data))
      .catch(() => setError("Could not load products."))
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s
      ? all.filter((p) => p.name.toLowerCase().includes(s) || (p.category ?? "").toLowerCase().includes(s))
      : all;
  }, [all, q]);

  return (
    <div className="page page-wide">
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">{list.length} items</span>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products or category…"
        className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#131c2e]"
      />

      {error && <div className="mb-4 text-sm text-red-400">{error}</div>}
      {loading && <div className="text-sm text-slate-400">Loading…</div>}

      <div className="grid-cards grid-cards-md">
        {list.map((p) => (
          <div
            key={p.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131c2e]"
          >
            <div className="grid aspect-square place-items-center overflow-hidden bg-slate-100 dark:bg-[#0f1727]">
              {p.image ? (
                <img
                  src={p.image}
                  loading="lazy"
                  alt={p.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget.style.display = "none");
                  }}
                />
              ) : (
                <span className="text-3xl opacity-20">📦</span>
              )}
            </div>
            <div className="p-3">
              <div className="truncate text-sm font-semibold">{p.name}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-bold text-white">
                  {money(p.price)}
                </span>
                <span className={`text-xs ${p.low ? "font-bold text-red-500" : "text-slate-400"}`}>
                  {p.low ? "LOW · " : ""}
                  {p.stock}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && list.length === 0 && (
        <p className="mt-6 text-sm text-slate-400">No products match your search.</p>
      )}
    </div>
  );
}
