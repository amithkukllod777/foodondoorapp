# Foodondoor Technical Architecture

**Architecture stage:** Modular monolith with event-driven integrations  
**Principle:** One commerce core serving customer, seller, restaurant, delivery and admin surfaces

## 1. Recommended system shape

Start with a modular monolith so core commerce transactions remain understandable and consistent. Split services only when transaction volume, scaling profile or team ownership produces a measurable need.

### Client surfaces

- Android customer app first, retaining `com.foodondoor.app`.
- Responsive customer web/PWA.
- Seller, restaurant and admin web consoles.
- Android delivery-partner app.

### Core modules

| Module | Responsibility |
|---|---|
| Identity | Customer identity, OTP, sessions, staff/seller roles and consent |
| Catalogue | Products, SKUs, variants, media, attributes, sellers and moderation |
| Pricing | Price books, tax inputs, promotions, coupons and fee calculation |
| Serviceability | Pincode/location coverage, fulfilment modes, slots and ETA rules |
| Cart/checkout | Cart partitioning, totals, address, slots and checkout orchestration |
| Orders | Order lifecycle, lines, state machine, cancellations and exceptions |
| Inventory | Location stock, reservation, batches, expiry, FEFO and reconciliation |
| Payments | Gateway abstraction, COD, webhook idempotency, refund and reconciliation |
| Fulfilment | Shipment orchestration, local/courier routing and proof of delivery |
| Returns | Eligibility, reverse logistics, QC, disposition and refund initiation |
| Settlement | Seller earnings, deductions, payout status and statements |
| Support | Cases, timeline, SLAs, templates, escalation and compensation controls |
| Reviews | Verified-order reviews, moderation and seller/product aggregation |
| Analytics | Events, operational metrics, cohorts and financial reporting |
| Audit | Immutable records for sensitive configuration and state changes |

## 2. Core entities

`User`, `Address`, `Consent`, `Seller`, `MerchantLocation`, `Product`, `SKU`, `Batch`, `InventoryLocation`, `InventoryReservation`, `Price`, `Promotion`, `Cart`, `Order`, `OrderLine`, `Shipment`, `DeliveryTask`, `Payment`, `Refund`, `Return`, `Invoice`, `Settlement`, `SupportCase`, `Review`, `AuditEvent`.

## 3. Transaction boundaries

### Checkout

1. Validate serviceability, price and stock.
2. Calculate final totals server-side.
3. Create an expiring inventory reservation.
4. Create payment intent with an idempotency key.
5. Confirm payment through verified webhook or controlled COD acceptance.
6. Create/confirm the order exactly once.
7. Publish order-confirmed events through an outbox.
8. Release reservation on timeout/failure.

### Refund

1. Validate policy and actor permission.
2. Record approved refund against order/payment.
3. Submit idempotent gateway refund.
4. Reconcile webhook/status polling.
5. Update customer, finance, settlement and audit views.

## 4. Data and infrastructure

- Relational transactional database for commerce truth.
- Object storage for product, invoice and compliance media.
- Cache for read-heavy/reference data and bounded session needs.
- Durable queue/event bus for integrations and background work.
- Search index for catalogue discovery.
- Analytics warehouse or managed analytics store separated from OLTP.
- Central secrets manager, structured logs, metrics, traces and alerting.
- Feature flags by city, pincode, category and user cohort.
- Automated backups with scheduled restore drills.

Provider choices remain open until the existing stack audit is complete. Avoid committing to microservices or multiple databases before reuse and operational needs are known.

## 5. API and integration rules

- Version public/mobile APIs.
- Require authenticated webhooks, replay protection and idempotency.
- Use an outbox pattern for events triggered by database transactions.
- Apply timeouts, retries with backoff and circuit breakers to third parties.
- Store provider request/response references without leaking secrets or prohibited PII.
- Make payment, courier and messaging providers replaceable through adapters.

## 6. Security and privacy controls

- Least-privilege RBAC and maker-checker approval for sensitive finance actions.
- Encryption in transit and at rest; protected secret storage.
- PII minimisation, field-level access controls and log redaction.
- Device/session revocation and OTP abuse/rate controls.
- Dependency, SAST, API, mobile-storage and penetration testing.
- Consent and deletion workflows with retention-policy enforcement.
- Immutable audit records for pricing, refunds, settlements and access changes.

## 7. Observability

Minimum day-one dashboards:

- API latency/error rate and mobile crash-free sessions.
- Search success, product views and checkout failures.
- Payment initiation/success/reconciliation variance.
- Inventory reservation, oversell and stock discrepancy.
- Order acceptance, pick-pack, dispatch and on-time delivery.
- Refund, return, cancellation and support-contact reasons.
- Queue lag, webhook failures, backup and restore results.

## 8. Environments and delivery

- Separate development, staging/UAT and production environments.
- Infrastructure/configuration changes reviewed and reproducible.
- Automated unit, integration, contract and end-to-end checks.
- Internal Android track → closed testing → staged production.
- Database migrations must be backward-compatible with rollback plans.
- Production releases use feature flags and defined rollback thresholds.

## 9. Architecture decisions pending

- Audit and reuse decision for the legacy Android/backend code.
- Native Android versus cross-platform client choice.
- Cloud and managed-data provider selection.
- Search, queue, courier, payment and messaging provider selection.
- Seller/admin frontend framework.
- Analytics stack and data-retention schedule.

Each decision must be recorded as an ADR under `docs/adr/`.
