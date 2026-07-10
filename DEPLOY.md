# Deploying American Coffee (web)

The web app (`CafePos.Web`) is a **static React SPA**. It talks to the **ASP.NET Core API**
(`CafePos.Api`) over `/api`, `/img` and `/hubs` (SignalR/WebSockets).

**Vercel can host the frontend only.** The API is a long-running .NET server with a SQLite database
and WebSockets — it must run on a .NET-capable host, not on Vercel's serverless platform.

```
Browser ──▶ Vercel (static React)  ──rewrites /api,/img,/hubs──▶  .NET API host  ──▶ SQLite
```

## 1. Host the API (do this first)

Pick a host that runs .NET 10 + a database + WebSockets:

| Host | Notes |
|------|-------|
| **Render** / **Railway** | Easiest for a Docker/.NET web service; persistent disk for SQLite. |
| **Fly.io** | Good WebSocket support; volume for the SQLite file. |
| **Azure App Service** | First-class .NET; use Azure SQL or a mounted file for SQLite. |

The API listens on `0.0.0.0:5088` and today stores its SQLite DB under `%LocalAppData%\CafePos`.
For a server host, point it at a writable path / mounted volume (or migrate to the SQL Server
provider already referenced in `CafePos.Infrastructure`).

### Before exposing the API publicly (required)
- **Move the token secret out of code** into configuration/env (`TokenService` currently has a
  hardcoded dev constant).
- **Lock CORS** to your Vercel domain (it is currently allow-any + allow-credentials).
- Serve over **HTTPS**.

## 2. Deploy the frontend to Vercel

1. Push the repo to GitHub/GitLab and import it in Vercel (or run `vercel` from `src/CafePos.Web`).
2. Set the **Root Directory** to `src/CafePos.Web`.
3. Framework preset: **Vite** — build `npm run build`, output `dist` (already set in `vercel.json`).
4. In `vercel.json`, replace **`YOUR-API-HOST`** (3 places) with your deployed API URL, e.g.
   `https://cafepos-api.onrender.com`. These rewrites proxy `/api`, `/img` and `/hubs` to the API
   so the frontend keeps using relative URLs — no CORS needed and no code change.
5. Deploy.

> The final rewrite (`/(.*) → /index.html`) is the SPA fallback so client-side routes like
> `/floor` or `/pos` resolve on refresh. Static assets are served before rewrites, so they're
> unaffected.

## 3. Verify

Open the Vercel URL, sign in (`admin` / `Admin#123` on a seeded DB), and confirm the Dashboard
loads live data. If calls 404, check that `YOUR-API-HOST` is correct and the API is reachable
over HTTPS with WebSockets enabled (needed for the live Floor Plan / KDS features).
