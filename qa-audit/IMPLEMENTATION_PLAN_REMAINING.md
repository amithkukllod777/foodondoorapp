# IMPLEMENTATION_PLAN_REMAINING.md

**Date:** 2026-07-14

> **UPDATE (2026-07-14):** Sections 1–4 (refunds, order+stock transaction, coupon
> per-user limit, gift-wrap fee) have since been **implemented** on this branch —
> see BUG_REPORT statuses for NW-PAY-02 / NW-DATA-01 / NW-DATA-02 / NW-FUNC-01.
> They still carry the **"verify on staging + Razorpay TEST mode before relying on
> them"** caveat below (no test DB / payment sandbox was available at build time).
> Sections 5–6 (shared rate-limit store, CSP rollout) remain **not implemented**.

Concrete implementation plans for the findings that touch the money path or
infrastructure and require a **test database and/or a payment sandbox** to verify
safely. Each item lists exact files, the change, and how to verify.

Prereqs the owner must provide to execute Section 1–3 safely:
- A **staging `DATABASE_URL`** (a TiDB branch/copy) so DB logic can be exercised without touching prod data.
- **Razorpay TEST keys** (test mode) + a PhonePe UAT credential for refund/idempotency testing. Never real keys/money.

---

## 1. NW-PAY-02 — Refunds (Major)

**Goal:** admin-initiated full/partial refunds with gateway calls + webhook reconciliation.

**Files:** `server/routers.ts` (new `adminOrders.refund` mutation + Razorpay/PhonePe refund calls), `server/_core/index.ts` (`/api/razorpay/webhook` handle `refund.processed`), `drizzle/schema.ts` (`orders.refundedAmount int default 0`, `orders.refundStatus` enum), `client/src/pages/admin/AdminOrders.tsx` (refund button + amount).

**Steps:**
1. Schema: add `refundedAmount` + `refundStatus` (`none|partial|full|failed`) via the project's runtime `ALTER TABLE IF NOT EXISTS` pattern (see `ensureReviewImagesColumn`).
2. `adminOrders.refund({ orderId, amount })` (adminProcedure): validate `amount <= order.amountPaid - order.refundedAmount`; call `razorpay.payments.refund(paymentId, { amount: amount*100 })` or PhonePe refund SDK; persist `refundedAmount`/`refundStatus`; notify customer (WhatsApp/email).
3. Webhook: on `refund.processed`, reconcile `refundStatus` idempotently (guard on already-processed).
4. Only allow refunds for prepaid orders (`amountPaid > 0`).

**Verify (staging + test keys):** create a test-mode paid order → partial refund → assert gateway refund created, `refundedAmount` updated, second identical webhook is a no-op; over-refund rejected.

---

## 2. NW-DATA-01 — Order + stock in one transaction (Major, suspected)

**Goal:** make order insert + item insert + stock decrement (+ coupon redeem) atomic.

**Files:** `server/db.ts` (`createOrder`, `decrementStockForOrder`, `incrementCouponUsage` accept an optional `tx`), `server/routers.ts` (`placeOrder` wraps them in `db.transaction`).

**Steps:**
1. Refactor the three db functions to accept an optional Drizzle transaction handle (default to the top-level `db`).
2. In `placeOrder`, replace the sequential awaits + compensating rollback with:
   ```ts
   await db.transaction(async (tx) => {
     const order = await createOrder({...}, tx);
     await decrementStockForOrder(items, tx); // throws → tx rollback
     return order;
   });
   ```
3. Delete the now-redundant best-effort `incrementStockForOrder` compensation.

**Risk:** touches the critical checkout path; **must** be tested on staging with a COD order (no gateway needed) + a concurrent last-unit test. Do not merge without that run.

**Verify (staging):** COD checkout succeeds; inject a failure after `createOrder` → assert no order row and no stock change (full rollback); two concurrent orders for the last unit → exactly one succeeds.

---

## 3. NW-DATA-02 — Coupon over-grant under concurrency + no per-user limit (Major, suspected)

**Goal:** cap discount grants to `maxUses` under concurrency and add a per-customer usage limit.

**Files:** `server/db.ts` (`validateCoupon` / new `redeemCouponForCustomer`), `server/pricing.ts` (coupon apply), `drizzle/schema.ts` (optional `coupons.perUserLimit int`), `server/routers.ts` (`placeOrder`).

**Steps:**
1. Add `perUserLimit` to coupons (admin-editable; default 0 = unlimited-per-user, still bounded by global `maxUses`).
2. Redeem coupon **inside the order transaction** (Section 2), using the existing atomic `usedCount < maxUses` conditional UPDATE — if it fails (limit hit), drop the discount and recompute the total before charging.
3. Per-user check: count this customer's prior orders using this coupon; block if `>= perUserLimit`.

**Verify (staging):** N concurrent orders on a `maxUses:1` code → exactly one discounted, others charged full; same customer reusing a `perUserLimit:1` code → second attempt charged full.

---

## 4. NW-FUNC-01 — Gift-wrap fee collection (owner decision)

Currently the ₹49 fee is **not** charged (the flag/message are stored — done). To actually charge it:

**Files:** `shared/pricing.ts` (`export const GIFT_WRAP_FEE = 49`), `server/pricing.ts` (`computeOrderAmounts` adds fee when `giftWrap`), `server/routers.ts` (thread `giftWrap` into `placeOrder` **and** `payment.initiateRazorpay` + `payment.initiate` so the charged amount matches), `client/src/components/CartDrawer.tsx` (import shared fee constant; send `giftWrap` in payment-init calls).

**Why it needs care:** all three `computeOrderAmounts` callers must include the fee, or the gateway charge won't match `order.total`. **Decision needed:** charge ₹49 or keep gift-wrap free? If free, remove the fee line from CartDrawer so displayed total == charged total.

**Verify (staging + test keys):** gift-wrap order → server total and Razorpay charge both include ₹49; non-gift order unchanged.

---

## 5. NW-SEC-03 (remaining) — Shared rate-limit store (infra)

The IP-key spoof is fixed. The in-memory-per-instance limitation needs a shared counter.

**Options:** (a) a `rateLimits` table in TiDB (atomic `INSERT ... ON DUPLICATE KEY UPDATE count = count+1` with a windowed key); (b) Upstash Redis (`@upstash/ratelimit`). (a) needs no new vendor.

**Files:** `server/_core/rateLimit.ts` (make `checkRateLimit` async, back it with the store), all call sites `await`.

**Verify:** limits hold across two simulated instances / cold starts.

---

## 6. NW-SEC-04 (remaining) — Content-Security-Policy (needs rollout)

HSTS is done. A CSP must enumerate every origin the app uses:
`self`, GA/`googletagmanager.com`/`google-analytics.com`, `connect.facebook.net`/`facebook.com`, Razorpay (`checkout.razorpay.com`, `api.razorpay.com`), PhonePe, `fonts.googleapis.com`/`fonts.gstatic.com`, `*.public.blob.vercel-storage.com`, `/_vercel/image`, Sentry ingest, Firebase. Inline GA/Pixel/hero scripts in `index.html` force `script-src 'unsafe-inline'` (or nonces).

**Rollout:** ship as `Content-Security-Policy-Report-Only` first with a report endpoint, observe violations for ~1 week, fix gaps, then flip to enforcing. Do **not** enforce blind — it will break third-party scripts.

---

## Suggested order

1. Provision staging DB + test payment keys.
2. Section 2 (transaction) → 3 (coupon, builds on the tx) → 1 (refunds) → 4 (gift fee, owner decision).
3. Section 5 (shared rate-limit) and 6 (CSP) independently, any time.
