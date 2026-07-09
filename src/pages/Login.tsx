import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/api";

/** Sign-in against the CafePos API — same credentials as the desktop till. */
export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
      location.reload(); // re-evaluate the route guard with the fresh session
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(
        status === 401
          ? "Wrong username or password."
          : "Cannot reach the till API — is the server running?",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full place-items-center bg-gradient-to-b from-[#0b1220] to-[#0a0f1a] p-4 text-slate-100">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#131c2e] p-6 shadow-2xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-2xl">
            ☕
          </span>
          <div>
            <h1 className="text-lg font-bold">American Coffee</h1>
            <p className="text-xs text-slate-400">Enterprise · sign in</p>
          </div>
        </div>

        <label className="mb-1 block text-xs text-slate-400">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className="mb-4 w-full rounded-xl border border-slate-700 bg-[#0f1727] px-3 py-3 outline-none focus:border-blue-500"
        />

        <label className="mb-1 block text-xs text-slate-400">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="mb-4 w-full rounded-xl border border-slate-700 bg-[#0f1727] px-3 py-3 outline-none focus:border-blue-500"
        />

        <button
          disabled={busy}
          className="w-full rounded-xl bg-blue-600 py-3 font-semibold transition hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <p className="mt-4 text-center text-xs text-slate-500">
          Owner: <b>admin</b> / <b>Admin#123</b>
        </p>
      </form>
    </div>
  );
}
