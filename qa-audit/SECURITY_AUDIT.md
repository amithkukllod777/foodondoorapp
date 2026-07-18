# SECURITY_AUDIT.md

**Audit date:** 2026-07-14 · **Method:** static source review (read-only). No exploitation, no DoS, no access to production data. Findings mapped to OWASP Top 10 (2021).

**Overall posture: GOOD with one Critical.** Payment integrity, IDOR protection, webhook signature verification, Drizzle parameterization and DOMPurify sanitization are well-built. The dominant risk is a committed default admin password seeded into the live DB.

Legend: **CONFIRMED** = evidenced in code · **SUSPECTED** = needs runtime/product confirmation. No secrets are reproduced below.

---

## CONFIRMED FINDINGS

### NW-SEC-01 — Hardcoded default admin password seeded into the live database — **Critical**
- **STATUS (2026-07-14):** ✅ **RESOLVED** — (1) code hardened: hardcoded `DEFAULT_ADMIN_PASSWORD` removed, accounts now seed only from `ADMIN_PASSWORD`/`DEFAULT_ADMIN_PASSWORD` env; (2) **owner rotated the live `orders@foodondoor.com` password** (confirmed 2026-07-14). Remaining nice-to-have: scrub the old value from git history.
- **Component:** `server/db.ts:2351` (constant), `:2370-2384` (seed), reachable via `getAllAdminUsers()` `:2390`
- **OWASP:** A07 Identification & Authentication Failures / A05 Security Misconfiguration
- **Evidence:** `const DEFAULT_ADMIN_PASSWORD = "NutriAdmin@2026";` — `ensureSeedAdminUser()` inserts a real `role:"admin"` account `orders@foodondoor.com` with this committed password whenever the Admin → Users page loads. The email is also the public order-notification address (`server/routers.ts:473`), so the username is publicly known. The owner seed also falls back to `"changeme"` if `ADMIN_PASSWORD` is unset (`db.ts:2364`).
- **Attack scenario:** Attacker submits `admin.login` with `orders@foodondoor.com` / `NutriAdmin@2026` → full admin takeover: orders, customer PII, payment-gateway secrets in `storeSettings.payments`, pricing, coupons.
- **Remediation:** Remove the constant; seed only from an env var or a randomly-generated password forced to reset on first login. Rotate the live account password now. Scrub the value from git history.
- **Verification:** Attempt login with the old credentials → must fail. Grep source → constant gone.

### NW-SEC-02 — Unauthenticated file upload to public blob storage — **Major**
- **STATUS (2026-07-14):** ✅ **Fixed in this branch** — `reviews.uploadImage` is now `customerProcedure` (auth required), rate-limited per customer (20/hr), MIME whitelisted to jpeg/png/webp/gif, and the client filename is reduced to a safe extension. Client clamps `file.type` to the allowed set.
- **Component:** `server/routers.ts:1537-1552` (`reviews.uploadImage` = `publicProcedure`)
- **OWASP:** A01 Broken Access Control / A05
- **Evidence:** No auth; `mimeType` and `filename` are client-controlled; object written to public Vercel Blob. No rate limit on this procedure. `reviews.add` correctly derives identity from session, but the image endpoint does not.
- **Attack scenario:** (a) anonymous storage/cost abuse (unlimited 5 MB blobs); (b) content smuggling — upload with `mimeType:"text/html"`/`image/svg+xml` to host phishing/XSS from a brand-associated blob host.
- **Remediation:** Change to `customerProcedure`, add `checkRateLimit`, whitelist image MIME types (reject others), and validate magic bytes.
- **Verification:** Anonymous call returns UNAUTHORIZED; non-image MIME rejected.

