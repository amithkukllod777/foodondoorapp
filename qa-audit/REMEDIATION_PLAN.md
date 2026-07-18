# REMEDIATION_PLAN.md

**Audit date:** 2026-07-14 · Complexity: S (<½ day) · M (1–2 days) · L (3–5 days) · XL (>1 sprint).
Owner type: **BE** backend · **FE** frontend · **DevOps** · **Owner** (business/manual) · **Legal**.

> All changes below are **proposed** — no production behaviour has been changed by this audit. Per the audit brief, implement only after approval, in sandbox first, never with real payment credentials.

## Immediate — before next release (P0)

| ID | Action | Owner | Complexity | Dependencies | Verification |
|---|---|---|---|---|---|
| NW-SEC-01 | Remove `DEFAULT_ADMIN_PASSWORD` constant; seed admin from env/random + forced reset. **Rotate the live `orders@foodondoor.com` password now.** Scrub from git history | BE + Owner | M | — | Old creds fail login; grep clean; git history purged |
| NW-SEC-01b | Confirm prior-exposed Razorpay/Brevo keys were rotated (AUDIT_STATUS.md) | Owner | S | — | New keys in Vercel; old keys revoked |
| NW-BUILD-01 | Add `pnpm check` + `pnpm test` to `ci.yml`; fix the 12 tsc errors | DevOps + FE/BE | M | Split live tests (below) | CI red on type error; green run |
| NW-PAY-01 | Both payment webhooks call `finalizePendingOrder` (idempotent) instead of `updateOrderStatus` | BE | S | — | Webhook-only confirm sends notifications, increments coupon, fires CAPI once |
| NW-FUNC-01 | Decide gift-wrap intent: add `isGiftWrapped` to placeOrder input+order schema+admin view, or remove UI | FE + BE | M | Product decision | Selection persists to order (or UI gone) |
| NW-SEC-03 | Move rate-limit counters to shared store (TiDB/Upstash); derive IP from trusted platform header | BE | M | — | Header-rotation + multi-instance test can't bypass |
| TEST-INFRA | Tag/exclude 6 live-integration suites from default `pnpm test`; mock external calls (stop live email/WhatsApp sends) | BE | M | — | `pnpm test` green with no secrets, no side effects |

## Short term — next sprint (P1)

| ID | Action | Owner | Complexity | Dependencies | Verification |
|---|---|---|---|---|---|
| NW-SEC-02 | Gate `reviews.uploadImage` → `customerProcedure` + rate limit + MIME/magic-byte whitelist | BE | S | — | Anonymous/non-image rejected |
| NW-DATA-02 | Reserve+redeem coupon inside order transaction; add per-customer usage limit | BE | M | NW-DATA-01 | Concurrency test grants ≤maxUses discounts; per-user cap holds |
| NW-DATA-01 | Wrap order+items+stock(+coupon) in one DB transaction | BE | M | — | Crash-injection leaves no partial state |
| NW-PAY-02 | Admin-initiated gateway refund (full/partial) + `refund.processed` webhook + refund status | BE + FE | L | Sandbox creds | Sandbox refund reflects on order |
| NW-SEC-07 | 6-digit OTP; keep per-code cap; ensure resend cap survives header spoof | BE | S | NW-SEC-03 | New OTPs are 6-digit; brute-force test blocked |
| NW-SEC-04 | Add CSP + HSTS headers | BE/DevOps | M | — | Headers present; site functions under policy |
| NW-SEC-05 | Fail closed in prod if `JWT_SECRET` unset; remove unsubscribe literal fallback | BE | S | — | Boot aborts without secret in prod |
| NW-SEC-06 | Require `WHATSAPP_VERIFY_TOKEN`; drop literal fallback | BE | S | — | No literal fallback |
| NW-DATA-03 | Missing stock row defaults to 0 (not 100) or blocks purchase | BE | S | — | Unconfigured product not purchasable |
| P0-TESTS | Add P0 automated tests (pricing/anti-tamper, idempotency, coupon concurrency, oversell, signature, IDOR, admin authz) | BE | L | Test DB | Suites pass and gate CI |

## Medium term

| ID | Action | Owner | Complexity | Dependencies |
|---|---|---|---|---|
| NW-AUTHZ-01 | Role-scoped admin middleware (owner-only for admin-user mgmt, payment settings, resets) | BE | M | — |
| NW-PAY-03 | COD abuse controls (value ceiling, pending-COD cap per phone) | BE | M | — |
| NW-DATA-04 | Coupon expiry in IST | BE | S | — |
| NW-CFG-02 | Remove Sentry hardcoded DSN fallback; env from VERCEL_ENV | BE | S | — |
| NW-CFG-01 | Delete `__manus__/debug-collector.js` | FE | S | — |
| PRIVACY | Self-service account deletion + data export (DPDP) | BE + FE + Legal | L | Legal review |
| E2E | Playwright happy-path + component tests | FE | L | — |
| FLUTTER-PARITY | Close app gaps (PhonePe, subscriptions, referral, GST invoice, order tracking, address edit/delete) | Mobile | XL | — |
| PERF | Run Lighthouse + bundle analysis + DB index review; act on findings | FE/BE | M | — |
| DR | Test DB restore from backup; document RTO/RPO + rollback | DevOps + Owner | M | — |

## Long term / technical debt

| ID | Action | Complexity |
|---|---|---|
| NW-DOC-01 | Fix "paise"/"22 tables" stale docs; align CLAUDE.md + schema comments to rupees/31 tables | S |
| MIGRATIONS | Move runtime `ALTER TABLE` self-heal into versioned migrations once `DATABASE_URL` CLI access is arranged | M |
| ARCH | Consider splitting admin bundle from storefront; evaluate queue for notifications/campaigns | L |
| OTP-GATE | Env-gate the app-store OTP test bypass (`9999900000`/`1234`) | S |
