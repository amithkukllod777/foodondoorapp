# Deploying Nutriwow to Vercel

This app is a **single full-stack Express server** (tRPC API + payment/WhatsApp
webhooks + dynamic SEO routes + the built React SPA). It is deployed to Vercel as
a **single serverless function** so everything stays on one origin — which keeps
cookie-based auth, the SEO routes (`/sitemap.xml`, `/robots.txt`, `/feed/*`), and
the API all working without cross-origin workarounds.

## How it's wired

- **`api/index.ts`** — Vercel serverless entry. Builds the Express app via
  `buildApp()` and exports it. No port binding.
- **`server/_core/index.ts`** — `buildApp()` registers all routes/middleware/tRPC
  and returns the Express app. It still runs as a normal Node server locally
  (`node dist/index.js` / `tsx`); the listener only starts when the file is the
  process entry point.
- **`server/_core/serveStatic.ts`** — serves the built SPA (`dist/public`) and the
  SPA fallback. Kept free of Vite imports so the serverless bundle stays lean.
- **`vercel.json`** — builds the client (`pnpm vite build` → `dist/public`),
  serves those assets from Vercel's CDN, includes `dist/public` in the function
  (for the SPA fallback), and rewrites every other request to the Express
  function.

## Vercel project settings

- **Framework Preset:** Other (config already sets `"framework": null`)
- **Install Command:** default (`pnpm install` — detected from `pnpm-lock.yaml`)
- **Build Command / Output:** taken from `vercel.json` — do not override in the UI.

## Required environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production,
and Preview if you use it).

### Build-time (client) — must be present for the Build step
These are inlined into the client bundle by Vite, so they must exist when the
build runs:

- `VITE_APP_ID`
- `VITE_FRONTEND_FORGE_API_URL`
- `VITE_FRONTEND_FORGE_API_KEY`
- `VITE_OAUTH_PORTAL_URL`

### Runtime (server)

- `DATABASE_URL` — MySQL/TiDB connection string (**required** for almost everything)
- `JWT_SECRET` — cookie/session signing secret
- `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`
- `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`
- Payments: `PHONEPE_CLIENT_ID`, `PHONEPE_CLIENT_SECRET`,
  `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- Shipping: `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`,
  `ITHINK_ACCESS_TOKEN`, `ITHINK_SECRET_KEY`
- Email (SMTP): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- WhatsApp: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID`,
  `WHATSAPP_VERIFY_TOKEN`
- Marketing/SMS: `FB_CONVERSIONS_API_TOKEN`, `FAST2SMS_API_KEY`

> Do **not** set `PORT` or `NODE_ENV` — Vercel manages those.

## Known caveat: serverless execution limit

Serverless functions have a max execution time (`maxDuration` is set to 60s in
`vercel.json`; the actual cap depends on your Vercel plan). Long-running
operations can time out:

- **Bulk WhatsApp campaign sends** (thousands of contacts in one request)
- Heavy `sharp` image processing

Normal browsing, checkout, payment webhooks, and feed generation are fine. If
bulk sends time out, move them to a background queue / batched job.

## Database

`getDb()` lazily creates a connection per cold start. For serverless, prefer a
DB that tolerates many short-lived connections (e.g. TiDB Cloud / PlanetScale /
a pooled MySQL endpoint). If you see connection-limit errors under load, put the
DB behind a pooler.

## Webhook URLs (update provider dashboards to the Vercel domain)

- Razorpay:  `https://<domain>/api/razorpay/webhook`
- PhonePe:   `https://<domain>/api/phonepe/webhook`
- WhatsApp:  `https://<domain>/api/whatsapp/webhook` (verify token = `WHATSAPP_VERIFY_TOKEN`)
