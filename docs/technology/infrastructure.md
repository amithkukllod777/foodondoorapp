# Infrastructure

> Owner: CTO Agent ([`../agents/cto.md`](../agents/cto.md)). Source of truth: `CLAUDE.md`, `DEPLOY_VERCEL.md`, `vercel.json`.

## Current (LIVE) — 100% independent, no platform lock-in

| Layer | Provider | Config | Notes |
|-------|----------|--------|-------|
| Hosting / serverless | **Vercel** | Single serverless function, 60s max duration | `main` → prod auto-deploy; feature branches → preview (preview lacks `DATABASE_URL`) |
| Database | **TiDB Cloud Serverless** (MySQL-compatible) | `DATABASE_URL` (TLS), `mysql2` + Drizzle | 22 tables, serverless scaling, connection-per-request |
| Media / blob | **Vercel Blob** | `BLOB_READ_WRITE_TOKEN` | `server/storage.ts` `storagePut()`; public CDN-served |
| Images CDN | **Vercel Image Optimization** | `/_vercel/image` | WebP, 64-1600px, 24h cache; allowed hosts in `vercel.json` |
| Payments | **Razorpay** (primary) | `RAZORPAY_KEY_ID/SECRET` | + PhonePe (toggle), COD |
| Messaging | **Meta WhatsApp Cloud API** v25.0 | `WHATSAPP_TOKEN`, Phone ID `1110962362096644` | OTP `nutriwow_otp` + 12 campaign templates |
| Email | **Resend** (primary) / SMTP (fallback) | `RESEND_API_KEY` / `SMTP_*` | Transactional + campaign emails |
| Shipping | **Shiprocket** (primary) / **iThink** (fallback) | API credentials | Both default to Delhivery courier |
| Analytics | **GA4** `G-N1EESY3X9F` | Static in index.html | + Firebase Analytics (client) |
| Ads tracking | **Meta Pixel** `1753762272279602` | Browser pixel + server CAPI | `FB_CONVERSIONS_API_TOKEN` |
| Error tracking | **Sentry** | Client (lazy) + server | DSN in env + hardcoded fallback |
| AI | **Claude** (email generation) + **OpenAI** (image generation) | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | Used by admin tools only |
| CI/CD | **GitHub Actions** | `.github/workflows/ci.yml` | Type-check + build on PRs |

## Build Pipeline

```
pnpm build:vercel
├── vite build                → dist/public/ (React SPA + assets)
└── esbuild server/_core/index.ts → api/_app.mjs (server bundle)

api/index.ts (Vercel entry) → lazy-imports api/_app.mjs → buildApp() → Express
```

## Environment Variables (Complete)

### Build-Time (Client — inlined by Vite)
| Variable | Purpose |
|----------|---------|
| `VITE_APP_ID` | Frontend app identifier |
| `VITE_SENTRY_DSN` | Client-side Sentry (optional, has fallback) |

