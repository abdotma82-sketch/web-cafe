import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { api, clearSession, getSession } from "../lib/api";

interface NavItem {
  icon: string;
  label: string;
  path?: string; // undefined = not built yet — shown disabled, never fake
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "General",
    items: [
      { icon: "📊", label: "Dashboard", path: "/" },
      { icon: "🛒", label: "POS", path: "/pos" },
      { icon: "🍽️", label: "Floor Plan", path: "/floor" },
      { icon: "📦", label: "Products", path: "/products" },
      { icon: "🧾", label: "Orders", path: "/orders" },
    ],
  },
  {
    section: "Management",
    items: [
      { icon: "🏭", label: "Inventory", path: "/inventory" },
      { icon: "🚚", label: "Purchasing", path: "/purchasing" },
      { icon: "👥", label: "Customers", path: "/customers" },
      { icon: "👨‍💼", label: "Employees", path: "/employees" },
      { icon: "💰", label: "Finance", path: "/finance" },
      { icon: "📈", label: "Reports", path: "/reports" },
    ],
  },
];

/**
 * Desktop-application shell that adapts to phones: a rail sidebar on desktop (Ctrl+B) becomes a
 * slide-in drawer on mobile. Command bar with quick search (Ctrl+K), theme switcher, user menu and
 * a live status bar frame every module.
 */
export default function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();
  const [collapsed, setCollapsed] = useState(false); // desktop icon-rail
  const [drawer, setDrawer] = useState(false); // mobile overlay open
  const [dark, setDark] = useState(true);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [clock, setClock] = useState(new Date());
  const searchRef = useRef<HTMLInputElement>(null);

  const isMobile = () => window.matchMedia("(max-width: 767px)").matches;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Auto-collapse the rail to icons on smaller desktop widths (768–1279px) and
  // restore the full labels once there's room again. Manual Ctrl+B still works
  // between resizes; a resize re-applies the width-appropriate state.
  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth;
      if (w >= 768) setCollapsed(w < 1280); // leave the mobile drawer (<768) alone
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        isMobile() ? setDrawer((d) => !d) : setCollapsed((c) => !c);
      }
      if (e.ctrlKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const ping = () =>
      api.get("/api/health").then(() => setOnline(true)).catch(() => setOnline(false));
    ping();
    const health = setInterval(ping, 10_000);
    const tick = setInterval(() => setClock(new Date()), 1_000);
    return () => {
      clearInterval(health);
      clearInterval(tick);
    };
  }, []);

  const toggleNav = () => (isMobile() ? setDrawer((d) => !d) : setCollapsed((c) => !c));

  const goto = (path?: string) => {
    if (!path) return;
    navigate(path);
    setDrawer(false); // close the mobile drawer after navigating
    setQuery("");
  };

  const signOut = () => {
    clearSession();
    navigate("/login");
  };

  const q = query.trim().toLowerCase();
  const matches = q ? NAV.flatMap((s) => s.items).filter((i) => i.label.toLowerCase().includes(q)) : [];

  return (
    <div className="flex h-full flex-col bg-slate-100 text-slate-900 dark:bg-[#0b1220] dark:text-slate-100">
      {/* ── Command bar ── */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2 dark:border-slate-800 dark:bg-[#0f1727] sm:gap-3 sm:px-3">
        <button onClick={toggleNav} title="Menu (Ctrl+B)" className="rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
          ☰
        </button>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-sm">☕</span>
          <span className="hidden text-sm font-bold sm:inline">American Coffee</span>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…  (Ctrl+K)"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#131c2e]"
          />
          {matches.length > 0 && (
            <div className="absolute top-full z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#131c2e]">
              {matches.map((m) => (
                <button
                  key={m.label}
                  disabled={!m.path}
                  onClick={() => goto(m.path)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                >
                  <span>{m.icon}</span>
                  {m.label}
                  {!m.path && <span className="ml-auto text-xs text-slate-400">soon</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => setDark((d) => !d)} title="Theme" className="rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
          {dark ? "🌞" : "🌙"}
        </button>

        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {session?.name?.[0] ?? "?"}
            </span>
            <span className="hidden text-sm md:inline">{session?.name}</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#131c2e]">
              <div className="border-b border-slate-200 px-3 py-2 text-xs text-slate-400 dark:border-slate-700">{session?.role}</div>
              <button onClick={signOut} className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Mobile backdrop */}
        {drawer && <div onClick={() => setDrawer(false)} className="fixed inset-0 z-20 bg-black/50 md:hidden" />}

        {/* ── Sidebar (rail on desktop, drawer on mobile) ── */}
        <aside
          className={`z-30 shrink-0 overflow-y-auto border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-[#0f1727]
            fixed inset-y-0 left-0 top-12 w-56 md:static md:top-0
            ${drawer ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
            ${collapsed ? "md:w-14" : "md:w-56 3xl:w-64"}`}
        >
          {NAV.map((group) => (
            <div key={group.section} className="py-2">
              {!collapsed && (
                <div className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group.section}</div>
              )}
              {group.items.map((item) => {
                const active = item.path && location.pathname === item.path;
                return (
                  <button
                    key={item.label}
                    disabled={!item.path}
                    onClick={() => goto(item.path)}
                    title={item.path ? item.label : `${item.label} — coming soon`}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm ${
                      active ? "bg-blue-50 font-semibold text-blue-600 dark:bg-slate-800 dark:text-blue-400" : ""
                    } ${item.path ? "hover:bg-blue-50 dark:hover:bg-slate-800" : "cursor-not-allowed opacity-40"}`}
                  >
                    <span>{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* ── Content ── */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* ── Status bar ── */}
      <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-slate-200 bg-white px-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-[#0f1727] dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${online === null ? "bg-slate-400" : online ? "bg-green-500" : "bg-red-500"}`} />
          {online === null ? "Connecting…" : online ? "Connected" : "Offline"}
        </span>
        <span className="hidden sm:inline">{session?.role}</span>
        <span className="ml-auto">{clock.toLocaleTimeString()}</span>
        <span>v0.2</span>
      </footer>
    </div>
  );
}
