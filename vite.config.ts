import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev server proxies API + SignalR calls to the CafePos.Api backend (localhost:5088),
// so the SPA needs no CORS and works with relative URLs in dev and production alike.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5088",
      "/img": "http://localhost:5088",
      "/hubs": { target: "http://localhost:5088", ws: true },
    },
  },
});
