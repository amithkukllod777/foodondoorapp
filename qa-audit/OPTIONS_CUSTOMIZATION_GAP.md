# OPTIONS_CUSTOMIZATION_GAP.md

**Audit date:** 2026-07-14 · Competitor support inferred from Shopify platform + public storefronts (confidence noted). "Current support" = from Nutriwow source (`AdminSettings.tsx`, routers, schema).

Support: **FULL / PARTIAL / MISSING / NV / N/A**. Complexity: S/M/L/XL.

| Option | Current (Nutriwow) | Competitor support | Gap | Target user | Business value | Complexity | Recommendation |
|---|---|---|---|---|---|---|---|
| Payment gateway toggles | FULL (admin Settings → Payments) | N/A (Shopify Payments) | — | Admin | High | — | Keep |
| Hero/homepage customization | FULL (carousel, sections, 3 image slots) | PARTIAL (theme editor) | — (strength) | Admin | Med | — | Keep |
| Product custom fields (nutrition, origin, processing, etc.) | FULL | PARTIAL (Shopify metafields, INF) | — (strength) | Admin | Med | — | Keep |
| Coupon config | FULL (types, maxUses, expiry, featured) | FULL (INF) | **No per-user limit** (NW-DATA-02) | Admin | Med | S | Add per-customer usage cap |
| Category tree | FULL (admin tree editor) | FULL (INF) | — | Admin | Med | — | Keep |
| **Gift options (wrap, message, hamper builder)** | MISSING (gift-wrap UI exists but dropped, NW-FUNC-01) | FULL (V hampers; gift message INF) | **TS gap** | Customer | High | M | Add gift message + working gift-wrap + hamper/bundle builder |
| **Subscription frequency options** | FULL (15/30/60/90d) | PARTIAL (Happilo V) | — (parity/strength) | Customer | Med | — | Keep; expose in app (Flutter gap) |
| **Loyalty redemption options** | MISSING (earn-only) | NV | **PAR gap** | Customer | Med | M | Enable redemption or hide |
| Notification preferences (opt-in/out per channel) | PARTIAL (unsubscribe email; no granular WhatsApp/SMS prefs) | PARTIAL (INF) | Minor gap | Customer | Med (compliance) | M | Add per-channel notification preferences |
| Address book management | FULL (web); PARTIAL (app: no edit/delete) | FULL (INF) | App gap | Customer | Med | S | Add edit/delete in Flutter |
| Admin role granularity | PARTIAL (roles stored, not enforced — NW-AUTHZ-01) | N/A (Shopify staff permissions) | Security gap | Admin | Med | M | Enforce least-privilege per role |
| Tax/GST config | FULL (5% GST, HSN, CGST/SGST/IGST) | FULL (INF) | — (strength) | Admin/Customer | High | — | Keep; add unit tests |
| Currency / language / RTL | MISSING (INR/English only) | NV (likely INR/EN) | N/A (India-only) | — | Low | — | Do not build |
| Export formats (orders/customers) | PARTIAL (bulk import exists; export NV) | FULL (Shopify export, INF) | Minor | Admin | Med | S | Add CSV export for orders/customers |
| Data-retention / privacy controls (delete, export) | MISSING | INF (Shopify GDPR) | **Compliance gap** | Customer | Med | L | Self-service account deletion + data export (DPDP) |
| Marketing consent toggle | PARTIAL (cookie banner) | INF | Minor | Customer | Med | S | Explicit marketing opt-in record |

## Where Nutriwow's customization is *better* than competitors

- **Rich product detail fields** (nutrition, ingredients, shelf-life, storage, country of origin, processing method, veg mark) — deeper than a stock Shopify PDP.
- **Homepage/hero admin control** with per-surface image slots (website-desktop / website-mobile / mobile-app) and crop options.
- **India-specific config** (GST/HSN, pincode serviceability, WhatsApp templates) built-in rather than via paid apps.

## Where options are missing / too limited (priority order)

1. **Gift options (P1)** — missing hamper/gift-message/working-wrap; a table-stakes gap for this category.
2. **Loyalty redemption (P1)** — option shown but non-functional.
3. **Privacy controls (P1)** — no account deletion/data export (compliance).
4. **Per-user coupon limit + admin role enforcement (P2)** — security/abuse hardening.
5. **Per-channel notification preferences + data export (P2)** — parity conveniences.
