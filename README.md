# Foodondoor

Foodondoor is being relaunched from a restaurant-delivery application into a controlled hybrid commerce platform for restaurant food, grocery, nutrition, packaged products and daily essentials.

## Product identity

- **Customer product:** Foodondoor: Shopping & Delivery
- **Android package:** `com.foodondoor.app`
- **Consumer promise:** Shopping, delivered your way.
- **Local pilot:** Bhopal–Sehore
- **National scope:** Courier-compatible packaged products
- **Delivery labels:** Express, Same Day, Next Day or Standard

Foodondoor will not claim universal 10-minute delivery. Assortment, geography and infrastructure will expand only after repeat purchase, service quality and contribution-margin gates are met.

## Documentation

| Document | Purpose |
|---|---|
| [Master Relaunch Roadmap](docs/MASTER_RELAUNCH_ROADMAP.md) | Complete business, product, operations, compliance and scaling plan |
| [Product Requirements](docs/PRODUCT_REQUIREMENTS.md) | MVP scope, users, journeys, functional rules, KPIs and definition of done |
| [Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md) | System shape, modules, entities, transaction controls, security and delivery |
| [First 90-Day Plan](docs/90_DAY_EXECUTION_PLAN.md) | Controlled execution plan from access audit through closed pilot |
| [Testing and Release Standard](docs/TESTING_AND_RELEASE.md) | Test coverage, launch blockers, operational acceptance and staged rollout |

## Delivery strategy

The first implementation stage is an evidence and control phase:

1. Verify Play Console, signing, source code, backend, domain and data ownership.
2. Measure active/reachable legacy users separately from lifetime downloads.
3. Approve pilot pincodes, assortment and fulfilment modes.
4. Audit the existing code before choosing reuse or rebuild.
5. Approve the PRD, UX prototype, architecture and KPI schema.
6. Build and validate a closed pilot before public relaunch.

## Architecture direction

Use a well-structured modular monolith with event-driven integrations. Customer, seller, restaurant, partner and admin surfaces must share one commerce core. Payment/order idempotency, inventory reservation, auditability, reconciliation, access control, backups and observability are release requirements—not later enhancements.

## Current status

This repository is in the planning and foundation stage. Application code should not be accepted until the P0 ownership/access audit and legacy-code reuse decision are complete.
