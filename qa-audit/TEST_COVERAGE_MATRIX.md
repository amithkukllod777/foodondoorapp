# TEST_COVERAGE_MATRIX.md

**Audit date:** 2026-07-14 · Result labels: PASS / FAIL / PARTIAL / NOT TESTED / NOT APPLICABLE.

## Existing automated tests

| File | Type | What it covers | Result (this env) |
|---|---|---|---|
| `server/pricing.shared.test.ts` | Unit | Shared pricing/anti-tamper math | PASS |
| `server/homepage.test.ts` | Unit/integration | Homepage aggregation | PASS |
| `server/shipping.test.ts` | Unit | Shipping helpers | PASS |
| `server/facebookCapi.test.ts` | Unit | CAPI payload | PASS |
| `server/otp.test.ts` | Unit | OTP generation/hash | PASS |
| `server/adminSession.test.ts` | Integration | Admin password verify | FAIL — needs `ADMIN_PASSWORD` |
| `server/auth.logout.test.ts` | Integration | Logout cookie clear | FAIL — env-dependent |
| `server/blog.test.ts` | Integration | Blog DB helpers | FAIL — needs `DATABASE_URL` |
| `server/email.test.ts` | Integration (live) | SMTP connect + **live OTP send** | FAIL — needs SMTP creds |
| `server/phonepe.test.ts` | Integration | Credential presence | FAIL — needs PhonePe creds |
| `server/whatsapp.test.ts` | Integration (live) | Token + **live Meta API call** | FAIL — needs WhatsApp creds |
| `flutter_app/test/pricing_test.dart` | Unit | Flutter pricing parity | NOT TESTED (no Flutter toolchain here) |

**Total:** 45 passed / 12 failed. All failures are missing-credential live-integration checks, not defects. **Several tests perform live external calls / live email sends** — unsafe for CI (MISSING_TESTS.md).

## Coverage by feature (per-dimension)

Smoke/Functional/Negative/Boundary/API/Security/Regression/UI-UX + Automated coverage.
Auto = has automated test · — = none · N/A = not applicable.

| Feature | Smoke | Functional | Negative | Boundary | API | Security | Regression | UI/UX | Auto | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Pricing / anti-tamper | ✅ | ✅ | ✅ | PARTIAL | ✅ | ✅ | — | N/A | Auto | Strongest area (`pricing.shared.test`) |
| OTP generate/hash | ✅ | ✅ | PARTIAL | — | — | PARTIAL | — | N/A | Auto | Brute-force path NOT TESTED |
| Homepage aggregation | ✅ | ✅ | — | — | ✅ | — | — | — | Auto | |
| Shipping helpers | ✅ | ✅ | — | — | PARTIAL | — | — | N/A | Auto | |
| CAPI payload | ✅ | ✅ | — | — | ✅ | — | — | N/A | Auto | |
| Admin auth | PARTIAL | PARTIAL | — | — | — | PARTIAL | — | — | Auto(FAIL) | Needs env; no priv-esc test |
| Checkout / placeOrder | — | — | — | — | — | — | — | — | — | **NOT TESTED — critical gap** |
| Payment verify (Razorpay/PhonePe) | — | — | — | — | — | — | — | — | — | **NOT TESTED — critical gap** |
| Payment idempotency | — | — | — | — | — | — | — | N/A | — | **NOT TESTED** (NW-PAY-01) |
| Coupon validate/redeem | — | — | — | — | — | — | — | — | — | **NOT TESTED** (NW-DATA-02) |
| Stock decrement/oversell | — | — | — | — | — | — | — | N/A | — | **NOT TESTED** (NW-DATA-01/03) |
| Order tracking / IDOR | — | — | — | — | — | — | — | — | — | NOT TESTED |
| Reviews (verified purchase) | — | — | — | — | — | — | — | — | — | NOT TESTED |
| Wishlist / referral / subscriptions | — | — | — | — | — | — | — | — | — | NOT TESTED |
| Admin CRUD (products/coupons/orders) | — | — | — | — | — | — | — | — | — | NOT TESTED |
| WhatsApp/email notifications | PARTIAL | — | — | — | — | — | — | N/A | Auto(FAIL,live) | Live-call tests only |
| SEO / sitemap / SSR inject | — | — | — | — | — | — | — | — | — | NOT TESTED (recent change) |
| Web UI (any component) | — | — | — | — | N/A | — | — | — | — | **No frontend/E2E tests at all** |
| Flutter app flows | — | — | — | — | — | — | — | — | — | Only pricing unit test |

## Summary

- **Automated coverage is server-unit-only.** No frontend/component tests, **no E2E**, no API-contract tests against a running server, no security regression tests.
- **The highest-risk flows (checkout, payment verify, idempotency, coupon concurrency, stock oversell) have zero automated coverage.**
- **6 of 11 server suites are live-integration** (require prod secrets / make live external calls) → red in CI and unsafe. They test *credential presence / connectivity*, not business logic.
- **Weak/environment-coupled tests:** `email.test.ts` and `whatsapp.test.ts` send real messages / hit live Meta API — flaky and side-effecting.
