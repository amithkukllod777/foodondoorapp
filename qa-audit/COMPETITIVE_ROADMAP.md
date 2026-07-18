# COMPETITIVE_ROADMAP.md

**Audit date:** 2026-07-14 · Priority via the Step-4.10 model (User impact / Business impact / Competitive urgency / Frequency / Evidence confidence / Effort / Maintenance / Risk, each 1–5).
Categories: **P0** blocker · **P1** high-value · **P2** parity · **P3** optional · **DO NOT BUILD**.

## Immediate improvements (this cycle)

| Item | Problem solved | Evidence | User value | Competitive value | Deps | Complexity | Success metric | Validation |
|---|---|---|---|---|---|---|---|---|
| **Enable/relabel loyalty** | Points shown but unspendable (NW-FUNC-02) | Code (V) | Removes trust dead-end | Parity | Checkout wiring | M | Redemption rate >0 or clean "coming soon" | A/B checkout |
| **Fix gift-wrap capture** | Selection dropped (NW-FUNC-01) | Code (V) | Gift intent honored | Foundation for gifting | placeOrder schema | M | Gift-wrap orders recorded | Order inspection |
| **Guest checkout** | Forced OTP login = friction | Competitors INF | Fewer abandonments | Table-stakes | Auth/order refactor | L | Checkout conversion ↑, abandonment ↓ | Funnel before/after |

## Next release

| Item | Problem | Evidence | User value | Competitive value | Deps | Complexity | Success metric | Validation |
|---|---|---|---|---|---|---|---|---|
| **Gifting hub v1** | No gifting/hamper path (biggest gap) | Happilo/Farmley/Nutraj (V) | Serves gifting occasion | High diff/parity | Gift-wrap fix, hamper products | L | Gifting-category revenue share | Festive cohort sales |
| **Refund capability** | No money-back path (NW-PAY-02) | Code (V) | Trust; faster resolution | Table-stakes | Gateway sandbox | L | Refund SLA, fewer disputes | Sandbox + ops |
| **Working rewards loop** | Loyalty parity | Happilo subscribe-save (V) | Repeat-purchase driver | Parity | Loyalty enable | M | Repeat-purchase rate | Cohort retention |
| **App parity (payments/subs/tracking)** | App < web (FEATURE_INVENTORY) | Code (V) | Consistent mobile UX | Diff (own app) | Mobile dev | XL | App conversion ≈ web | App funnel |

## Next quarter

| Item | Problem | Complexity | Success metric |
|---|---|---|---|
| Corporate / bulk gifting | Missing B2B revenue channel (competitors V) | L | Corporate enquiries → orders |
| Privacy self-service (account deletion + data export) | Compliance + trust gap | L | DPDP readiness; requests handled self-serve |
| Gift cards | Parity + gifting adjunct | M | Gift-card GMV |
| Occasion/goal-based navigation | Discovery beyond categories | M | Category-page CTR |
| Surface review counts/ratings prominently | Perceived trust vs Happilo's visible review volume | S | PDP add-to-cart rate |

## Long-term opportunities

| Item | Rationale |
|---|---|
| Deepen India-native strengths (WhatsApp commerce, AI assistant, referral) as differentiators | Where Nutriwow already leads a stock Shopify store |
| Post-delivery WhatsApp review solicitation | Compounds the review-count trust gap over time |
| Subscription growth (bundles, skip/pause, app parity) | Recurring revenue moat |

## Do not build

| Item | Why |
|---|---|
| Multi-currency / i18n / RTL | India-only INR/English market; no evidence of demand (OVER) |
| Copying competitor visual layouts/assets | Legal + brand-dilution; extract principles instead |
| Feature-parity for every Shopify app | Prefer fewer, better-integrated flows over feature count (audit rule) |
| Complex tiered pricing plans | N/A for a B2C product retailer |

## Guardrails (from the audit brief)

- Prefer **user value over feature count**; fewer, well-integrated options beat parity checklists.
- **Do not resolve competitive gaps before the P0 security/quality items** in REMEDIATION_PLAN.md — a gifting hub on top of a committed admin password and an untested checkout is the wrong sequence.
- Every roadmap item needs a **success metric + validation** before build; competitor evidence confidence is INF for several Shopify-default rows — verify on the live storefronts before committing scope.
