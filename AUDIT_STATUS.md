# Nutriwow — Security & Performance Audit Status

**Last updated:** 2026-06-13
**Scope:** Security hardening + performance pass on the live store (nutriwow.vercel.app — Vercel serverless + TiDB).
**How this was delivered:** each fix is an independent, reviewable PR against `main`, typechecked (`tsc`) and built (`npm run build`) before opening. Most have unit tests.

> This is a living handoff doc so the work can be picked up from a browser / a fresh session. The source of truth for code is the PRs linked below.

---

## ✅ Fixes delivered (PRs)

| PR | Area | What it fixes | Severity |
|----|------|---------------|----------|
| [#2](https://github.com/amithkukllod777/nutriwow/pull/2) | Admin auth + API authz | Admin password was hardcoded in the client bundle + a `sessionStorage` flag; all 117 tRPC procedures were `publicProcedure`. Added server-validated admin login (signed httpOnly session), locked 68 admin procedures to `adminProcedure`, and **closed a live secret leak** — `settings.getAll` was serving the Razorpay live key secret + webhook secret on the public storefront. | Critical |
| [#3](https://github.com/amithkukllod777/nutriwow/pull/3) | Checkout integrity | `placeOrder` trusted client-supplied prices/total — could buy any order for ₹1. Now recomputes every amount server-side (DB prices + shared variant multipliers + server coupon validation); Razorpay/PhonePe initiation amounts derived server-side. | Critical |
| [#4](https://github.com/amithkukllod777/nutriwow/pull/4) | Coupons | `incrementCouponUsage` was never called → `maxUses` unenforced (infinite reuse) + raw SQL. Now an atomic, parameterized conditional redemption wired into placement/confirmation. | High |
| [#5](https://github.com/amithkukllod777/nutriwow/pull/5) | WhatsApp webhook | `POST /api/whatsapp/webhook` had no auth — anyone could forge inbound messages / chatbot triggers / log poisoning. Added Meta `X-Hub-Signature-256` HMAC verification. | High |
| [#7](https://github.com/amithkukllod777/nutriwow/pull/7) | Blog XSS | Blog HTML rendered to public visitors unsanitized (stored XSS). Added DOMPurify sanitization at the render boundary. | High |
| [#8](https://github.com/amithkukllod777/nutriwow/pull/8) | OTP | OTPs in an in-memory `Map` (broken across serverless instances) + no rate limiting + brute-forceable. Moved to a DB table (hashed codes), added send rate-limits + verify attempt-cap, crypto-random codes. | High |
| [#9](https://github.com/amithkukllod777/nutriwow/pull/9) | DB performance | No secondary indexes — common queries did full scans. Added 12 indexes backing the actual hot queries (orders, productImages, products, reviews, addresses, blog, abandoned carts, page views, WhatsApp messages). | Perf |
| [#10](https://github.com/amithkukllod777/nutriwow/pull/10) | Dashboard performance | `getDashboardStats` loaded the entire orders table (with JSON items) into memory per view. Moved totals to SQL aggregates; bounded the revenue chart + top products to a recent window. | Perf |

**Merged into `main`:** #2, #3, #4, #5, #7, #8.
**Open (review/merge):** #9, #10. *(#10's windowed query relies on #9's `orders.createdAt` index — merge #9 first.)*

---

## ✅ Implemented locally (pending commit/deploy)

| Area | What changed | Remaining owner action |
|------|--------------|------------------------|
| Campaign / abandoned-cart cron offload | Added `server/jobs.ts`, moved email + WhatsApp campaign batch processing out of long request loops, added abandoned-cart recovery batch processing, and wired `/api/cron/jobs` through Vercel Cron every 5 minutes. | Set `CRON_SECRET` in Vercel. |
| Stale payment reservation cleanup | Cron now cancels stale `pending_payment` orders after 1 hour and restores reserved stock. | Confirm the 1-hour reservation window is acceptable operationally. |
| Error tracking | Added backend Sentry setup, frontend Sentry setup, React Query error capture, and render-crash capture through `ErrorBoundary`. | Set `SENTRY_DSN` and `VITE_SENTRY_DSN`. |
| Firebase Analytics | Added Firebase web SDK initialization for project `nutriwow` and removed the broken Umami placeholder script from `client/index.html`. | Run Firebase CLI login/project/deploy flow if Firebase Hosting is desired. |
| Product image N+1 | Batched product image attachment through `attachImages(...)` so product lists no longer fetch images one product at a time. | None known. |
| Stock decrement / oversell protection | Orders now reserve stock at creation, atomically require sufficient stock, and release stock on cancellation/stale unpaid checkout. Payment confirmation no longer double-decrements. | Decide whether weight variants should consume 1/2/4 stock units instead of cart quantity only. |
| Customer-flow IDOR review | Customer profile/order/address/payment procedures now use `customerProcedure` and server session identity; Razorpay/PhonePe initiation/status require ownership of the stored pending order. | Consider whether public order tracking by order id + phone should remain public for guest support. |

Verification after these local changes:

- `pnpm check` passed.
- `pnpm build` passed.
- `firebase --version` returns `15.20.0`.

---

## 🔴 Operational to-dos (must be done by the repo owner — cannot be done from code)

1. **Set environment variables in Vercel:**
   - `ADMIN_PASSWORD` — required by #2 (until set, admin login falls back to the old server-side-only password).
   - `WHATSAPP_APP_SECRET` — required by #5 to activate webhook signature verification (Meta App dashboard → Settings → Basic → App secret).
   - `CRON_SECRET` — required for `/api/cron/jobs`.
   - `SENTRY_DSN` — backend error reporting.
   - `VITE_SENTRY_DSN` — frontend error reporting.
2. **Rotate exposed secrets** (they were publicly readable before #2 — treat as compromised):
   - Razorpay **live key secret** + **webhook secret** (rotate in the Razorpay dashboard).
   - **Brevo** API key.
3. **Run DB migrations** (idempotent scripts, need `DATABASE_URL`):
   - `node scripts/run-migration-otp.mjs` (#8 — creates `otpCodes`).
   - `node scripts/run-migration-indexes.mjs` (#9 — creates the indexes; online/safe on live TiDB).
4. **Run full integration tests with real/staging env:**
   - `DATABASE_URL`
   - PhonePe credentials
   - WhatsApp credentials
   - SMTP/Resend credentials
5. **Commit and deploy the current local changes.**

---

## 🟡 Remaining audit items

| Item | Why | Notes |
|------|-----|-------|
| Weight-variant stock policy | Current implementation decrements by cart line quantity. If 500g/1kg variants should consume more base stock, the rule must be encoded server-side. | Product/business decision needed. |
| Full env-backed test pass | Unit/type/build checks pass locally, but gateway/email/WhatsApp tests need configured secrets and DB. | Run after staging env is ready. |
| Large frontend bundle | Vite still warns that the main chunk is over 500 kB. | Code-split admin routes/charts/Firebase if first-load performance becomes a target. |
| Deploy hygiene | Local changes are not committed yet. | Commit, push, and deploy after review. |

---

## Architecture notes (for whoever picks this up)

- **Auth model:** Manus OAuth → `ctx.user` (with `role`). Owner auto-promoted to `admin` when `openId === OWNER_OPEN_ID`. After #2, `adminProcedure` grants on **either** the OAuth admin role **or** a valid signed admin-session cookie.
- **Money unit:** product prices are stored in **rupees** (the `products.price` schema comment saying "paise" is inaccurate). The `* 100` conversions at payment initiation correctly produce paise for the gateways.
- **Variant pricing:** weight variants (base / ×2 / ×4 → multipliers 1 / 1.85 / 3.5) now live in `shared/pricing.ts`, shared by client and server (single source of truth).
- **Migrations:** numbered SQL files in `drizzle/`, applied via `scripts/run-migration-*.mjs` (no auto-migrate on boot).
