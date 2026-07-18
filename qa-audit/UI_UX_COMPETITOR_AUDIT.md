# UI_UX_COMPETITOR_AUDIT.md

**Audit date:** 2026-07-14 · **Platform:** Web · **Region:** India
Benchmarks: Happilo / Farmley / Nutraj (Shopify D2C). Nutriwow "current" = from source review of `client/src/*`; competitor benchmarks from public storefronts (confidence labelled). **We recommend design principles, not visual imitation** — do not copy competitor layouts or assets.

| Screen / workflow | Current (Nutriwow) | Competitor benchmark | Problem | User impact | Recommendation | Type | Confidence | Priority |
|---|---|---|---|---|---|---|---|---|
| **Checkout** | 3-step drawer, **login (OTP) required before ordering** (`CartDrawer.tsx`) | Guest checkout available (Shopify, INF) | Forced login before purchase | High — added friction, abandonment | Allow guest checkout; collect phone at payment; offer optional account | Functional | INF | **P1** |
| **Gifting** | No gifting entry point / hamper catalog | Dedicated "Gifting" + "Corporate Gifts" nav (Happilo V; Farmley/Nutraj hampers V) | No path for the gifting occasion | High — misses festive/corporate demand | Add a Gifting hub: curated hampers, gift message, gift wrap (tie to NW-FUNC-01), price tiers | Both | V | **P1** |
| **Loyalty display** | Points balance shown but unspendable (NW-FUNC-02) | Subscribe-&-save discount messaging (Happilo V) | Shows value user can't use | Medium — erodes trust | Either enable redemption or relabel "coming soon" | Functional | V | P1 |
| **Product page** | Rich (reviews, FBT, pincode ETA, nutrition), but 83 KB source — heavy | Clean, fast Shopify PDP (INF) | Possible weight/perf | Medium | Confirm perf (PERFORMANCE_AUDIT); code-split | Both | INF | P2 |
| **Trust signals** | Verified-purchase reviews, social-proof toast | Thousands of visible reviews + ratings badges (Happilo V) | Fewer reviews at this stage | Medium — perceived trust | Surface review counts/ratings prominently on cards & PDP; seed via post-delivery WhatsApp review asks | Visual | V | P2 |
| **Navigation / discovery** | Category bar + mega menu | Occasion/benefit-led nav (gifting, by-health-goal) (INF) | Category-only browsing | Low-Med | Add occasion/goal-based entry points (Gifting, Immunity, Everyday) | Both | INF | P2 |
| **Empty/loading/error states** | Skeletons + error retry present (Home) | Standard Shopify | OK | Low | Maintain consistency across all pages | Visual | V(self) | P3 |
| **Mobile UX** | Responsive SPA + native app | Responsive Shopify + some apps | App is an advantage | — (strength) | Close app feature gaps (FEATURE_INVENTORY) so app ≥ web | Functional | V(self) | P2 |
| **Post-purchase** | Order confirmation + WhatsApp updates | Email-centric (INF) | — (strength) | — | Protect WhatsApp advantage; add tracking screen in app | Functional | V(self) | Protect |
| **Cookie/consent UX** | Cookie banner present | Standard | Verify consent gates pixels | Medium (compliance) | Ensure no pre-consent pixel firing | Functional | V(self) | P2 |

## Cross-cutting UX observations (Nutriwow, from source)

- **Design system is strong and consistent** — claymorphism tokens, Baloo 2/Poppins, defined shadow/press states, skeletons and error-retry. Perceived professionalism is good.
- **Biggest UX gap is a workflow gap, not a visual one:** forced login before checkout + no gifting path. These cost conversions more than any styling difference.
- **Loyalty dead-end** is a UX credibility issue (showing an unusable balance).
- **Accessibility (not competitor-benchmarked here):** verify color contrast on gold `%OFF` badges, focus order in the checkout drawer, form labels, and touch-target sizes — no automated a11y test exists. Marked NOT TESTED.

## Principles to adopt (not copy)

1. **Reduce purchase friction** — guest-first, login optional.
2. **Design for the gifting occasion** as a first-class flow, not a product tag.
3. **Every displayed reward must be redeemable** — no dead-end value.
4. **Make trust visible** — review counts and ratings up front.
