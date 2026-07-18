# Technology Roadmap

> Owner: CTO Agent ([`../agents/cto.md`](../agents/cto.md)). Context: [`../company/master-context.md`](../company/master-context.md).
> Last updated: 2026-06-16.

## Done

### Security & Performance Hardening (PRs #2–#10, #26–#30)

| PR | What | Status |
|----|------|--------|
| #2 | Admin auth + API authz, closed live secret leak | ✅ Merged |
| #3 | Checkout integrity — server-side price recompute | ✅ Merged |
| #4 | Coupon redemption enforcement (server-validated) | ✅ Merged |
| #5 | WhatsApp webhook HMAC verification | ✅ Merged |
| #7 | Blog XSS sanitization (DOMPurify) | ✅ Merged |
| #8 | OTP moved to DB, SHA256 hashed, rate-limited | ✅ Merged |
| #9 | DB indexes (5 indexes on whatsappLogs, emailLogs, stockAlerts) | ✅ Merged |
| #10 | Dashboard query performance | ✅ Merged |
| #26 | Rate limiting (auth endpoints), timing-safe comparisons, scrypt passwords, XSS escaping, sitemap lastmod, input validation | ✅ Merged |
| #27 | Settings cache (5s TTL), query pagination (default 200, max 500), batch stock updates, DB index auto-apply | ✅ Merged |
| #28 | React.memo on ProductCard, ErrorBoundary per admin route, Sentry for cron job failures | ✅ Merged |
| #29 | GitHub Actions CI (type-check + build on PRs) | ✅ Merged |
| #30 | Cron frequency 6h, immutable asset cache headers | ✅ Merged |

### Performance Optimization (current branch)

| Item | Status | Impact |
|------|--------|--------|
| Bundle splitting (manualChunks) | ✅ Done | Index 1023KB → 312KB |
| Lazy-load Sentry SDK | ✅ Done | 271KB removed from critical path |
| PWA manifest (Add to Home Screen) | ✅ Done | Mobile installability |
| Error states on Home + ProductDetail | ✅ Done | Retry button instead of infinite spinner |
| Non-blocking font loading | ✅ Done | Fonts don't block first paint |
| Lazy image attributes | ✅ Done | TrackOrder, UserProfile images |

### Feature Work (from `todo.md`, all shipped)

- PhonePe payment integration (toggleable)
- Abandoned cart tracking + admin page
- CartDrawer/Checkout 3-step redesign
- Live search with keyboard navigation
- Mobile UX improvements
- WhatsApp chatbot (keyword auto-replies + order tracking)
- WhatsApp campaign system (hero/carousel/catalog formats)
- Email campaign system (Resend + SMTP)
- Free-shipping progress nudge in cart (AOV booster)
- Clay 3D design system (claymorphism)

---

## In Progress

| Item | Priority | Status | Notes |
|------|----------|--------|-------|
| CTO marketing implementation spec | P0 | ✅ Done | `docs/technology/cto-marketing-implementation.md` |
| GA4 e-commerce events | P0 | ✅ Done | `view_item`, `add_to_cart`, `begin_checkout`, `purchase` — `client/src/lib/ga4.ts` |
| UTM capture + attribution | P0 | ✅ Done | `useUtm.ts` hook → sessionStorage → orders table (5 columns auto-created) |
| Meta Pixel Search + Lead events | P0 | ✅ Done | Search on submit, Lead on newsletter — dual-tracked (browser + CAPI) |
| Server-side meta injection | P1 | ✅ Done | Express-level `<title>`, OG, JSON-LD for product/blog/category pages |

---

## Next (prioritized)

### P0 — Revenue-Critical (do first)

| Item | Effort | Why |
|------|--------|-----|
| ~~GA4 standard e-commerce events~~ | ~~1 day~~ | ✅ Shipped — `view_item`, `add_to_cart`, `begin_checkout`, `purchase` |
| ~~UTM parameter capture + persistence~~ | ~~1 day~~ | ✅ Shipped — `useUtm.ts` + 5 order columns |
| ~~Meta Pixel Search + Lead events~~ | ~~0.5 day~~ | ✅ Shipped — Search on submit, Lead on newsletter subscribe |

### P1 — SEO & Organic Growth

| Item | Effort | Why |
|------|--------|-----|
| ~~Server-side meta injection for SEO~~ | ~~2 days~~ | ✅ Shipped — Express-level injection for product/blog/category pages |
| Product page SEO (unique titles, descriptions) | 1 day | Currently generic format; needs keyword-rich unique content |
| Blog content engine + cadence | Ongoing | High-intent keywords: badam benefits, kaju recipes, makhana snacking |

### P1 — WhatsApp Automation

| Item | Effort | Why |
|------|--------|-----|
| Post-purchase review request (3 days after delivery) | 1 day | Social proof + UGC |
| Repeat purchase nudge (30 days after last order) | 1 day | Revenue from existing customers |
| Customer segmentation engine | 2 days | Target campaigns by value/behavior |

### P2 — Conversion & Engagement

| Item | Effort | Why |
|------|--------|-----|
| Back-in-stock WhatsApp alerts | 1 day | `stockAlerts` table already exists |
| Coupon auto-apply from URL (`?coupon=XXX`) | 0.5 day | Better campaign landing experience |
| Sticky Add to Cart on mobile | 0.5 day | Reduce friction on product pages |
| Recently viewed products | 1 day | Re-engagement on repeat visits |
| GTM noscript iframe + dataLayer push | 0.5 day | Complete GTM integration |

### P2 — Security & Reliability

| Item | Effort | Why |
|------|--------|-----|
| Admin login hardening | 2 days | Client-side password is known weakness (`CLAUDE.md`) |
| Automated test coverage | Ongoing | Only `computeShipping` has tests currently |
| `JWT_SECRET` persistence warning | 0 | Owner must set in Vercel dashboard (sessions lost on redeploy without it) |

### P3 — Scale Preparation

| Item | Effort | Trigger |
|------|--------|---------|
| DB connection pooling | 1 day | When connection-limit errors appear under load |
| Full-text search (product + blog) | 2 days | When catalog grows beyond 100 SKUs |
| Marketplace inventory sync | 3 days | When Amazon/Flipkart listings go live |
| Order import from marketplaces | 3 days | Unified order management |

---

## Owner-Mentioned Tech (NOT current — future evaluation only)

AWS, Railway, PostgreSQL — **currently NOT used**; stack is Vercel + TiDB (MySQL). Treat as future evaluation only. Any migration is a deliberate decision (log in [`../decisions/board-decisions.md`](../decisions/board-decisions.md)). See [`infrastructure.md`](./infrastructure.md).

---

## Decision Log (tech-related)

| ID | Decision | Source |
|----|----------|--------|
| BD-001 | Single serverless architecture | [`../decisions/board-decisions.md`](../decisions/board-decisions.md) |
| BD-002 | TiDB Cloud as primary database | [`../decisions/board-decisions.md`](../decisions/board-decisions.md) |
| BD-003 | WhatsApp-first communication | [`../decisions/board-decisions.md`](../decisions/board-decisions.md) |
| BD-004 | Clay 3D design system | [`../decisions/board-decisions.md`](../decisions/board-decisions.md) |
| BD-007 | Bundle optimization | [`../decisions/board-decisions.md`](../decisions/board-decisions.md) |
| BD-008 | Security hardening | [`../decisions/board-decisions.md`](../decisions/board-decisions.md) |
