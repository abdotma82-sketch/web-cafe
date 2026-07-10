import { mediaUrl } from "../lib/api";
import { errText, qk, useApiQuery } from "../lib/queries";

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

/** Staff directory with role and status — reads /api/employees (needs employees.manage). */
export default function Employees() {
  const { data: list = [], error, isError } = useApiQuery<Employee[]>(qk.employees, "/api/employees");
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
          </div>
        ))}
        {list.length === 0 && !isError && <div className="text-sm text-slate-400">No employees.</div>}
      </div>
    </div>
  );
}
