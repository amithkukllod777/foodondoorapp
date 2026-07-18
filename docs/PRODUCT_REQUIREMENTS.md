# Foodondoor Product Requirements Document

**Status:** Draft for validation  
**Product:** Foodondoor: Shopping & Delivery  
**Android package:** `com.foodondoor.app`  
**Pilot geography:** Bhopal–Sehore local commerce; pan-India courier shipping for eligible packaged goods

## 1. Product decision

Foodondoor will relaunch as a hybrid commerce platform, not as a blanket 10-minute-delivery service. The product will combine:

- local restaurant ordering;
- local grocery and daily essentials;
- Foodondoor-owned and third-party packaged products;
- pan-India delivery for courier-compatible SKUs.

Delivery promises must be calculated by SKU, fulfilment mode, address and operating hours. The customer must see **Express, Same Day, Next Day or Standard** before checkout.

## 2. Goals

- Reactivate the legacy install base without treating lifetime downloads as active customers.
- Validate demand, repeat purchase and variable contribution in controlled pincodes.
- Build reliable catalogue, payment, inventory, fulfilment and support foundations.
- Reach 1,000 monthly orders with a positive variable-contribution trend before wider expansion.
- Establish an invite-only seller system with measurable SLAs and compliance controls.

## 3. Non-goals for MVP

- A universal 10-minute delivery guarantee.
- Open seller self-registration.
- Nationwide restaurant delivery.
- Electronics or fashion marketplace.
- Customer credit or a stored-value wallet.
- Complex loyalty tiers or Foodondoor Plus.
- Live shopping or an AI assistant before catalogue/search quality is stable.

## 4. Users and roles

### Customer
Discovers products or restaurants, verifies serviceability and ETA, places and tracks orders, receives invoices, raises support requests and manages consent.

### Seller or brand
Completes onboarding, manages catalogue/stock/pricing, fulfils orders, handles returns and views settlements and performance.

### Restaurant
Controls menus, modifiers, timing, availability, preparation SLA and order acceptance.

### Delivery partner
Manages availability, assignments, navigation, proof of delivery, cash reconciliation and earnings.

### Foodondoor operations
Controls catalogue, inventory, orders, refunds, settlements, sellers, promotions, support, compliance and audits.

## 5. MVP customer journeys

1. User opens a deep link or home screen.
2. User selects or confirms location.
3. System determines local and national serviceability.
4. User browses Restaurants, Grocery, Nutrition or Shop.
5. Product page shows price, pack, seller, stock, ETA, return rule and label images.
6. System separates carts/shipments when invoicing or fulfilment requires it and explains the split before payment.
7. User pays through UPI/card/net banking or eligible COD.
8. Order is created exactly once and inventory is reserved.
9. Customer receives accurate transactional updates.
10. Customer tracks, cancels, returns or contacts support according to policy.
11. Completed orders become eligible for verified reviews and reorder prompts.

## 6. Functional requirements

### Identity and consent

- Mobile/email login, OTP controls and guest browsing.
- Address book and device/session management.
- Transactional and marketing preference controls.
- In-app and web account-deletion routes.
- Role-based access for staff, sellers and partners.

### Discovery and catalogue

- Serviceability-aware home and category navigation.
- Search, filters, variants, stock and offers.
- Product, restaurant and seller pages.
- Accurate pack size, tax, seller, ETA and fulfilment badges.
- English-first content model with Hindi readiness.

### Cart and checkout

- Fulfilment-aware carts and split-shipment explanation.
- Transparent item, delivery, convenience, discount and tax lines.
- Address validation, delivery slot selection and COD controls.
- Coupon stacking and abuse prevention.

### Orders and support

- Order status timeline and exception notifications.
- Invoice access, cancellation, refund and return flows.
- Unified support case with order/customer context.
- Compensation and refund permissions with audit trails.

### Seller and operations

- KYC, GST and FSSAI data where applicable.
- Catalogue, stock, price, order, packing-label and invoice workflows.
- Batch/lot, expiry, FEFO and returns disposition for controlled inventory.
- Seller scorecards, settlements and compliance-expiry alerts.

## 7. Business rules

- An order and payment event must be idempotent.
- Inventory reservations expire and release automatically.
- Price, order status, refund and settlement changes are auditable.
- Ratings are permitted only after completed orders.
- Public launch is blocked by payment mismatch, duplicate/lost orders, material overselling, critical security issues or misleading compliance disclosures.
- New cities/categories require approved economics and operations gates.

## 8. KPIs and launch gates

| Measure | Pilot guardrail | Scale gate |
|---|---:|---:|
| Blended AOV | ₹600+ | ₹750+ |
| Blended gross margin/take rate | 18%+ | 20%+ |
| Cancellation rate | <8% | <5% |
| Packaged-goods return/refund | <6% | <4% |
| On-time dispatch | >92% | >96% |
| 90-day repeat | >20% | >30% |
| Paid CAC payback | Within 3 orders | Within 90 days |

Variable contribution must be measured from the first order and become positive before fixed overhead is used to justify expansion.

## 9. Dependencies

- Verified Play Console, app-signing, source-code and backend ownership.
- Current installs, MAU, reachability and consent data.
- Pilot pincodes, assortment and fulfilment split.
- Payment gateway, courier/local delivery and messaging providers.
- Legal review of FSSAI, GST, Legal Metrology, consumer, privacy and platform policies.

## 10. Definition of done

A serviceable customer can complete an accurately priced order; the order appears exactly once across operational systems; payment, stock, invoice, shipment, refund and settlement reconcile; exceptions are resolvable without database edits; the full funnel is measured; and no release-blocking security, privacy, compliance or reliability issue remains.
