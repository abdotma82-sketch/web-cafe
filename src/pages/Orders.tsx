import { money } from "../lib/api";
import { qk, useApiQuery } from "../lib/queries";

interface Order {
  orderNumber: number;
  total: number;
  status: string;
  at: string;
}

const STATUS_COLOR: Record<string, string> = {
  Completed: "text-green-500 bg-green-500/15",
  Open: "text-amber-500 bg-amber-500/15",
  InProgress: "text-blue-500 bg-blue-500/15",
  Voided: "text-red-500 bg-red-500/15",
  Refunded: "text-red-500 bg-red-500/15",
  Suspended: "text-slate-400 bg-slate-500/15",
};

/** Recent orders across all statuses — reads /api/orders/recent, refreshes every 8 s. */
export default function Orders() {
  const { data: orders = [], isError } = useApiQuery<Order[]>(qk.orders, "/api/orders/recent", {
    refetchInterval: 8000,
  });
  const error = isError ? "Could not load orders." : "";

  return (
    <div className="page page-wide">
      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">{orders.length} recent · live</span>
      </div>

      {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

      <div className="grid-cards grid-cards-lg">
        {orders.map((o) => (
          <div
            key={o.orderNumber}
            className="card flex items-center justify-between p-4"
          >
            <div>
              <div className="font-semibold">#{o.orderNumber}</div>
              <div className="text-xs text-slate-400">
                {new Date(o.at).toLocaleString("fr-MA", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold">{money(o.total)}</div>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  STATUS_COLOR[o.status] ?? "bg-slate-500/15 text-slate-400"
                }`}
              >
                {o.status}
              </span>
            </div>
          </div>
        ))}
        {orders.length === 0 && !error && (
          <div className="text-sm text-slate-400">No orders yet.</div>
        )}
      </div>
    </div>
  );
}
