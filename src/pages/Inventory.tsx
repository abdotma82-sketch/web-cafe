import { useEffect, useMemo, useState } from "react";
import { api, mediaUrl, money } from "../lib/api";
import { errText, qk, useApiQuery, useInvalidate } from "../lib/queries";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  price: number;
  cost: number;
  marginPercent: number;
  stock: number;
  reorderLevel: number;
  trackStock: boolean;
  low: boolean;
  supplier: string | null;
  brand: string | null;
  image: string | null;
}
interface Category {
  id: string;
  name: string;
}

/** Inventory — stock levels with in-line recount / receive-waste adjustments (needs inventory.manage). */
export default function Inventory() {
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [edit, setEdit] = useState<Product | null>(null); // stock dialog target
  const [showNew, setShowNew] = useState(false);
  const invalidate = useInvalidate();

  const params = new URLSearchParams();
  if (lowOnly) params.set("low", "true");
  if (search.trim()) params.set("q", search.trim());

  const { data: list = [], error: qError, isError } = useApiQuery<Product[]>(
    qk.inventory(lowOnly, search.trim()),
    `/api/inventory?${params}`,
  );
  const { data: cats = [] } = useApiQuery<Category[]>(qk.categories, "/api/inventory/categories");
  const error = isError ? errText(qError, "Could not load inventory.") : "";
  const refresh = () => invalidate(["inventory"]); // covers list + categories (prefix match)

  const lowCount = useMemo(() => list.filter((p) => p.low).length, [list]);

  return (
    <div className="page page-wide">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">Inventory</h1>
        {lowCount > 0 && (
          <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-500">{lowCount} low</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-40 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#131c2e] sm:w-52"
          />
          <button
            onClick={() => setLowOnly((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-sm ${lowOnly ? "bg-red-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
          >
            Low
          </button>
          <button onClick={() => setShowNew(true)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
            + New
          </button>
        </div>
      </div>
      {error && <div className="mb-4 text-sm text-red-500">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#131c2e]">
        <div className="hidden grid-cols-12 gap-2 border-b border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800 sm:grid">
          <span className="col-span-5">Product</span>
          <span className="col-span-2 text-right">Price</span>
          <span className="col-span-2 text-right">Margin</span>
          <span className="col-span-2 text-right">Stock</span>
          <span className="col-span-1" />
        </div>
        {list.map((p) => (
          <div key={p.id} className="grid grid-cols-2 items-center gap-2 border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800 sm:grid-cols-12">
            <div className="col-span-2 flex items-center gap-3 sm:col-span-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-lg dark:bg-slate-800">
                {p.image ? <img src={mediaUrl(p.image)} alt={p.name} className="h-full w-full object-cover" /> : "☕"}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="truncate text-xs text-slate-400">{p.category}{p.sku ? ` · ${p.sku}` : ""}</div>
              </div>
            </div>
            <div className="text-right text-sm sm:col-span-2">{money(p.price)}</div>
            <div className="hidden text-right text-sm text-slate-500 sm:col-span-2 sm:block">{p.marginPercent.toFixed(0)}%</div>
            <div className="text-right sm:col-span-2">
              {p.trackStock ? (
                <span className={`text-sm font-bold ${p.low ? "text-red-500" : ""}`}>
                  {p.stock}
                  {p.low && <span className="ml-1 text-[10px]">≤{p.reorderLevel}</span>}
                </span>
              ) : (
                <span className="text-xs text-slate-400">untracked</span>
              )}
            </div>
            <div className="col-span-2 text-right sm:col-span-1">
              {p.trackStock && (
                <button onClick={() => setEdit(p)} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700">
                  Adjust
                </button>
              )}
            </div>
          </div>
        ))}
        {list.length === 0 && !error && <div className="px-4 py-6 text-sm text-slate-400">No products.</div>}
      </div>

      {edit && <StockDialog product={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); refresh(); }} />}
      {showNew && <NewProductDialog cats={cats} onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); refresh(); }} />}
    </div>
  );
}

/** Recount to an absolute count, or receive/waste by a signed delta. */
function StockDialog({ product, onClose, onDone }: { product: Product; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<"adjust" | "set">("adjust");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (sign = 1) => {
    const n = Number(amount);
    if (!amount || Number.isNaN(n)) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "set") {
        await api.post(`/api/inventory/${product.id}/set`, { quantity: n, reason: reason || null });
      } else {
        await api.post(`/api/inventory/${product.id}/adjust`, { quantity: sign * Math.abs(n), reason: reason || null });
      }
      onDone();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err?.response?.data?.error || "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-bold">{product.name}</h3>
      <p className="mb-3 text-sm text-slate-400">On hand: <span className="font-semibold text-slate-600 dark:text-slate-300">{product.stock}</span></p>

      <div className="mb-3 flex gap-1">
        <button onClick={() => setMode("adjust")} className={`flex-1 rounded-lg py-1.5 text-sm ${mode === "adjust" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>Receive / Waste</button>
        <button onClick={() => setMode("set")} className={`flex-1 rounded-lg py-1.5 text-sm ${mode === "set" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>Recount</button>
      </div>

      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
        inputMode="numeric"
        placeholder={mode === "set" ? "New count" : "Quantity"}
        className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0f1727]"
      />
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="mb-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0f1727]"
      />
      {error && <div className="mb-2 text-sm text-red-500">{error}</div>}

      {mode === "adjust" ? (
        <div className="flex gap-2">
          <button disabled={busy} onClick={() => submit(1)} className="flex-1 rounded-xl bg-green-600 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-40">+ Receive</button>
          <button disabled={busy} onClick={() => submit(-1)} className="flex-1 rounded-xl bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-40">− Waste</button>
        </div>
      ) : (
        <button disabled={busy} onClick={() => submit()} className="w-full rounded-xl bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-40">Set count</button>
      )}
    </Modal>
  );
}

/** Create a new tracked product. */
function NewProductDialog({ cats, onClose, onDone }: { cats: Category[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: "", sku: "", categoryId: "", price: "", cost: "", stockOnHand: "", reorderLevel: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (cats.length && !f.categoryId) set("categoryId", cats[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats]);

  const submit = async () => {
    if (!f.name.trim() || !f.categoryId) {
      setError("Name and category are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/api/inventory", {
        name: f.name.trim(),
        sku: f.sku.trim() || null,
        categoryId: f.categoryId,
        price: Number(f.price) || 0,
        cost: Number(f.cost) || 0,
        stockOnHand: Number(f.stockOnHand) || 0,
        reorderLevel: Number(f.reorderLevel) || 0,
      });
      onDone();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err?.response?.data?.error || "Could not create product.");
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0f1727]";

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-3 text-lg font-bold">New product</h3>
      <div className="space-y-2">
        <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Name" className={field} />
        <div className="flex gap-2">
          <input value={f.sku} onChange={(e) => set("sku", e.target.value)} placeholder="SKU (optional)" className={field} />
          <select value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={field}>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input value={f.price} onChange={(e) => set("price", e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="Price DH" className={field} />
          <input value={f.cost} onChange={(e) => set("cost", e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="Cost DH" className={field} />
        </div>
        <div className="flex gap-2">
          <input value={f.stockOnHand} onChange={(e) => set("stockOnHand", e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="Start stock" className={field} />
          <input value={f.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="Reorder level" className={field} />
        </div>
      </div>
      {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
      <button disabled={busy} onClick={submit} className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
        {busy ? "Creating…" : "Create product"}
      </button>
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4">
      <div onClick={(e) => e.stopPropagation()} className="modal-panel w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-[#131c2e]">
        {children}
      </div>
    </div>
  );
}
