/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the deployed CafePos API, e.g. `https://cafepos-api.onrender.com`.
   * Leave empty for same-origin (local dev proxy, or Vercel rewrites). When set, the frontend
   * calls the backend directly (CORS mode) — the backend must allow this site's origin.
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
