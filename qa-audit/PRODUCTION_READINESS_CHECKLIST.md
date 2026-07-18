# PRODUCTION_READINESS_CHECKLIST.md

**Audit date:** 2026-07-14 · Status: PASS / FAIL / NOT-VERIFIED. Note: the app is **already live in production** at www.nutriwow.in; this checklist assesses readiness of the *current* state for continued safe release.

| # | Requirement | Status | Evidence / Note |
|---|---|---|---|
| 1 | No blocker or critical bugs | **FAIL** | NW-SEC-01 (Critical: committed admin password) open |
| 2 | Production env vars configured | NOT-VERIFIED | Full list in agent notes; can't read Vercel env from here. Confirm all secrets set |
| 3 | Test/dev credentials removed | **FAIL** | Committed `NutriAdmin@2026` (NW-SEC-01); OTP test bypass `9999900000`/`1234` not env-gated |
| 4 | Debug mode disabled | PARTIAL | `__manus__/debug-collector.js` present but not loaded (NW-CFG-01); Sentry env defaults to "production" (NW-CFG-02) |
| 5 | Secrets secured (not in git) | PARTIAL | Only NW-SEC-01 is a genuine committed secret; others env-only. Prior exposed keys (Razorpay/Brevo) — confirm rotation per AUDIT_STATUS.md |
| 6 | Production APIs configured | NOT-VERIFIED | Razorpay live + WhatsApp + Resend/SMTP + Shiprocket/iThink wired; confirm live keys in env |
| 7 | Payment live config correct | PARTIAL | Amount integrity + signature verify solid; **webhook path incomplete (NW-PAY-01)**; **no refunds (NW-PAY-02)** |
| 8 | Monitoring enabled | PASS | Sentry (client+server), Vercel Analytics + Speed Insights, GA4, Pixel, CAPI |
| 9 | Backup & restore tested | NOT-VERIFIED | TiDB Cloud provides managed backups, but **no evidence restore was tested**. Per audit rule, backup ≠ reliable until restore verified. Owner action |
| 10 | Legal pages available | PASS | Privacy, Terms, Refund, Return, Shipping, Cookie banner all present |
| 11 | App version correct | NOT-VERIFIED | `package.json` "1.0.0"; Flutter/Capacitor versions — confirm store metadata matches |
| 12 | DB migrations safe | PARTIAL | Versioned drizzle migrations + runtime `ALTER TABLE IF NOT EXISTS` self-heal (NW-CFG note); schema drift invisible to history — documented constraint |
| 13 | Rollback plan exists | NOT-VERIFIED | Vercel keeps prior deployments (instant rollback); no documented DB rollback for runtime DDL. Document it |
| 14 | Support contact works | PASS (config) | `wecare@nutriwow.in`, `+91-95463-34633`, WhatsApp chat wired; verify live |
| 15 | Store metadata correct | NOT-VERIFIED | Play/App Store listing not auditable from repo |
| 16 | Release notes prepared | NOT-VERIFIED | No CHANGELOG found |
| 17 | CI quality gate | **FAIL** | `ci.yml` builds only — no typecheck/test; 12 tsc errors ship (NW-BUILD-01) |
| 18 | Typecheck clean | **FAIL** | `pnpm check` → 12 errors |
| 19 | Automated tests green | **FAIL** | 12/57 fail (credential/live tests); core flows untested |
| 20 | Security headers | PARTIAL | X-Frame/X-Content-Type/Referrer/Permissions set; **no CSP, no HSTS** (NW-SEC-04) |
| 21 | Rate limiting effective | **FAIL** | In-memory + spoofable key ineffective on serverless (NW-SEC-03) |
| 22 | Error boundaries | PASS | `ErrorBoundary.tsx` wired to Sentry |
| 23 | Account/data deletion (privacy) | NOT-VERIFIED | No user-facing account-deletion/data-export flow found — see PRIVACY note |
| 24 | Idempotency (payments/orders) | PASS | Guarded by `status !== "pending_payment"` across finalize paths |

## Privacy / compliance flags (require legal review — not conclusive)

- **No self-service account deletion or data export** flow found (India DPDP Act expectations). Flag for legal + product.
- Cookie banner present; confirm analytics/pixel consent gating actually blocks pre-consent firing.
- Privacy policy present; confirm it discloses WhatsApp/Meta, Razorpay/PhonePe, Sentry, Shiprocket/iThink third-party sharing.

## Release decision inputs

**Blocking for a clean "GO":** NW-SEC-01 (Critical), NW-BUILD-01/typecheck (quality gate), NW-SEC-03 (rate limiting), NW-PAY-01 (webhook completeness). See EXECUTIVE_SUMMARY.md for the GO/NO-GO call and REMEDIATION_PLAN.md for sequencing.
