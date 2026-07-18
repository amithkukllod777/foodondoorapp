# Board Decisions

> Decision log (ADR-style). Owner: CEO Agent ([`../agents/ceo.md`](../agents/ceo.md)). Context: [`../company/master-context.md`](../company/master-context.md).
>
> Format per entry: **Context → Decision → Consequences**. Newest on top.

---

## D-0011 — Weekly Sprint Planning & Cross-Department Review (2026-06-16)
- **Context:** CMO and CTO departments operating in silos. CMO has documentation structure but zero execution (no campaigns sent, no content published, no keyword research). CTO has built all marketing tools (Pixel, CAPI, WhatsApp campaigns, email campaigns) but CMO hasn't used them. All business KPIs in master-context.md are empty.
- **Decision:** Establish weekly CTO-authored cross-department review. First review filed as `docs/reports/2026-06-16-weekly.md`. 7-day sprint assigned to CEO (3 owner actions), CMO (6 execution tasks), CTO (6 engineering tasks). Three CEO decisions pending: Meta Ads budget, marketplace expansion, content investment.
- **Consequences:** Sprint cadence established. CMO must deliver first WhatsApp campaign by June 18, content calendar by June 17. CTO must deliver GA4 e-commerce events by June 17, UTM attribution by June 18. CEO must set JWT_SECRET today.

## D-0010 — Do NOT Delete WhatsApp Assets
- **Context:** WhatsApp Business verification and template approvals are time-consuming to restore.
- **Decision:** Never delete anything related to WhatsApp phone number `9993883710` or any WhatsApp Business assets without explicit founder approval.
- **Consequences:** PERMANENT rule. All agents must respect this constraint.

## D-0008 — CTO Marketing Implementation Spec
- **Context:** CMO needs performance ads, WhatsApp automation, and SEO. No technical spec existed to translate marketing requirements into engineering work.
- **Decision:** CTO created comprehensive implementation spec covering: website changes, tracking setup, GA4/GTM/Meta Pixel checklist, WhatsApp automation plan, SEO technical fixes. Filed as `docs/technology/cto-marketing-implementation.md`.
- **Consequences:** Engineering priorities now clear: P0 = GA4 e-commerce events + UTM attribution. P1 = server-side meta injection for SEO + WhatsApp automation (review request, repeat nudge). All WhatsApp automation reuses existing campaign infrastructure — no rebuild needed.

## D-0007 — Performance & Bundle Optimization
- **Context:** Frontend index.js chunk was 1023KB (288KB gzip) — too large for mobile users.
- **Decision:** Split into vendor chunks via Vite `manualChunks`. Lazy-load Sentry. Non-blocking fonts. PWA manifest.
- **Consequences:** Index chunk down to 312KB. Vendor chunks cache independently across deploys. Sentry deferred from initial render. PWA enables mobile "Add to Home Screen".

## D-0006 — Cron Frequency Increase
- **Context:** Abandoned cart recovery needed within 45 minutes; daily cron was too slow.
- **Decision:** Increase Vercel cron from `0 0 * * *` (daily) to `0 */6 * * *` (every 6 hours).
- **Consequences:** Cart recovery messages reach customers faster. Campaign batches process 4x more frequently.

## D-0005 — Security & Performance Hardening (Round 2)
- **Context:** Live store audit found: no rate limiting, non-timing-safe signature checks, SHA256 passwords, unbounded queries, N+1 stock updates.
- **Decision:** Ship PRs #26-#30: rate limiting, timing-safe comparisons, scrypt passwords, query pagination, settings cache, batch stock updates, CI pipeline.
- **Consequences:** All auth endpoints rate-limited. All webhook signatures timing-safe. Admin passwords use scrypt. Queries bounded (default 200, max 500). 5s settings cache. GitHub Actions CI on PRs.

## D-0004 — AI Command Center on the repo
- **Context:** Owner wants structured "C-suite" agents (CEO/CMO/CTO) operating off a single knowledge base.
- **Decision:** `docs/` is the company brain; `docs/company/master-context.md` is read-first by every agent. Agent scopes in `docs/agents/`.
- **Consequences:** Decisions/marketing/tech updates flow into `docs/decisions`, `docs/marketing`, `docs/technology` respectively.

## D-0003 — Security & performance hardening (Round 1)
- **Context:** Live store had critical issues (secret leak, price tampering, unauth webhooks, XSS, weak OTP). Source: `AUDIT_STATUS.md`.
- **Decision:** Ship independent, reviewable PRs (#2–#10) with typecheck + tests.
- **Consequences:** Admin authz, server-side checkout recompute, coupon enforcement, webhook HMAC, blog sanitization, DB-backed OTP, DB indexes. Admin login hardening still open.

## D-0002 — Design system "Clay 3D on original palette"
- **Context:** Redesign needed; a peach/cream palette was proposed.
- **Decision:** Adopt claymorphism shapes but **keep original brand palette** (green primary, orange CTAs). Peach/cream **rejected** by owner. Source: `CLAUDE.md`.
- **Consequences:** Brand colors must not change without owner approval; admin panel intentionally not redesigned.

## D-0001 — Independent infrastructure
- **Context:** Remove platform lock-in.
- **Decision:** Own TiDB Cloud DB + Vercel Blob media + Vercel hosting; pnpm; single serverless function deploy.
- **Consequences:** 100% independent infra; `main` push auto-deploys to prod. Source: `CLAUDE.md`, `DEPLOY_VERCEL.md`.

---
🔲 _Older/business decisions (pricing, channel choices) — owner to backfill._
