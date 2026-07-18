# COMPETITIVE_FEATURE_MATRIX.md

**Audit date / info checked:** 2026-07-14 · **Platform:** Web · **Region:** India
**Competitors:** Happilo (market leader), Farmley (challenger), Nutraj (established) — all Shopify D2C. See COMPETITOR_SELECTION.md.

Availability: **FULL** / **PARTIAL** / **MISSING** / **NV** (not verified) / **N/A**.
Evidence confidence: **V** verified this session · **PV** partially verified · **INF** inferred (esp. Shopify-platform defaults) · **NV** not verified.
Gap type: **TS** table-stakes · **CD** competitive disadvantage · **PAR** parity opportunity · **DIFF** differentiation · **LOW** low-value · **OVER** overbuilt.

| Capability | Nutriwow | Happilo | Farmley | Nutraj | Gap type | User impact | Confidence | Priority |
|---|---|---|---|---|---|---|---|---|
| Product catalog + variants | FULL | FULL | FULL | FULL | — | — | V | — |
| Customer accounts / order history | FULL | FULL (INF) | FULL (INF) | FULL (INF) | — | — | V/INF | — |
| **Guest checkout** | MISSING (OTP login required) | FULL (INF, Shopify) | FULL (INF) | FULL (INF) | **TS/CD** | High — forced login adds friction & drop-off | INF | **P1** |
| Login method | Mobile+WhatsApp OTP | Email/pw + social (INF) | Email/pw (INF) | Email/pw (INF) | DIFF (OTP is friendlier for India mobile) | Medium (positive) | V | Protect |
| Product reviews & ratings | FULL (verified-purchase) | FULL (V, 1000s reviews) | PARTIAL (NV) | PARTIAL (NV) | — (strength) | — | V | Protect |
| Search / filter / sort | FULL | FULL (INF) | FULL (INF) | FULL (INF) | PAR | — | INF | P3 |
| Coupons / promo codes | FULL | FULL (V) | FULL (V, SECRET code) | FULL (INF) | — | — | V | — |
| **Subscribe & Save** | FULL (15/30/60/90d) | FULL (V, 15% off, HAPSUB15) | NV | NV | — (parity/strength) | Medium | V | Protect |
| **Loyalty / rewards (spendable)** | MISSING (earn-only, redeem disabled) | NV (INF app available) | NV | NV | **PAR/CD** | Medium — points shown but unusable | V(self)/NV(comp) | **P1** |
| **Gifting hub / gift hampers** | MISSING (no dedicated gifting/hamper catalog) | FULL (V, gifting + corporate) | FULL (V, gift packs) | FULL (V, hampers) | **TS/CD** | High — gifting is a core dry-fruit revenue driver, esp. festive | V | **P0/P1** |
| **Corporate / bulk gifting** | MISSING | FULL (V, /collections/corporate-gifts) | PARTIAL (V, corporate mention) | PARTIAL (NV) | **CD** | High-value B2B revenue | V | **P1** |
| Wishlist | FULL | FULL (INF) | FULL (INF) | FULL (INF) | — | — | INF | — |
| Referral program | FULL | NV | NV | NV | DIFF | Low-Med | V(self) | Protect |
| Gift cards | MISSING | FULL (INF, Shopify) | FULL (INF) | FULL (INF) | PAR | Low-Med | INF | P2 |
| Mobile app (native) | FULL (Flutter) | PV (NV this session) | PV | NV | DIFF (own app) | Medium | V(self) | Protect |
| WhatsApp order/OTP notifications | FULL | NV | NV | NV | DIFF | Medium (India-fit) | V(self) | Protect |
| Blog / content | FULL (AI-assisted) | FULL (V) | PARTIAL (NV) | FULL (V) | PAR | Low | V | — |
| Back-in-stock alerts | FULL | NV | NV | NV | DIFF | Low | V(self) | Protect |
| Multi-currency / i18n | MISSING (INR only) | NV (likely INR) | NV | NV | N/A (India-only) | — | NV | DND |
| Refunds (self/automated) | MISSING (NW-PAY-02) | INF (Shopify refund) | INF | INF | **CD** | Medium — trust | INF | P1 |
| Account deletion / data export | MISSING | INF (Shopify GDPR) | INF | INF | **CD (compliance)** | Medium | INF | P1 |
| COD | FULL | FULL (INF) | FULL (INF) | FULL (INF) | — | — | INF | — |
| Pincode ETA / serviceability | FULL | PV | PV | NV | PAR/strength | Low | V(self) | — |
| AI shopping assistant / chatbot | FULL (AIChatBox + WhatsApp chat) | NV | NV | NV | DIFF | Low-Med | V(self) | Protect |

## Key gaps (ranked)

1. **Gifting hub & hampers (P0/P1, TS/CD, V):** all three competitors have dedicated gifting + corporate-gifting sections with curated hampers. Nutriwow has none. Gifting is a primary purchase occasion for dry fruits (festivals, corporate) — the single most material feature gap.
2. **Guest checkout (P1, TS, INF):** competitors on Shopify allow guest checkout; Nutriwow forces OTP login, adding friction and cart abandonment.
3. **Spendable loyalty (P1, PAR/CD, V):** Nutriwow shows points that cannot be redeemed — worse than having none. Happilo runs subscribe-&-save discounts; a working rewards loop is expected.
4. **Refunds & account deletion (P1, CD, INF):** platform-standard on Shopify competitors; missing here (also compliance-relevant).

## Strengths to protect (Nutriwow ahead)

- **India-native WhatsApp OTP login + order notifications + 2-way WhatsApp chat** — lower friction and better-fit than email/password competitors (V, self).
- **Verified-purchase reviews built-in** (not a paid third-party app), **referral program**, **back-in-stock alerts**, **AI chatbot**, and an **own native app** — a richer engagement stack than a stock Shopify store, if the gifting/guest-checkout/loyalty gaps are closed.

> Confidence caveat: competitor "FULL (INF)" rows for accounts/guest-checkout/gift-cards/refunds/deletion are inferred from the Shopify platform + observed `/account/*` routes, not each brand's storefront opened individually this session. Treat as high-probability, not verified. No competitor purchases were made.
