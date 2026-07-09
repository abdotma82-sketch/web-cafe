import { useCallback, useEffect, useMemo, useState } from "react";
import { api, money } from "../lib/api";

interface PurchaseLine {
  productName: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}
interface Purchase {
  id: string;
  supplier: string;
  invoiceNumber: string | null;
  date: string;
  itemsSubtotal: number;
  shippingCost: number;
  totalCost: number;
  lineCount: number;
  status: string;
  lines: PurchaseLine[];
}
interface Product {
  id: string;
  name: string;
  cost: number;
  stock: number;
}

/** Purchasing — supplier goods-received notes. Receiving a purchase auto-adds stock
    (needs inventory.manage). */
export default function Purchasing() {
  const [list, setList] = useState<Purchase[]>([]);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [open, setOpen] = useState<string | null>(null); // expanded purchase id

  const load = useCallback(() => {
    api
      .get<Purchase[]>("/api/purchases")
      .then((r) => {
        setList(r.data);
        setError("");
      })
      .catch((e) =>
        setError(e?.response?.status === 403 ? "You don't have permission to view purchasing." : "Could not load purchases."),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalSpend = useMemo(() => list.reduce((s, p) => s + p.totalCost, 0), [list]);

  return (
    <div className="page page-wide">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">Purchasing</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">{list.length} purchases · {money(totalSpend)} spent</span>
        <button onClick={() => setShowNew(true)} className="ml-auto rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
          + New purchase
        </button>
      </div>
      {error && <div className="mb-4 text-sm text-red-500">{error}</div>}

      <div className="grid-cards grid-cards-lg">
        {list.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold">{p.supplier}</div>
                <div className="truncate text-xs text-slate-400">
                  {p.invoiceNumber ? `#${p.invoiceNumber} · ` : ""}
                  {new Date(p.date).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-semibold text-green-500">{p.status}</span>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <div className="text-xs text-slate-400">{p.lineCount} item{p.lineCount === 1 ? "" : "s"}</div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{money(p.totalCost)}</div>
                {p.shippingCost > 0 && <div className="text-[11px] text-slate-400">incl. {money(p.shippingCost)} shipping</div>}
              </div>
            </div>

            <button
              onClick={() => setOpen(open === p.id ? null : p.id)}
              className="mt-2 text-xs font-semibold text-blue-500 hover:underline"
            >
              {open === p.id ? "Hide items" : "View items"}
            </button>
            {open === p.id && (
              <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                {p.lines.map((l, i) => (
                  <div key={i} className="flex justify-between py-1 text-sm">
                    <span className="truncate">{l.productName} <span className="text-xs text-slate-400">×{l.quantity}</span></span>
                    <span className="font-medium">{money(l.lineTotal)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && !error && <div className="text-sm text-slate-400">No purchases yet.</div>}
      </div>

      {showNew && <NewPurchaseDialog onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); load(); }} />}
    </div>
  );
}

interface Draft {
  productId: string;
  name: string;
  quantity: number;
  unitCost: number;
}

/** Build a purchase: pick products, set qty × unit cost, add shipping, submit → stock rises. */
function NewPurchaseDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [supplier, setSupplier] = useState("");
  const [invoice, setInvoice] = useState("");
  const [shipping, setShipping] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Draft[]>([]);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Product[]>("/api/inventory").then((r) => setProducts(r.data)).catch(() => {});
  }, []);

  const addLine = (id: string) => {
    if (!id) return;
    const p = products.find((x) => x.id === id);
    if (!p || lines.some((l) => l.productId === id)) return;
    setLines((ls) => [...ls, { productId: p.id, name: p.name, quantity: 1, unitCost: p.cost }]);
    setPick("");
  };
  const setLine = (id: string, k: "quantity" | "unitCost", v: number) =>
    setLines((ls) => ls.map((l) => (l.productId === id ? { ...l, [k]: v } : l)));
  const removeLine = (id: string) => setLines((ls) => ls.filter((l) => l.productId !== id));

  const itemsSubtotal = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const total = itemsSubtotal + (Number(shipping) || 0);

  const submit = async () => {
    if (!supplier.trim()) return setError("Supplier is required.");
    if (lines.length === 0) return setError("Add at least one product line.");
    setBusy(true);
    setError("");
    try {
      await api.post("/api/purchases", {
        supplier: supplier.trim(),
        invoiceNumber: invoice.trim() || null,
        shippingCost: Number(shipping) || 0,
        notes: notes.trim() || null,
        lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost })),
      });
      onDone();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err?.response?.data?.error || "Could not record the purchase.");
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0f1727]";
  const available = products.filter((p) => !lines.some((l) => l.productId === p.id));

  return (
    <div onClick={onClose} className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4">
      <div onClick={(e) => e.stopPropagation()} className="modal-panel w-full max-w-lg rounded-2xl bg-white p-5 dark:bg-[#131c2e]">
        <h3 className="mb-3 text-lg font-bold">New purchase</h3>

        <div className="form-grid mb-3">
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier *" className={field} />
          <input value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="Invoice # (optional)" className={field} />
        </div>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className={`${field} mb-2`} />

        {/* Product picker */}
        <select value={pick} onChange={(e) => addLine(e.target.value)} className={`${field} mb-2`}>
          <option value="">+ Add a product…</option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>{p.name} (stock {p.stock})</option>
          ))}
        </select>

        {/* Lines */}
        <div className="mb-3 max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
          {lines.length === 0 && <div className="p-3 text-sm text-slate-400">No lines yet — add a product above.</div>}
          {lines.map((l) => (
            <div key={l.productId} className="flex items-center gap-2 border-b border-slate-100 p-2 last:border-0 dark:border-slate-800">
              <span className="min-w-0 flex-1 truncate text-sm">{l.name}</span>
              <input
                type="number" min={1} value={l.quantity}
                onChange={(e) => setLine(l.productId, "quantity", Math.max(1, Number(e.target.value)))}
                className="w-14 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-right text-sm dark:border-slate-700 dark:bg-[#0f1727]"
                title="Quantity"
              />
              <span className="text-xs text-slate-400">×</span>
              <input
                type="number" min={0} step="0.01" value={l.unitCost}
                onChange={(e) => setLine(l.productId, "unitCost", Math.max(0, Number(e.target.value)))}
                className="w-20 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-right text-sm dark:border-slate-700 dark:bg-[#0f1727]"
                title="Unit cost"
              />
              <span className="w-20 text-right text-sm font-semibold">{money(l.quantity * l.unitCost)}</span>
              <button onClick={() => removeLine(l.productId)} className="px-1 text-red-500 hover:text-red-600" title="Remove">✕</button>
            </div>
          ))}
        </div>

        <div className="mb-3 flex items-center gap-2">
          <input
            value={shipping}
            onChange={(e) => setShipping(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            placeholder="Shipping DH"
            className={`${field} max-w-40`}
          />
          <div className="ml-auto text-right">
            <div className="text-xs text-slate-400">Items {money(itemsSubtotal)}</div>
            <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{money(total)}</div>
          </div>
        </div>

        {error && <div className="mb-2 text-sm text-red-500">{error}</div>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">Cancel</button>
          <button disabled={busy} onClick={submit} className="flex-[2] rounded-xl bg-green-600 py-2.5 font-bold text-white hover:bg-green-700 disabled:opacity-40">
            {busy ? "Recording…" : `Receive · ${money(total)}`}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">Receiving adds each item's quantity to stock.</p>
      </div>
    </div>
  );
}
