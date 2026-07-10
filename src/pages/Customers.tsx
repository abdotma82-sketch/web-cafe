import { useMemo, useState } from "react";
import { api, hasPermission, money } from "../lib/api";
import { errText, qk, useApiQuery, useInvalidate } from "../lib/queries";

interface Customer {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  loyaltyPoints: number;
  storeCredit: number;
  notes: string | null;
  marketingOptIn: boolean;
}

/** Customer directory — view, add, edit and remove customers (needs sales.create). */
export default function Customers() {
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Customer | "new" | null>(null); // dialog target
  const [del, setDel] = useState<Customer | null>(null); // delete-confirm target
  const { data: all = [], isError } = useApiQuery<Customer[]>(qk.customers, "/api/customers");
  const invalidate = useInvalidate();
  const canManage = hasPermission("sales.create");
  const error = isError ? "Could not load customers." : "";

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? all.filter((c) => c.fullName.toLowerCase().includes(s) || (c.phone ?? "").includes(s)) : all;
  }, [all, q]);

  return (
    <div className="page page-wide">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">Customers</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">{list.length}</span>
        {canManage && (
          <button onClick={() => setEdit("new")} className="ml-auto rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
            + New customer
          </button>
        )}
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
          <div key={c.id} className="card group flex items-center gap-3 p-4">
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
            {canManage && (
              <div className="flex shrink-0 flex-col gap-1">
                <button onClick={() => setEdit(c)} title="Edit" className="rounded-lg px-2 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">✎</button>
                <button onClick={() => setDel(c)} title="Remove" className="rounded-lg px-2 py-1 text-sm text-red-500 hover:bg-red-500/10">🗑</button>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && !error && <div className="text-sm text-slate-400">No customers.</div>}
      </div>

      {edit && (
        <CustomerDialog
          customer={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
          onDone={() => { setEdit(null); invalidate(qk.customers); }}
        />
      )}
      {del && (
        <ConfirmDelete
          name={del.fullName}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            await api.delete(`/api/customers/${del.id}`);
            setDel(null);
            invalidate(qk.customers);
          }}
        />
      )}
    </div>
  );
}

/** Add or edit a customer. The single name field is split into first/last on submit. */
function CustomerDialog({ customer, onClose, onDone }: { customer: Customer | null; onClose: () => void; onDone: () => void }) {
  const [fullName, setFullName] = useState(customer?.fullName ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [marketing, setMarketing] = useState(customer?.marketingOptIn ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0f1727]";

  const submit = async () => {
    const name = fullName.trim();
    if (!name) return setError("Name is required.");
    const parts = name.split(/\s+/);
    const body = {
      firstName: parts[0],
      lastName: parts.slice(1).join(" ") || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
      marketingOptIn: marketing,
    };
    setBusy(true);
    setError("");
    try {
      if (customer) await api.put(`/api/customers/${customer.id}`, body);
      else await api.post("/api/customers", body);
      onDone();
    } catch (e: unknown) {
      setError(errText(e, "Could not save the customer."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 className="mb-3 text-lg font-bold">{customer ? "Edit customer" : "New customer"}</h3>
      <div className="space-y-2">
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name *" className={field} />
        <div className="flex gap-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className={field} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={field} />
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={2} className={field} />
        <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /> Marketing opt-in
        </label>
      </div>
      {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
      <button disabled={busy} onClick={submit} className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
        {busy ? "Saving…" : customer ? "Save changes" : "Add customer"}
      </button>
    </Modal>
  );
}

function ConfirmDelete({ name, onClose, onConfirm }: { name: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-bold">Remove customer?</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        <b>{name}</b> will be removed from the directory. This can't be undone here.
      </p>
      {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
      <div className="mt-4 flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">Cancel</button>
        <button
          disabled={busy}
          onClick={async () => { setBusy(true); setError(""); try { await onConfirm(); } catch (e) { setError(errText(e, "Could not remove.")); setBusy(false); } }}
          className="flex-1 rounded-xl bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-40"
        >
          {busy ? "Removing…" : "Remove"}
        </button>
      </div>
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
