import { useEffect, useMemo, useRef, useState } from "react";
import { api, hasPermission } from "../lib/api";
import { qk, useApiQuery, useInvalidate } from "../lib/queries";

type Status = "Available" | "Occupied" | "Reserved" | "Cleaning" | "Disabled";
interface Table {
  id: string;
  areaId: string;
  label: string;
  seats: number;
  status: Status;
  shape: "Square" | "Round" | "Rectangle";
  x: number;
  y: number;
  activeOrderId: string | null;
  mergedIntoTableId: string | null;
}
interface Area {
  id: string;
  name: string;
  areaType: string;
  displayOrder: number;
  tableCount: number;
  occupiedCount: number;
  availableCount: number;
  seats: number;
  tables: Table[];
}

const STATUSES: Status[] = ["Available", "Occupied", "Reserved", "Cleaning", "Disabled"];
const STATUS_ENUM: Record<Status, number> = { Available: 0, Occupied: 1, Reserved: 2, Cleaning: 3, Disabled: 4 };
const STATUS_STYLE: Record<Status, string> = {
  Available: "bg-green-500/15 border-green-500 text-green-600 dark:text-green-400",
  Occupied: "bg-red-500/15 border-red-500 text-red-600 dark:text-red-400",
  Reserved: "bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400",
  Cleaning: "bg-sky-500/15 border-sky-500 text-sky-600 dark:text-sky-400",
  Disabled: "bg-slate-500/15 border-slate-400 text-slate-400",
};
const STATUS_DOT: Record<Status, string> = {
  Available: "bg-green-500", Occupied: "bg-red-500", Reserved: "bg-amber-500", Cleaning: "bg-sky-500", Disabled: "bg-slate-400",
};

