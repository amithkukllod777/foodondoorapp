# Foodondoor Testing and Release Standard

## Release rule

A release is blocked by any critical security issue, payment or reconciliation mismatch, duplicate/lost order, material overselling, incorrect customer charge, inaccessible grievance route or misleading compliance disclosure.

## Test layers

### Static and unit

- Formatting/linting, type checks and dependency scanning.
- Unit tests for money, tax, pricing, promotions and eligibility rules.
- State-machine and permission tests.
- Serialization and validation tests for APIs/events.

### Integration and contract

- Database and migration tests.
- Payment, refund, courier, notification and search adapters.
- Webhook authentication, replay, idempotency and retry behaviour.
- Outbox/event delivery and dead-letter handling.
- Provider sandbox contract tests.

### End-to-end

- Location → discovery → PDP → cart → checkout → payment → order.
- Split shipment/cart explanation and totals.
- COD eligibility and refusal.
- Cancellation before/after fulfilment thresholds.
- Full/partial refund and return.
- Seller/restaurant acceptance and rejection.
- Pick-pack-dispatch-delivery with proof of delivery.
- Support case and verified review eligibility.

## Critical failure scenarios

- Duplicate payment webhooks.
- Gateway success with delayed/missing webhook.
- Timeout after payment but before order confirmation.
- Concurrent checkout against the final stock unit.
- Reservation expiry during payment.
- Seller or restaurant rejection after payment.
- Courier allocation failure and delivery delay.
- Damaged parcel, unavailable item and partial fulfilment.
- COD refusal and cash reconciliation mismatch.
- Partial refund and settlement adjustment.
- Notification provider outage.
- Search/cache lag after price or stock change.

## Security and privacy

- RBAC and privilege-escalation tests.
- Maker-checker controls for refunds, payouts and sensitive configuration.
- API authentication/authorisation and rate-limit tests.
- Mobile secure-storage, deep-link and exported-component review.
- PII encryption, data export/deletion and log-redaction checks.
- SAST, dependency, secret, container/cloud configuration and penetration testing.
- Consent and marketing-preference enforcement.

## Performance and resilience

- Define peak pilot load plus headroom.
- Load catalogue/search, cart, checkout, order and webhook endpoints.
- Verify database locks, queues and inventory concurrency.
- Test provider timeouts, circuit breakers and retry storms.
- Restore production-like backup into an isolated environment.
- Rehearse application and database rollback.

## Android acceptance

- Supported OS/device matrix.
- Low-memory and low-network behaviour.
- App background/resume during payment and checkout.
- Deep links, notifications and location permission alternatives.
- Upgrade from the currently published app/package.
- Crash-free sessions and startup/critical-screen performance.
- Account deletion and privacy links.

## Operational acceptance

- Catalogue, price, stock, expiry and label-image accuracy.
- Packing/QC, courier handover and proof of delivery.
- Seller/restaurant rejection and SLA escalation.
- Customer-support visibility and compensation permissions.
- Payment, COD, refund and seller-settlement reconciliation.

## Release stages

1. **Development:** automated checks on every change.
2. **Staging/UAT:** production-like configuration and provider sandboxes.
3. **Internal Play track:** team-only validation and upgrade testing.
4. **Closed pilot:** known users, limited pincodes, 100–300 orders.
5. **Staged production:** percentage rollout with explicit rollback thresholds.
6. **Public expansion:** only after economics, repeat and operational gates.

## Minimum release evidence

- Test report and unresolved-defect register.
- Security/privacy review.
- Payment and inventory reconciliation results.
- Backup-restore and rollback evidence.
- Operational dry-run report.
- Play Store listing, Data Safety and account-deletion verification.
- Named go/no-go approvers.