### NW-SEC-03 — Rate limiting is in-memory per-instance and keyed on a spoofable header — **Major**
- **STATUS (2026-07-14):** ◑ **Partially fixed** — `getRateLimitKey` now prefers the platform-set `x-real-ip` / `x-vercel-forwarded-for` over the client-appendable leftmost `x-forwarded-for`, closing the per-request header-rotation bypass. **Still open:** counters remain in-memory per serverless instance (not shared) — a full fix needs a shared store (TiDB/Upstash). Tracked in REMEDIATION_PLAN.
- **Component:** `server/_core/rateLimit.ts:8` (in-memory `Map`), `:50-54` (`getRateLimitKey` trusts leftmost `x-forwarded-for`)
- **OWASP:** A07 (brute force) / A04 Insecure Design
- **Evidence:** Serverless deploy (`DEPLOY_VERCEL.md`) → each cold/concurrent instance has its own buckets; limits (`admin-login` 5/15min `routers.ts:676`, `otp-send-ip` `:832`, reset flows) reset per instance and aren't shared. `getRateLimitKey` returns the first client-appendable `x-forwarded-for` value → attacker rotates the header for a fresh bucket per request.
- **Attack scenario:** Brute-force `admin.login`; bomb the paid WhatsApp OTP quota by rotating `X-Forwarded-For` and/or spreading across instances.
- **Remediation:** Move counters to a shared store (TiDB or Upstash). Derive client IP from the trusted platform header (`x-vercel-forwarded-for` / `x-real-ip`), not the leftmost `x-forwarded-for`.
- **Verification:** Header-rotation load test no longer bypasses the limit; limits hold across instances.

