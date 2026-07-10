import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev server proxies API + SignalR calls to the CafePos.Api backend (localhost:5088),
// so the SPA needs no CORS and works with relative URLs in dev and production alike.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Force a single React instance in dev so libraries (TanStack Query, Router) share the app's
  // React and its hook dispatcher — otherwise Vite can serve a second copy and throw
  // "Invalid hook call". Rollup already dedupes in production; this makes dev match.
  resolve: { dedupe: ["react", "react-dom"] },
  optimizeDeps: { include: ["react", "react-dom", "@tanstack/react-query"] },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5088",
      "/img": "http://localhost:5088",
      "/hubs": { target: "http://localhost:5088", ws: true },
    },
  },
});