/** Restaurant floor plan — live table states on a canvas, with drag-to-move, add/delete, merge/split. */
export default function Floor() {
  const [activeArea, setActiveArea] = useState<string>("");
  const [error, setError] = useState("");
  const [manage, setManage] = useState(false);
  const [sel, setSel] = useState<Table | null>(null); // table whose action popover is open
  const [mergePick, setMergePick] = useState<string[]>([]); // ids selected for merge
  const [showAdd, setShowAdd] = useState(false);
  const canManage = hasPermission("tables.manage");
  const invalidate = useInvalidate();

  // Live floor: TanStack Query polls every 12 s so occupancy stays fresh; writes invalidate this key.
  const { data: areas = [], isError } = useApiQuery<Area[]>(qk.floorplan, "/api/floorplan", { refetchInterval: 12_000 });
  const load = () => invalidate(qk.floorplan); // writes call this to refresh the plan
  useEffect(() => { if (isError) setError("Could not load the floor plan."); else setError(""); }, [isError]);
  useEffect(() => { if (!activeArea && areas[0]) setActiveArea(areas[0].id); }, [areas, activeArea]);

  const area = useMemo(() => areas.find((a) => a.id === activeArea), [areas, activeArea]);
  const totals = useMemo(() => {
    const all = areas.flatMap((a) => a.tables);
    return { total: all.length, occupied: all.filter((t) => t.status === "Occupied").length, seats: all.reduce((s, t) => s + t.seats, 0) };
  }, [areas]);

  const setStatus = async (t: Table, status: Status) => {
    setSel(null);
    try {
      await api.post(`/api/floorplan/tables/${t.id}/status`, { status: STATUS_ENUM[status] });
      load();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Could not update the table.");
    }
  };
  const remove = async (t: Table) => {
    setSel(null);
    try {
      await api.delete(`/api/floorplan/tables/${t.id}`);
      load();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Could not remove the table.");
    }
  };
  const doMerge = async () => {
    if (mergePick.length < 2) return;
    try {
      await api.post("/api/floorplan/merge", { tableIds: mergePick });
      setMergePick([]);
      load();
    } catch { setError("Merge failed."); }
  };
  const doSplit = async (t: Table) => {
    setSel(null);
    const primary = t.mergedIntoTableId ?? t.id;
    try {
      await api.post("/api/floorplan/split", { primaryTableId: primary });
      load();
    } catch { setError("Split failed."); }
  };

  return (
    <div className="page page-wide">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">Floor Plan</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {totals.occupied}/{totals.total} occupied · {totals.seats} seats
        </span>
        <div className="ml-auto flex items-center gap-2">
          {canManage && manage && mergePick.length >= 2 && (
            <button onClick={doMerge} className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-purple-700">
              Merge {mergePick.length}
            </button>
          )}
          {canManage && manage && (
            <button onClick={() => setShowAdd(true)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
              + Table
            </button>
          )}
          {canManage && (
            <button
              onClick={() => { setManage((m) => !m); setMergePick([]); setSel(null); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${manage ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800"}`}
            >
              {manage ? "Done" : "✎ Arrange"}
            </button>
          )}
        </div>
      </div>
      {error && <div className="mb-3 text-sm text-red-500">{error}</div>}

      {/* Area tabs */}
      <div className="mb-3 flex flex-wrap gap-1">
        {areas.map((a) => (
          <button
            key={a.id}
            onClick={() => { setActiveArea(a.id); setSel(null); }}
            className={`rounded-lg px-3 py-1.5 text-sm ${a.id === activeArea ? "bg-blue-600 text-white" : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"}`}
          >
            {a.name} <span className="opacity-60">· {a.occupiedCount}/{a.tableCount}</span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
        {STATUSES.map((s) => (
          <span key={s} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[s]}`} />{s}</span>
        ))}
        {manage && <span className="text-slate-400">· drag tables to arrange · tap to select for merge</span>}
      </div>

      {area && (
        <FloorCanvas
          area={area}
          manage={manage}
          mergePick={mergePick}
          onOpen={(t) => setSel(t)}
          onMoved={load}
          onError={setError}
        />
      )}

      {/* Table action popover */}
      {sel && (
        <div onClick={() => setSel(null)} className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-2xl bg-white p-4 dark:bg-[#131c2e]">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-bold">Table {sel.label}</h3>
              <span className="text-xs text-slate-400">{sel.seats} seats</span>
            </div>
            <p className="mb-3 text-xs text-slate-400">
              {sel.mergedIntoTableId ? "Part of a merged group" : sel.activeOrderId ? "Has an open order" : "No open order"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(sel, s)}
                  className={`rounded-lg border px-2 py-2 text-sm font-semibold ${sel.status === s ? STATUS_STYLE[s] : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"}`}
                >
                  <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />{s}
                </button>
              ))}
            </div>
            {sel.mergedIntoTableId && (
              <button onClick={() => doSplit(sel)} className="mt-3 w-full rounded-lg bg-purple-600 py-2 text-sm font-semibold text-white hover:bg-purple-700">Split group</button>
            )}
            {manage && canManage && (
              <>
                <button
                  onClick={() => { const id = sel.id; setMergePick((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])); setSel(null); }}
                  className="mt-3 w-full rounded-lg bg-purple-600/90 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  {mergePick.includes(sel.id) ? "Deselect for merge" : "Select for merge"}
                </button>
                <button onClick={() => remove(sel)} className="mt-2 w-full rounded-lg border border-red-500/40 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10">Remove table</button>
              </>
            )}
          </div>
        </div>
      )}

      {showAdd && area && <AddTableDialog areaId={area.id} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

/** The positioned-tables canvas. Handles pointer dragging in manage mode (positions are 0–1 fractions). */
function FloorCanvas({
  area, manage, mergePick, onOpen, onMoved, onError,
}: {
  area: Area; manage: boolean; mergePick: string[];
  onOpen: (t: Table) => void; onMoved: () => void; onError: (m: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; moved: boolean } | null>(null);
  const [ghost, setGhost] = useState<{ id: string; x: number; y: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent, t: Table) => {
    if (!manage) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: t.id, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    drag.current.moved = true;
    setGhost({ id: drag.current.id, x, y });
  };
  const onPointerUp = async () => {
    const d = drag.current;
    const g = ghost;
    drag.current = null;
    setGhost(null);
    if (d && d.moved && g) {
      try {
        await api.post(`/api/floorplan/tables/${d.id}/move`, { x: g.x, y: g.y });
        onMoved();
      } catch { onError("Could not move the table."); }
    }
  };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#0d1526]"
      style={{ aspectRatio: "16 / 9", backgroundImage: "radial-gradient(circle, rgba(148,163,184,.18) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
    >
      {area.tables.length === 0 && (
        <div className="grid h-full place-items-center text-sm text-slate-400">No tables in {area.name} yet.</div>
      )}
      {area.tables.map((t) => {
        const pos = ghost && ghost.id === t.id ? ghost : t;
        const picked = mergePick.includes(t.id);
        const round = t.shape === "Round";
        const wide = t.shape === "Rectangle";
        return (
          <button
            key={t.id}
            onPointerDown={(e) => onPointerDown(e, t)}
            onClick={() => {
              if (drag.current?.moved) return; // ignore the click that ends a drag
              onOpen(t);
            }}
            title={`${t.label} · ${t.status}`}
            style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: "translate(-50%, -50%)" }}
            className={`absolute grid place-items-center border-2 text-center shadow-sm transition-transform active:scale-95
              ${STATUS_STYLE[t.status]}
              ${round ? "rounded-full" : "rounded-xl"}
              ${wide ? "h-14 w-24" : "h-16 w-16"}
              ${picked ? "ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-[#0d1526]" : ""}
              ${manage ? "cursor-move" : "cursor-pointer"}`}
          >
            <span className="text-sm font-bold leading-none">{t.label}</span>
            <span className="mt-0.5 text-[10px] opacity-70">{t.seats}👤</span>
            {t.mergedIntoTableId && <span className="absolute -right-1 -top-1 rounded-full bg-purple-600 px-1 text-[9px] text-white">↔</span>}
          </button>
        );
      })}
    </div>
  );
}

function AddTableDialog({ areaId, onClose, onDone }: { areaId: string; onClose: () => void; onDone: () => void }) {
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState("4");
  const [shape, setShape] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0f1727]";

  const submit = async () => {
    if (!label.trim()) return setError("Label is required.");
    setBusy(true);
    setError("");
    try {
      await api.post("/api/floorplan/tables", { areaId, label: label.trim(), seats: Number(seats) || 2, shape, x: 0.5, y: 0.5 });
      onDone();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Could not add the table.");
    } finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 dark:bg-[#131c2e]">
        <h3 className="mb-3 text-lg font-bold">Add table</h3>
        <div className="space-y-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. T9)" className={field} />
          <div className="flex gap-2">
            <input value={seats} onChange={(e) => setSeats(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="Seats" className={field} />
            <select value={shape} onChange={(e) => setShape(Number(e.target.value))} className={field}>
              <option value={0}>Square</option>
              <option value={1}>Round</option>
              <option value={2}>Rectangle</option>
            </select>
          </div>
        </div>
        {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
        <button disabled={busy} onClick={submit} className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
          {busy ? "Adding…" : "Add table"}
        </button>
      </div>
    </div>
  );
}
