# Hostinger deployment – 503 fix checklist

If you see **503 Service Unavailable** on `darkgrey-sheep-352442.hostingersite.com`, the Node app is usually not starting. Check the following in your Hostinger **Node.js** app settings (or in the control panel where you configure the app).

## 1. Build step (required)

The app must build the frontend before starting. In Hostinger’s **Build command** (or equivalent), set:

```bash
npm install && npm run build
```

If the panel has separate “Install” and “Build” steps:

- **Install:** `npm install`
- **Build:** `npm run build`

Without `npm run build`, the `dist/` folder is missing and the server will not serve the app correctly.

## 2. Start command

Use exactly:

```bash
npm start
```

This runs `NODE_ENV=production tsx server.ts`. Do **not** use `npm run dev`.

## 3. Environment variables

Set these in the Hostinger app’s **Environment variables** (or .env in the repo root; never commit real secrets).

| Variable        | Required | Notes |
|----------------|----------|--------|
| **NODE_ENV**   | Yes      | Set to `production`. |
| **PORT**       | Optional | Hostinger often sets this automatically. If your app has a “Port” field, use that value here, or leave unset (app uses 3000). |
| **DATABASE_URL** | **Yes** | Postgres connection string (e.g. Supabase). If missing, the app tries SQLite and can crash (e.g. GLIBC issue) → 503. |
| **JWT_SECRET** | Yes      | Long random string (e.g. `openssl rand -base64 32`). |
| **GEMINI_API_KEY** | Yes  | For AI analysis. |
| **APP_URL**    | Yes      | Your site URL, e.g. `https://darkgrey-sheep-352442.hostingersite.com`. |
| **CORS_ORIGIN**| Yes      | Same as APP_URL, or comma-separated list of allowed origins. |

Do **not** set `USE_SQLITE_FOR_DEV` (or leave it unset). Use Postgres only on Hostinger.

## 4. Node version

Use **Node 18** or **20**. In Hostinger, pick that in the Node.js version selector for the app.

## 5. Check logs

In the Hostinger panel, open **Logs** or **Application logs** for this app. Look for:

- **“Error: DATABASE_URL is required”** → set `DATABASE_URL` (Postgres).
- **“better-sqlite3 … failed to load”** → you’re not using Postgres; set `DATABASE_URL` and do not use SQLite.
- **“Cannot find module 'tsx'”** → build/install step is wrong or `npm install` was run with `--production` and dev deps were skipped; the project now lists `tsx` as a normal dependency so a normal `npm install` should fix it.
- **“EADDRINUSE”** → wrong PORT or another process using the port; use the port Hostinger assigns.

After changing env vars or build/start commands, **redeploy** or **restart** the application.
