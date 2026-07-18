# BUG_REPORT.md

**Audit date:** 2026-07-14 · **Environment:** static source review of `main`-merged tree (post PR #86). Runtime reproduction marked NOT TESTED where no staging/credentials were available.

Severity: **Blocker** (flow cannot operate) · **Critical** (security/data-loss/payment/priv-esc) · **Major** (feature broken/incorrect) · **Minor** (limited impact) · **Cosmetic**.
Confidence: **CONFIRMED** (evidenced in code) · **SUSPECTED** (needs runtime confirmation).

---

## NW-SEC-01 — Default admin password committed & seeded to live DB
- **Module:** Admin auth / DB seed · **Severity:** Critical · **Confidence:** CONFIRMED
- **STATUS (2026-07-14):** ✅ Code fixed in this branch (hardcoded password removed; env-gated seeding). ⚠️ Owner must still rotate the already-seeded live `orders@foodondoor.com` password + scrub git history.
- **Preconditions:** Admin → Users page has loaded at least once (runs `ensureSeedAdminUser`).
- **Steps:** POST `admin.login` with `orders@foodondoor.com` / `NutriAdmin@2026`.
- **Expected:** No account should exist with a source-committed password.
- **Actual:** A real `role:"admin"` account is created with this committed password (`server/db.ts:2351,2372-2377`).
- **Evidence:** `server/db.ts:2351`; username = public order email `routers.ts:473`.
- **Root cause:** Convenience seed constant left in source.
- **Fix:** Env-only/random seed + forced reset; rotate live password; scrub git history.
- **Regression risk:** Low (seed path only).

## NW-PAY-01 — Payment webhook confirms order but skips coupon redemption, all notifications & conversion tracking
- **Module:** Payments (Razorpay & PhonePe webhooks) · **Severity:** Major · **Confidence:** CONFIRMED
- **Preconditions:** Prepaid order; browser/callback fails after successful payment (the scenario webhooks exist for).
- **Steps:** Pay successfully → close tab before client callback → gateway fires webhook.
- **Expected:** Order confirmed AND customer notified AND coupon `usedCount` incremented AND purchase conversion tracked (as the client-callback path does via `finalizePendingOrder`).
- **Actual:** Webhook calls `updateOrderStatus(id,"placed",{amountPaid})` directly (`server/_core/index.ts:91` Razorpay, `:413-421` PhonePe). No confirmation SMS/WhatsApp/email, no `incrementCouponUsage`, no admin alert, no Meta CAPI `trackPurchase`.
- **Evidence:** `server/_core/index.ts:83-92` vs `finalizePendingOrder` `server/routers.ts:224-300`.
- **Root cause:** Two divergent confirmation paths; webhook path never updated to use `finalizePendingOrder`.
- **Fix:** Both webhooks call `finalizePendingOrder(existing)` (idempotent — guards on `status !== "pending_payment"`).
- **Regression risk:** Low-Med (idempotency already guards double-finalize; test coupon double-count).

## NW-BUILD-01 — CI never typechecks or runs tests; 12 `tsc` errors ship to production
- **Module:** Build/CI · **Severity:** Major · **Confidence:** CONFIRMED
- **STATUS (2026-07-14):** ✅ **Fixed in this branch** — all 12 tsc errors resolved (`pnpm check` clean); `ci.yml` now runs `pnpm check` + `pnpm test`; live-integration suites excluded from the default run via `RUN_LIVE_TESTS` (vitest config). `pnpm test` = 39 passed.
- **Steps:** `pnpm check` → 12 errors. `.github/workflows/ci.yml` runs only install + `vite build` + `build:vercel` (esbuild strips types without checking).
- **Expected:** CI blocks type errors and runs the 11 vitest suites.
- **Actual:** Errors never block deploy; tests never run in CI.
- **Evidence:** `.github/workflows/ci.yml:22-28`; `tsc --noEmit` output (see below).
- **Fix:** Add `pnpm check` + `pnpm test` steps; fix the 12 errors.
- **Regression risk:** Low (CI-only).
- **The 12 errors:**
  - `CartDrawer.tsx:530,631,682` — `isGiftWrapped` not in `placeOrder` input (see NW-FUNC-01)
  - `ProductDetail.tsx:417,559,1291` — review sort `"helpful"` type mismatch; stray `customerId` in review input
  - `TrackOrder.tsx:145,147` — status compared to `"out_for_delivery"`/`"returned"` (no overlap → dead branches, NW-FUNC-03)
  - `AdminEmailCampaigns.tsx:521,551` — audience `"subscribers"` type mismatch
  - `rateLimit.ts:44`, `db.ts:1407` — Map/Set iteration needs es2015 downlevel target

## NW-FUNC-01 — "Gift wrapped" selection is silently dropped at checkout
- **Module:** Checkout · **Severity:** Major · **Confidence:** CONFIRMED
- **STATUS (2026-07-14):** ✅ **Fully fixed.** (1) `placeOrder` accepts `isGiftWrapped` + `giftMessage` and records them on the order (folded into `notes`). (2) Owner chose to **charge ₹49** — `computeOrderAmounts` now adds `GIFT_WRAP_FEE` (single source of truth in `shared/pricing.ts`, imported by both client and server) into goods total before the free-shipping check, exactly matching the checkout UI. Because both Razorpay and PhonePe initiations charge from the stored `order.total`, the fee flows through to the gateway charge and the advance-30% amount automatically — no payment-path edits needed. Verified: server total math matches CartDrawer's displayed total.
- **Steps:** Select gift-wrap in CartDrawer → place order.
- **Expected:** Order records gift-wrap intent.
- **Actual:** `CartDrawer.tsx` sends `isGiftWrapped` but `placeOrder`'s Zod input has no such field → the value is dropped; the order has no gift-wrap flag. (TS error TS2353 at `CartDrawer.tsx:530,631,682`.)
- **Fix:** Add `isGiftWrapped` to the `placeOrder` input + order schema + admin display, OR remove the UI. Decide product intent first.
- **Regression risk:** Med (schema + admin order view).

## NW-PAY-02 — No refund capability anywhere
- **Module:** Payments/Orders · **Severity:** Major · **Confidence:** CONFIRMED
- **STATUS (2026-07-14):** ✅ **Implemented (admin-gated; test-mode-first).** Added: (1) `orders.paymentId/refundedAmount/refundStatus` columns (runtime-migrated in `ensureRuntimeColumns`); (2) capture of the Razorpay `payment_id` at verify + webhook finalize; (3) `adminOrders.refund` mutation (full/partial, validates `amount ≤ amountPaid − refundedAmount`, calls Razorpay `payments.refund`, records status); (4) `refund.processed` webhook reconciliation (best-effort, `max()` so it never double-counts); (5) a Refund button in the admin order drawer. **LIMITATIONS:** Razorpay only (COD/PhonePe refunded manually); only orders placed *after* this deploy carry a `payment_id`. **Not runtime-tested here (no gateway sandbox) — verify in Razorpay TEST mode before using on live orders.**
- **Evidence:** `grep -i refund` in `server/` → only the policy page. Cancelling an order (`adminOrders.updateStatus → "cancelled"`, `routers.ts:1259`) restores stock but issues **no money refund**; no Razorpay/PhonePe refund call; no `refund.processed` webhook handling.
- **Impact:** Prepaid cancellations require manual out-of-band refunds — operational risk, reconciliation gaps, customer-trust risk.
- **Fix:** Add admin-initiated gateway refund (full/partial) + `refund.processed` webhook + refund status on the order.
- **Regression risk:** Med (new money-movement path — needs sandbox testing).

## NW-DATA-02 — Coupon discount over-grantable under concurrency; no per-user limit
- **Module:** Coupons · **Severity:** Major · **Confidence:** SUSPECTED
- **Evidence:** `incrementCouponUsage` is atomic (`usedCount < maxUses`, `db.ts:825`) so the *counter* is capped, but `validateCoupon` (`db.ts:800`) → apply discount → increment is **best-effort** (`routers.ts:1144`). Under concurrency N orders can all pass validation and all receive the discount while only `maxUses` increments land. No per-user cap — one customer can reuse a code up to the global `maxUses`.
- **Impact:** Over-discounting on high-value/single-use codes; single-user abuse.
- **Fix:** Reserve/redeem the coupon inside the order transaction; add per-customer usage limit.
- **Regression risk:** Med.

## NW-DATA-01 — Order insert and stock decrement are not in one DB transaction
- **Module:** Orders/Inventory · **Severity:** Major · **Confidence:** SUSPECTED
- **Evidence:** `placeOrder` does `createOrder()` then separate `decrementStockForOrder()` (`routers.ts:1119-1126`); no `db.transaction(...)` wraps order+items+stock. Compensating rollback exists (`incrementStockForOrder`) but is not atomic; a crash between steps leaves inconsistent state.
- **Mitigation present:** Per-row oversell is prevented by atomic `WHERE stock >= quantity` UPDATE (`db.ts:879`); stale-pending sweeper restores orphans hourly (`jobs.ts:250`).
- **Fix:** Wrap order+items+stock (+coupon reserve) in a single transaction.
- **Regression risk:** Med.

## NW-DATA-03 — Missing stock row defaults to phantom 100 units
- **Module:** Inventory · **Severity:** Minor · **Confidence:** CONFIRMED
- **Evidence:** `decrementStockForOrder` auto-creates a stock row with default `stock:100` if absent (`db.ts:874-875`).
- **STATUS (2026-07-14):** ✅ **No change needed (resolved via evidence).** `createProduct` already seeds every product with `stock: 100` (`db.ts:850`) and the schema default is 100 — so the decrement-path phantom-100 simply mirrors the store's intended default, not a surprise value. The atomic `WHERE stock >= quantity` guard (`db.ts:879`) prevents stock going negative, so there is no oversell beyond the configured quantity. Changing the default to 0 would only make legacy rows unsellable with no safety benefit. Owner uses a 100-default inventory model by design; left unchanged intentionally.

## NW-PAY-03 — COD has no abuse controls
- **Module:** Payments (COD) · **Severity:** Minor · **Confidence:** SUSPECTED
- **Evidence:** COD orders placed immediately, `amountPaid:0`, no per-phone/address cap, no COD value ceiling. With OTP-only auth, enables fake-COD flooding.
- **Fix:** COD value ceiling + pending-COD-count limit per phone; optionally require prior successful delivery.

## NW-FUNC-02 — Loyalty balance shown but redemption disabled
- **Module:** Loyalty · **Severity:** Minor · **Confidence:** CONFIRMED
- **Evidence:** Points earned (₹1=1pt on delivery) and displayed, but `loyalty.redeem` throws `METHOD_NOT_SUPPORTED` (`routers.ts:~1611`); not wired into `computeOrderAmounts`.
- **Impact:** Users accumulate points they can never spend → trust/expectation gap.
- **Fix:** Either wire redemption into checkout or hide the balance/relabel as "coming soon".

## NW-FUNC-03 — TrackOrder has dead status branches
- **Module:** Order tracking UI · **Severity:** Minor · **Confidence:** CONFIRMED
- **Evidence:** `TrackOrder.tsx:145,147` compares order status to `"out_for_delivery"` / `"returned"`, which are not in the status union (TS2367) → those UI branches never render.
- **Fix:** Align UI status strings with the actual order-status enum.

## NW-DATA-04 — Coupon expiry evaluated in UTC, not IST
- **Module:** Coupons · **Severity:** Minor · **Confidence:** CONFIRMED
- **Evidence:** `new Date() > coupon.expiresAt` (`db.ts:807`) on UTC serverless → a coupon "expiring 14 July" dies at UTC midnight (05:30 IST), not IST midnight.
- **Fix:** Compare in IST or store expiry as end-of-day IST.

## NW-CFG-02 — Sentry hardcoded DSN fallback, always-on, environment defaults to "production"
- **Module:** Monitoring · **Severity:** Minor · **Confidence:** CONFIRMED
- **STATUS (2026-07-14):** ◑ **Environment fixed** — now tagged from `VERCEL_ENV`/`NODE_ENV` so preview/dev errors no longer pollute the prod Sentry project. Hardcoded DSN fallback intentionally left (Sentry DSNs are public and removing it risks silently disabling monitoring if the env var is unset).
- **Evidence:** `server/_core/index.ts:4-8` — `dsn: process.env.SENTRY_DSN || "<hardcoded>"`; env defaults to `"production"` → dev/preview errors pollute the prod project.
- **Fix:** No hardcoded DSN fallback; set `environment` from `NODE_ENV`/`VERCEL_ENV`.

## NW-CFG-01 — Dead Manus debug collector shipped in public dir
- **Module:** Build hygiene · **Severity:** Cosmetic · **Confidence:** CONFIRMED
- **STATUS (2026-07-14):** ✅ **Fixed** — `client/public/__manus__/debug-collector.js` deleted (was unreferenced/not loaded).
- **Evidence:** `client/public/__manus__/debug-collector.js` (request/console/XHR interceptor) still present but **not referenced** in `index.html` → not loaded/executed.
- **Fix:** Delete the file.

## NW-DOC-01 — Stale docs: "prices in paise" and "22 tables"
- **Module:** Docs/schema comments · **Severity:** Minor · **Confidence:** CONFIRMED
- **Evidence:** `drizzle/schema.ts:212` comments "in paise" and CLAUDE.md says paise, but runtime treats `price` as **rupees** (`ProductCard.tsx:212` renders `₹{price}` with no ÷100; Razorpay charged `Math.round(payNow*100)` `routers.ts:2028`). Loyalty comment `db.ts:2713` also says paise. CLAUDE.md says "22 tables"; actual is **31** (`drizzle/schema.ts`).
- **Impact:** No live bug (code internally consistent on rupees) but a serious trap — anyone "fixing" per the doc breaks all pricing/charges.
- **Fix:** Correct the comments/CLAUDE.md.

---

## Test-suite result (executed 2026-07-14)

`pnpm test` (vitest): **45 passed / 12 failed** across 11 files. **All 12 failures are missing-env-credential integration checks**, not code defects:
- `whatsapp.test.ts` (4) — `WHATSAPP_TOKEN`/`PHONE_NUMBER_ID`/`WABA_ID` unset
- `phonepe.test.ts` (1) — `PHONEPE_CLIENT_ID/SECRET` unset
- `email.test.ts` (2) — SMTP creds unset (attempts live send to `wecare@nutriwow.in`)
- `blog.test.ts` (3) — `DATABASE_URL` unset
- `adminSession.test.ts` (1) — `ADMIN_PASSWORD` unset
- `auth.logout.test.ts` (1) — depends on env

These are **live-integration smoke tests** that require production secrets → they will also fail in CI. See TEST_COVERAGE_MATRIX.md and MISSING_TESTS.md.
