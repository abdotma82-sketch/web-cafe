import { useState } from "react";
import { api, getSession, hasPermission, mediaUrl } from "../lib/api";
import { errText, qk, useApiQuery, useInvalidate } from "../lib/queries";

interface Employee {
  id: string;
  fullName: string;
  username: string;
  roleName: string;
  status: string;
  email: string | null;
  phone: string | null;
  image: string | null;
}

/** Staff directory with role and status — view and remove staff (needs employees.manage). */
export default function Employees() {
  const { data: list = [], error, isError } = useApiQuery<Employee[]>(qk.employees, "/api/employees");
  const [del, setDel] = useState<Employee | null>(null);
  const invalidate = useInvalidate();
  const canManage = hasPermission("employees.manage");
  const meId = getSession()?.employeeId;
  const errorMsg = isError ? errText(error, "Could not load employees.") : "";

  return (
    <div className="page page-wide">
      <h1 className="mb-4 text-2xl font-bold">Employees</h1>
      {errorMsg && <div className="mb-4 text-sm text-red-400">{errorMsg}</div>}

      <div className="grid-cards grid-cards-lg">
        {list.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#131c2e]">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-lg dark:bg-slate-800">
              {e.image ? <img src={mediaUrl(e.image)} alt={e.fullName} className="h-full w-full object-cover" /> : "👤"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{e.fullName}</div>
              <div className="truncate text-xs text-slate-400">
                {e.roleName} · @{e.username}
              </div>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                e.status === "Active" ? "bg-green-500/15 text-green-500" : "bg-slate-500/15 text-slate-400"
              }`}
            >
              {e.status}
            </span>
            {canManage && e.id !== meId && (
              <button onClick={() => setDel(e)} title="Remove staff" className="shrink-0 rounded-lg px-2 py-1 text-sm text-red-500 hover:bg-red-500/10">
                🗑
              </button>
            )}
          </div>
        ))}
        {list.length === 0 && !isError && <div className="text-sm text-slate-400">No employees.</div>}
      </div>

      {del && (
        <ConfirmRemove
          employee={del}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            await api.delete(`/api/employees/${del.id}`);
            setDel(null);
            invalidate(qk.employees);
          }}
        />
      )}
    </div>
  );
}

function ConfirmRemove({ employee, onClose, onConfirm }: { employee: Employee; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div onClick={onClose} className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4">
      <div onClick={(e) => e.stopPropagation()} className="modal-panel w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-[#131c2e]">
        <h3 className="text-lg font-bold">Remove staff?</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          <b>{employee.fullName}</b> (@{employee.username}) will lose access and be removed from the roster.
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
      </div>
    </div>
  );
}