### NW-SEC-04 — No Content-Security-Policy and no HSTS — **Minor**
- **STATUS (2026-07-14):** ◑ **HSTS added** (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`). **CSP still open** — a correct policy must enumerate all third-party origins (GA, Pixel, Razorpay, PhonePe, fonts, Vercel Blob, Sentry, Firebase) and needs report-only rollout + testing before enforcing; deferred to avoid breaking the live site blind.
- **Component:** `server/_core/index.ts:355-361` (headers set), `vercel.json:32-39`
- **OWASP:** A05
- **Evidence:** `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` are present (good), but no `Content-Security-Policy` and no `Strict-Transport-Security`.
- **Remediation:** Add a CSP (`default-src 'self'` + known analytics/gateway origins) and `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
- **Verification:** Response headers include CSP + HSTS; site functions under the policy.

### NW-SEC-05 — Ephemeral signing-secret fallback when `JWT_SECRET` unset — **Minor** (Major if actually unset in prod)
- **STATUS (2026-07-14):** ✅ **Session signing now fails closed in production** — `signingSecret()` throws in prod when the cookie secret is unset instead of fabricating a per-instance ephemeral secret (scoped to auth only, so the storefront still serves). ⚠️ **PRE-DEPLOY CHECK:** this assumes `JWT_SECRET` (or `COOKIE_SECRET`) IS set in Vercel prod — the live site's working sessions indicate it is, but confirm before merge, or login will break on deploy. The unsubscribe literal fallback (`index.ts:908`) is left as-is (low impact).
- **Component:** `server/_core/adminSession.ts:19-28`, `server/_core/customerSession.ts:11-20`, unsubscribe fallback `server/_core/index.ts:908-909` (`"nutriwow-unsub-fallback"`)
- **OWASP:** A02 Cryptographic Failures
- **Evidence:** If `JWT_SECRET` unset, a per-instance random secret is invented (logged, not enforced) — tokens validate inconsistently across instances; unsubscribe route uses a hardcoded literal fallback. Fail-safe (not fail-open) but fragile.
- **Remediation:** Fail closed at boot in production when `JWT_SECRET` is missing.

### NW-SEC-06 — Weak default WhatsApp webhook verify token — **Minor**
- **Component:** `server/_core/index.ts:113` — `process.env.WHATSAPP_VERIFY_TOKEN || "nutriwow_wa_verify"`
- **OWASP:** A05
- **Evidence:** Guessable literal fallback for the Meta subscription handshake. Impact limited — the POST path enforces `X-Hub-Signature-256` and fails closed in prod (`:143-147`).
- **Remediation:** Require the env var; remove the literal fallback.

### NW-SEC-07 — 4-digit OTP is low-entropy — **Minor**
- **Component:** `server/routers.ts:303-306` (`crypto.randomInt(1000,10000)`), verify cap `:900-903`
- **OWASP:** A07
- **Evidence:** Crypto-strong but only 10,000-space; SHA-256 hashed at rest (good), 5 verify attempts/code, 5 resends/15min. Combined with NW-SEC-03 (bypassable per-IP limits), brute force is more plausible than it appears.
- **Remediation:** 6-digit OTP; keep strict per-code cap; ensure resend cap survives header spoofing (fix NW-SEC-03).
- **Positive:** OTP is never returned in an API response and never logged in plaintext (only hashed value stored, `routers.ts:407`).

### NW-AUTHZ-01 — Admin roles stored but not enforced per-endpoint — **Minor**
- **Component:** `server/_core/trpc.ts:40-58` — single `adminProcedure`; roles `owner/admin/manager` exist in `adminUsers` but every admin route uses the same gate.
- **OWASP:** A01
- **Evidence:** A `manager` can call the same mutations as an `owner` (e.g. create admin users, change payment settings). No least-privilege separation.
- **Remediation:** Add role-scoped middleware (e.g. `ownerProcedure`) for sensitive ops (admin-user management, payment settings, password reset).

---

## SUSPECTED FINDINGS

### NW-SEC-08 — `placeOrder` trusts a client-supplied order `id` — **Minor/Suspected**
- **Component:** `server/routers.ts:1051` (`id: z.string()`)
- **Evidence:** Money is safely recomputed server-side and later calls enforce `order.customerId === ctx.customer.customerId`, so **not an IDOR**. Residual risk: ID enumeration / duplicate-PK insert error.
- **Remediation:** Generate the order ID server-side.

### NW-SEC-09 — `orders.recentPurchases` is public — verify PII projection — **Minor/Suspected**
- **Component:** `server/routers.ts:1352` (`publicProcedure`, social-proof feed)
- **Remediation:** Confirm the projection returns only first name + city — never full name / phone / email / address.

---

## REVIEWED AND SOUND (evidence of good posture)

- **Payment amount integrity** — always server-recomputed (`server/pricing.ts:108-113`, `routers.ts:2024-2028, 2100-2104`); client `amount` ignored.
- **Signature verification** — Razorpay webhook + client callback timing-safe HMAC (`index.ts:70-76`, `routers.ts:2065-2075`); PhonePe via SDK `validateCallback` (`index.ts:401-406`); all webhooks fail closed in prod when secret unset; cron requires `CRON_SECRET` timing-safe.
- **IDOR** — consistent `customerId` ownership checks on order/address/profile/tracking/payment paths (`routers.ts:1208, 1242, 1591, 2018, 2049, 2094`).
- **Admin auth** — server-enforced (`adminProcedure`), scrypt hashes, timing-safe compare, HMAC httpOnly admin cookie. The old "client-side password" weakness in CLAUDE.md is **fixed** (`server/_core/adminSession.ts`).
- **Cookies** — httpOnly + sameSite=lax + secure (prod), sliding expiry (`server/_core/cookies.ts:42-47`).
- **SQL injection** — Drizzle parameterized; `sql.raw` only on DDL string constants.
- **XSS** — blog HTML routed through DOMPurify (`client/src/lib/sanitize.ts`).
- **Secrets in git** — only publishable/public identifiers committed (Firebase web config, restricted Android API key, Sentry DSN). The one genuine committed secret is NW-SEC-01.
- **CORS** — same-origin only (single Vercel origin); correct posture.

> **Note (owner action, from `AUDIT_STATUS.md`):** Razorpay live secret + webhook secret + Brevo key were publicly exposed before PR #2 and were flagged to be **rotated**. Confirm rotation is complete.