### Runtime (Server)
| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | MySQL/TiDB connection string | **Yes** |
| `JWT_SECRET` | Session token signing | **Yes** (sessions lost on redeploy without it) |
| `ADMIN_PASSWORD` | Admin login fallback | Yes |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob uploads | Yes (for media) |
| `CRON_SECRET` | Vercel cron auth | Yes |
| `RAZORPAY_KEY_ID` | Razorpay public key | Yes (payments) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret | Yes (payments) |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature verification | Yes (payments) |
| `PHONEPE_CLIENT_ID` | PhonePe client ID | Optional (toggleable) |
| `PHONEPE_CLIENT_SECRET` | PhonePe secret | Optional |
| `WHATSAPP_TOKEN` | Meta API access token | Yes (messaging) |
| `WHATSAPP_APP_SECRET` | Webhook signature verification | Yes (messaging) |
| `WHATSAPP_VERIFY_TOKEN` | Webhook challenge verify | Default: `nutriwow_wa_verify` |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta phone number ID | Default: `1110962362096644` |
| `WHATSAPP_WABA_ID` | Meta WABA ID | Default: `718666704638313` |
| `WHATSAPP_CATALOG_ID` | Product catalog ID | Default: `3914290288874560` |
| `RESEND_API_KEY` | Resend email API | Optional (fallback to SMTP) |
| `RESEND_FROM` | Resend sender address | Optional |
| `SMTP_HOST/PORT/USER/PASS` | SMTP email | Optional (fallback if no Resend) |
| `SHIPROCKET_EMAIL/PASSWORD` | Shiprocket API auth | Yes (shipping) |
| `ITHINK_ACCESS_TOKEN/SECRET_KEY` | iThink Logistics API | Optional (fallback) |
| `SHIPPING_WEBHOOK_TOKEN` | Shipping webhook auth | Yes |
| `FB_CONVERSIONS_API_TOKEN` | Facebook CAPI | Optional (ROAS tracking) |
| `ANTHROPIC_API_KEY` | Claude AI (email gen) | Optional |
| `OPENAI_API_KEY` | OpenAI (image gen) | Optional |
| `SENTRY_DSN` | Server-side error tracking | Optional (has fallback) |

## Webhook URLs (configure in provider dashboards)

| Provider | URL | Auth Method |
|----------|-----|-------------|
| Razorpay | `https://www.nutriwow.in/api/razorpay/webhook` | HMAC-SHA256 signature |
| PhonePe | `https://www.nutriwow.in/api/phonepe/webhook` | PhonePe signed payload |
| WhatsApp | `https://www.nutriwow.in/api/whatsapp/webhook` | Meta signature + verify token |
| Shiprocket/iThink | `https://www.nutriwow.in/api/shipping/webhook` | Bearer token |

## Cron Configuration

```json
// vercel.json
"crons": [{ "path": "/api/cron/jobs", "schedule": "0 */6 * * *" }]
```

Every 6 hours: email campaigns, WhatsApp campaigns, abandoned cart recovery, stale order cleanup.

## Performance & Caching

| Layer | Strategy |
|-------|----------|
| Static assets | Immutable cache headers (`max-age=31536000`) via `vercel.json` |
| Vendor JS chunks | Content-hashed filenames, cached independently |
| Store settings | In-memory cache with 5s TTL, invalidated on write |
| Shiprocket token | Cached 9 days per cold start |
| Pickup pincode | Cached 1 day |
| Images | Vercel Image Optimization, 24h CDN cache, WebP |
| Fonts | Non-blocking load (media=print→onload trick) |
| Sentry SDK | Lazy-loaded after initial render |

## Scaling Considerations

| Scenario | Current Limit | Mitigation |
|----------|--------------|------------|
| DB connections | TiDB serverless auto-scales | Add pooler if connection-limit errors appear |
| Function duration | 60s (Vercel plan-dependent) | Bulk operations already batched via cron |
| Campaign sends | 20 per cron run (every 6h) | Increase `batchSize` or cron frequency for large campaigns |
| Image uploads | Vercel Blob limits | Monitor usage; no issues at current scale |
| Cold starts | ~2s on serverless | Acceptable; Express app cached after first invocation |

## ⚠️ Owner-Mentioned Providers (AWS / Railway / PostgreSQL)

These are **NOT in use today**. Current DB is **MySQL (TiDB)**, not PostgreSQL; host is **Vercel**, not AWS/Railway. If migration is ever desired, it's a deliberate future decision (log in [`../decisions/board-decisions.md`](../decisions/board-decisions.md)) — do not assume them as current.

## Disaster Recovery

| Asset | Recovery |
|-------|----------|
| Code | GitHub repository (source of truth) |
| Database | TiDB Cloud automated backups (provider-managed) |
| Media | Vercel Blob (provider-managed, no self-service backup — consider periodic export) |
| Secrets | Vercel dashboard (not in repo). **Keep a secure backup of all env vars.** |
| DNS | Domain registrar settings (not in repo) |
