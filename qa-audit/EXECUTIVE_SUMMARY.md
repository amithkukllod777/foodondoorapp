# EXECUTIVE_SUMMARY.md

**Application:** Nutriwow — D2C dry-fruits & healthy-snacks e-commerce (React SPA + tRPC/Express + Drizzle/TiDB, Vercel serverless; Flutter mobile app; Capacitor Android).
**Live:** https://www.nutriwow.in · **Audit date:** 2026-07-14
**Method:** Read-only static source review + full test-suite run + competitive web research. **No destructive changes, no deploys, no production data accessed, no real payment credentials used.** No staging URL / test accounts / sandbox credentials / analytics access were provided, so live runtime, load, accessibility and payment-sandbox testing are **NOT TESTED** and noted throughout.

## Overall application health: **B− / Fair-to-Good, with one Critical blocker**

The codebase is more mature than its own docs suggest. Payment-amount integrity, webhook signature verification, IDOR protection, admin auth hardening, Drizzle parameterization and XSS sanitization are genuinely well-built (many were fixed in prior PRs #2–#10 per `AUDIT_STATUS.md`). The problems are concentrated in: one committed credential, an incomplete payment-webhook path, a non-existent quality gate, ineffective rate limiting, and clear competitive feature gaps (gifting, guest checkout, spendable loyalty).

## Production-readiness status: **CONDITIONAL — one Critical must be fixed immediately**

The app is already live, but the current tree carries a **Critical** issue that warrants an immediate hotfix.

## Issues by severity

| Severity | Count | IDs |
|---|---|---|
| Blocker | 0 | — |
| Critical | 1 | NW-SEC-01 |
| Major | 6 | NW-PAY-01, NW-BUILD-01, NW-FUNC-01, NW-PAY-02, NW-DATA-01, NW-DATA-02 · plus security Major NW-SEC-02, NW-SEC-03 |
| Minor | ~10 | NW-SEC-04/05/06/07, NW-AUTHZ-01, NW-FUNC-02/03, NW-DATA-03/04, NW-PAY-03, NW-CFG-02, NW-DOC-01 |
| Cosmetic | 1 | NW-CFG-01 |

(Security Majors NW-SEC-02/03 are counted in the security audit; total Major-class ≈ 8.)

## Top critical risks

1. **NW-SEC-01 (Critical):** Default admin password `NutriAdmin@2026` is committed in `server/db.ts:2351` and auto-seeded into the live DB as a `role:"admin"` account (`orders@foodondoor.com` — a publicly-known email). Anyone with repo access or who guesses it gets full admin takeover (orders, customer PII, payment-gateway secrets). **Rotate now + remove + scrub history.**
2. **NW-PAY-01 (Major):** Payment webhooks confirm the order but call `updateOrderStatus` directly instead of `finalizePendingOrder`, so a webhook-only confirmation (browser closed after payment) sends **no customer notification, never increments coupon usage, and fires no purchase-conversion tracking**. Silent order/marketing/coupon divergence.
3. **NW-SEC-03 (Major):** Rate limiting is in-memory (per serverless instance) and keyed on the client-spoofable `X-Forwarded-For` → admin-login brute force and paid-WhatsApp-OTP bombing are not effectively throttled.
4. **NW-BUILD-01 (Major):** CI only builds — no typecheck, no tests. **12 `tsc` errors ship**, including a real functional bug (gift-wrap selection silently dropped, NW-FUNC-01) and dead order-tracking UI branches. Highest-risk flows (checkout, payment, coupons, stock) have **zero automated coverage**.
5. **NW-SEC-02 / NW-PAY-02 / NW-DATA-01/02:** Anonymous public file upload; no refunds anywhere; order+stock not transactional; coupon discount over-grantable under concurrency with no per-user cap.

## Security risks (summary)

1 Critical (committed admin password) + 2 Major (unauth upload, ineffective rate limiting) + Minors (no CSP/HSTS, ephemeral-secret fallback, weak WhatsApp verify token, 4-digit OTP, admin roles unenforced). **Sound:** payment integrity, signature verification, IDOR, admin auth, cookies, SQLi/XSS defenses. Details + OWASP mapping in SECURITY_AUDIT.md.

## Missing test coverage

Server-unit-only; **no E2E, no frontend, no API-contract tests.** Checkout, payment verify/idempotency, coupon concurrency, stock oversell, IDOR and admin authz have **no automated tests**. 6 of 11 server suites are live-integration (need prod secrets / send real messages) and fail in this environment (12/57 failing — all credential-related, not defects). See MISSING_TESTS.md.

## Top feature gaps vs competitors (Happilo / Farmley / Nutraj — all Shopify D2C)

1. **Gifting hub & hampers** — competitors all have dedicated gifting + corporate-gifting; Nutriwow has none (biggest revenue-relevant gap, esp. festive/corporate).
2. **Guest checkout** — Nutriwow forces OTP login; competitors allow guest checkout.
3. **Spendable loyalty** — Nutriwow shows points that can't be redeemed (worse than none).
4. **Refunds & self-service account deletion/data export** — platform-standard for competitors; missing here.

## Top UI/UX gaps

Forced login before checkout; no gifting entry point; loyalty dead-end; review counts under-surfaced vs Happilo's visible review volume. The design system itself is strong; the gaps are **workflow**, not visual.

## Competitive strengths to protect

India-native **WhatsApp OTP + order notifications + 2-way chat**, **built-in verified-purchase reviews**, **referral program**, **back-in-stock alerts**, **AI assistant**, **rich product detail fields**, and an **own native app** — a richer stack than a stock Shopify store once the gifting/guest-checkout/loyalty gaps close.

## Recommended release decision: **CONDITIONAL GO**

- **NO-GO** for shipping *new* features until **NW-SEC-01** is remediated (immediate hotfix + credential rotation).
- After NW-SEC-01, **CONDITIONAL GO**: land the Immediate/P0 remediation set (NW-PAY-01 webhook fix, NW-SEC-03 rate limiting, NW-BUILD-01 CI gate + typecheck fixes, NW-FUNC-01, test-infra split) within the current cycle. The app can remain live meanwhile, but treat NW-SEC-01 as a same-day fix.

## Exact next actions (priority order)

1. **Rotate** the live `orders@foodondoor.com` admin password; **remove** `DEFAULT_ADMIN_PASSWORD` from source; scrub git history (NW-SEC-01). Confirm prior-exposed Razorpay/Brevo keys were rotated.
2. Point both payment webhooks at `finalizePendingOrder` (NW-PAY-01).
3. Add `pnpm check` + `pnpm test` to CI; fix the 12 tsc errors; split live-integration tests out of the default run (NW-BUILD-01 + test-infra).
4. Decide + fix gift-wrap handling (NW-FUNC-01); enable-or-relabel loyalty (NW-FUNC-02).
5. Move rate limiting to a shared store + trusted IP (NW-SEC-03); gate `reviews.uploadImage` (NW-SEC-02).
6. Add P0 automated tests (anti-tamper, idempotency, coupon concurrency, oversell, signature, IDOR, admin authz).
7. Then start the competitive roadmap — **Gifting hub first** (COMPETITIVE_ROADMAP.md).

> All findings separate CONFIRMED defects from SUSPECTED risks; competitor rows are labelled VERIFIED/INFERRED. Nothing in this audit changed production behaviour.
