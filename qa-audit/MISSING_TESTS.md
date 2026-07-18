# MISSING_TESTS.md

**Audit date:** 2026-07-14 · Prioritized by risk (P0 highest). "Type" = the automated test to add.

## P0 — Critical business/security paths (currently zero coverage)

| # | Area | Test to add | Type | Why |
|---|---|---|---|---|
| 1 | `computeOrderAmounts` / placeOrder | Server recomputes totals; rejects tampered line prices, weights, coupon; correct GST split (CGST/SGST vs IGST) | Unit (extend `pricing.shared.test`) | Money correctness; anti-tamper is the core guarantee |
| 2 | Payment idempotency | `finalizePendingOrder` / webhook confirm called twice → single coupon increment, single notification, no double stock | Integration | Directly covers NW-PAY-01 regression |
| 3 | Webhook = client-callback parity | Razorpay/PhonePe webhook path produces same side-effects as client callback | Integration | NW-PAY-01 |
| 4 | Coupon concurrency + per-user limit | N concurrent orders with a `maxUses:1` code → only one discount granted; per-user reuse blocked | Integration | NW-DATA-02 |
| 5 | Stock oversell | Concurrent checkout of last unit → exactly one succeeds; missing-stock-row does not default to 100 | Integration | NW-DATA-01/03 |
| 6 | Razorpay/PhonePe signature verify | Valid sig confirms; tampered sig/amount rejected | Unit | Payment security |
| 7 | IDOR | Customer A cannot read/confirm/track/invoice Customer B's order | Integration | Access control regression |
| 8 | Admin authorization | Non-admin/anonymous rejected on every `adminProcedure`; role least-privilege (once NW-AUTHZ-01 fixed) | Integration | Priv-esc |

## P1 — High-value flows

| # | Area | Test to add | Type |
|---|---|---|---|
| 9 | OTP brute force | >5 wrong attempts locked; resend cap holds under `X-Forwarded-For` rotation (after NW-SEC-03 fix) | Integration |
| 10 | Rate limiting | Limits hold across simulated instances / spoofed IP header | Integration |
| 11 | Review verified-purchase | Badge only when a delivered order contains the product; `reviews.uploadImage` rejects non-image + anonymous (after NW-SEC-02 fix) | Integration |
| 12 | Order status transitions | placed→shipped→delivered fires loyalty once; cancel restores stock exactly once | Integration |
| 13 | Coupon expiry boundary | Expiry evaluated at IST midnight (after NW-DATA-04 fix) | Unit |

## P2 — Parity / correctness

| # | Area | Test |
|---|---|---|
| 14 | Frontend components | Add Vitest + React Testing Library for CartDrawer steps, coupon apply, address form validation |
| 15 | E2E happy path | Playwright: browse → add to cart → OTP login (test bypass) → COD order → confirmation |
| 16 | Flutter | Widget/integration tests beyond pricing; parity checks for gaps in FEATURE_INVENTORY |
| 17 | API contract | tRPC input/output schema snapshot tests to catch dropped fields (would have caught NW-FUNC-01 `isGiftWrapped`) |

## Test-infrastructure fixes (prerequisite)

- **Separate live-integration tests from unit tests.** The 6 credential/live-call suites (`whatsapp`, `phonepe`, `email`, `blog`, `adminSession`, `auth.logout`) should be tagged (e.g. `*.live.test.ts`) and excluded from the default `pnpm test` / CI run, or refactored to **mock** external services. `email.test.ts` and `whatsapp.test.ts` currently **send real messages / hit live Meta API** — must be mocked.
- **Add a test DB** (in-memory or ephemeral MySQL/TiDB branch) so DB-dependent logic (coupons, stock, orders) can be unit-tested without prod `DATABASE_URL`.
- **Wire `pnpm check` + `pnpm test` into `ci.yml`** (NW-BUILD-01) so coverage actually gates merges.
