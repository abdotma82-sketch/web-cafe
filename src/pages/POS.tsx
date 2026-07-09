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
interface CartLine {
  id: string;
  name: string;
  price: number;
  qty: number;
}
interface Receipt {
  orderNumber: number;
  grandTotal: number;
  amountPaid: number;
  changeDue: number;
}

const ORDER_TYPES = [
  { value: 1, label: "Takeout" },
  { value: 0, label: "Dine-in" },
  { value: 2, label: "Delivery" },
];
const PAY_METHODS = [
  { value: 0, label: "💵 Cash" },
  { value: 1, label: "💳 Card" },
];

/** Point of sale — pick products, build a cart, tender. Money math is done server-side. */
export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderType, setOrderType] = useState(1);
  const [payMethod, setPayMethod] = useState(0);
  const [cashGiven, setCashGiven] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    api
      .get<Product[]>("/api/products")
      .then((r) => setProducts(r.data))
      .catch(() => setError("Could not load products."));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) : products;
  }, [products, search]);

  const total = useMemo(() => cart.reduce((s, l) => s + l.price * l.qty, 0), [cart]);

  const add = (p: Product) =>
    setCart((c) => {
      const found = c.find((l) => l.id === p.id);
      return found
        ? c.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l))
        : [...c, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });

  const setQty = (id: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.id !== id) : c.map((l) => (l.id === id ? { ...l, qty } : l))));

  const clear = () => {
    setCart([]);
    setCashGiven("");
    setError("");
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const body = {
        type: orderType,
        paymentMethod: payMethod,
        cashTendered: payMethod === 0 && cashGiven ? Number(cashGiven) : null,
        items: cart.map((l) => ({ menuItemId: l.id, quantity: l.qty })),
      };
      const r = await api.post<Receipt>("/api/pos/checkout", body);
      setReceipt(r.data);
      clear();
      // refresh stock counts after a sale
      api.get<Product[]>("/api/products").then((res) => setProducts(res.data)).catch(() => {});
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } } };
      setError(
        err?.response?.status === 403
          ? "You don't have permission to make sales."
          : err?.response?.data?.error || "Checkout failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  const change = payMethod === 0 && cashGiven ? Number(cashGiven) - total : 0;

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* ── Products ── */}
      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex items-center gap-2">
          <h1 className="text-2xl font-bold">POS</h1>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="ml-auto w-48 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#131c2e] sm:w-64"
          />
        </div>
        <div className="grid-cards grid-cards-sm">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => add(p)}
              className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition hover:border-blue-400 hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-[#131c2e]"
            >
              <div className="grid h-20 place-items-center bg-slate-100 text-2xl dark:bg-slate-800">
                {p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" /> : "☕"}
              </div>
              <div className="flex flex-1 flex-col p-2">
                <span className="line-clamp-2 text-sm font-semibold">{p.name}</span>
                <div className="mt-auto flex items-center justify-between pt-1">
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{money(p.price)}</span>
                  {p.low && <span className="rounded bg-red-500/15 px-1 text-[10px] font-semibold text-red-500">LOW</span>}
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-sm text-slate-400">No products.</p>}
        </div>
      </div>

      {/* ── Cart / tender ── */}
      <aside className="flex w-full shrink-0 flex-col border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1727] lg:w-80 lg:border-l lg:border-t-0 3xl:w-96">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="font-bold">🛒 Cart</h2>
          {cart.length > 0 && (
            <button onClick={clear} className="text-xs text-red-500 hover:underline">
              Clear
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {cart.length === 0 && <p className="p-4 text-sm text-slate-400">Tap products to add them.</p>}
          {cart.map((l) => (
            <div key={l.id} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{l.name}</div>
                <div className="text-xs text-slate-400">{money(l.price)}</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setQty(l.id, l.qty - 1)} className="h-6 w-6 rounded bg-slate-100 text-sm dark:bg-slate-800">−</button>
                <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                <button onClick={() => setQty(l.id, l.qty + 1)} className="h-6 w-6 rounded bg-slate-100 text-sm dark:bg-slate-800">+</button>
              </div>
              <span className="w-16 text-right text-sm font-semibold">{money(l.price * l.qty)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex gap-1">
            {ORDER_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setOrderType(t.value)}
                className={`flex-1 rounded-lg py-1 text-xs ${orderType === t.value ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="mb-3 flex gap-1">
            {PAY_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setPayMethod(m.value)}
                className={`flex-1 rounded-lg py-1.5 text-sm ${payMethod === m.value ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {payMethod === 0 && (
            <input
              value={cashGiven}
              onChange={(e) => setCashGiven(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="Cash received (optional)"
              className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#131c2e]"
            />
          )}
          {payMethod === 0 && cashGiven && change >= 0 && (
            <div className="mb-2 text-xs text-slate-500">Change: <span className="font-semibold text-green-600">{money(change)}</span></div>
          )}

          <div className="mb-3 flex items-center justify-between text-lg font-extrabold">
            <span>Total</span>
            <span className="text-blue-600 dark:text-blue-400">{money(total)}</span>
          </div>
          {error && <div className="mb-2 text-sm text-red-500">{error}</div>}
          <button
            onClick={checkout}
            disabled={busy || cart.length === 0}
            className="w-full rounded-xl bg-green-600 py-3 font-bold text-white transition hover:bg-green-700 disabled:opacity-40"
          >
            {busy ? "Processing…" : `Charge ${money(total)}`}
          </button>
        </div>
      </aside>

      {/* ── Receipt modal ── */}
      {receipt && (
        <div onClick={() => setReceipt(null)} className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4">
          <div onClick={(e) => e.stopPropagation()} className="modal-panel w-full max-w-xs rounded-2xl bg-white p-6 text-center dark:bg-[#131c2e]">
            <div className="mb-2 text-4xl">✅</div>
            <h3 className="text-lg font-bold">Sale complete</h3>
            <p className="mt-1 text-sm text-slate-400">Order #{receipt.orderNumber}</p>
            <div className="my-4 space-y-1 text-sm">
              <div className="flex justify-between"><span>Total</span><span className="font-semibold">{money(receipt.grandTotal)}</span></div>
              <div className="flex justify-between"><span>Paid</span><span className="font-semibold">{money(receipt.amountPaid)}</span></div>
              {receipt.changeDue > 0 && (
                <div className="flex justify-between text-green-600"><span>Change</span><span className="font-bold">{money(receipt.changeDue)}</span></div>
              )}
            </div>
            <button onClick={() => setReceipt(null)} className="w-full rounded-xl bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700">
              New sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
