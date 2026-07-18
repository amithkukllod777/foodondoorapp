# PERFORMANCE_AUDIT.md

**Audit date:** 2026-07-14 · **Method:** static/code-based analysis only. **No runtime profiling, Lighthouse, load test, or APM data was available** (the audit proxy cannot reach production, and no staging was provided). Every "Observed" value below is a **code-based assumption**, not a measurement — labelled accordingly.

| Metric | Observed (code-based) | Expected threshold | Status | Bottleneck | Recommendation |
|---|---|---|---|---|---|
| Homepage data fetch | Single `homepage.getAll` call (batched) | 1 round-trip | PASS (design) | — | Good — deliberately one call to avoid 429 (`Home.tsx:59`) |
| Cold start (serverless) | tRPC + Drizzle + Sentry + many imports in one function; runtime `ALTER TABLE` attempts on cold start | < 1s TTFB | NOT TESTED / SUSPECTED slow | Single fat serverless function; per-cold-start DDL (`db.ts` ensure* fns) | Measure; cache schema-ensured flag in module scope to skip repeat DDL |
| LCP (hero) | Preload of cached hero slide before React boot; Vercel image optimization | LCP < 2.5s | NOT TESTED / likely OK | — | Verify with Lighthouse on 4G |
| JS bundle size | Large pages: `ProductDetail.tsx` 83 KB, `UserProfile.tsx` 51 KB, `AdminSettings.tsx` 107 KB source; lazy-loading used for Blog/Newsletter | Main route JS < ~250 KB gz | NOT TESTED / SUSPECTED heavy | Admin bundle; heavy storefront pages | Confirm admin is route-split from storefront; code-split ProductDetail |
| Image delivery | Vercel Image Optimization (`optImg`), webp, sized, 1-day min TTL (`vercel.json`) | — | PASS (design) | — | Good |
| Static asset caching | `Cache-Control: public, max-age=31536000, immutable` on `/assets/*` | 1yr immutable | PASS | — | Good |
| DB query pattern | Per-item loops in stock decrement (`db.ts:864`), coupon; N+1 risk in some admin aggregations | — | NOT TESTED / SUSPECTED | Loops over items; unindexed filters unknown | Review indexes on `orders.customerId`, `productStock.productId`, `coupons.code`, `otpCodes` |
| Rate-limit memory | In-memory Map, lazy purge at size>200 (`rateLimit.ts:43`) | — | PARTIAL | Grows per instance; not shared | Move to shared store (also a security fix, NW-SEC-03) |
| Unnecessary renders | `useMemo`/`useCallback`/`startTransition` used on Home | — | PASS (spot-check) | — | OK on audited pages |
| Cron cadence | `/api/cron/jobs` once daily `0 2 * * *` (`vercel.json`) | Matches sweep intent? | SUSPECTED mismatch | Daily is coarse for stale-payment/abandoned-cart sweeps | Confirm intended cadence vs `jobs.ts` |
| Serverless duration cap | `maxDuration: 60` | — | PASS | — | Campaign batches must stay within 60s |
| Payment/notification path | placeOrder fires SMS+WhatsApp+email+CAPI inline before responding? | Async/non-blocking | NOT TESTED / SUSPECTED | If awaited inline, adds latency to order response | Confirm notifications are fire-and-forget or queued |

## Notes & caveats

- **This is not a measured performance report.** To produce one, run: Lighthouse (mobile, 4G throttle) on `/`, `/products/:handle`, `/collections/:name`; Vercel Speed Insights (already installed — `@vercel/speed-insights`) real-user data; a bundle analyzer on `vite build`; and DB slow-query logs from TiDB.
- **Positive signals (code-based):** batched homepage call, image optimization, aggressive static caching, lazy-loaded below-fold sections, `startTransition` for category switches, `@vercel/analytics` + `@vercel/speed-insights` already wired for RUM.
- **Watch items:** single fat serverless function + cold-start DDL; per-item DB loops; admin bundle weight; verify notification sending doesn't block the order-place response.
