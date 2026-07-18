# Operations Roadmap

> Context: [`../company/master-context.md`](../company/master-context.md).

Order fulfilment, inventory, shipping aur customer-experience operations.

## In-repo operational hooks (existing)

- **Orders & tracking:** order flow + `TrackOrder.tsx`, `OrderConfirmation.tsx`, admin orders.
- **COD due tracking:** orange = COD-due (semantic colors, `CLAUDE.md`).
- **Abandoned cart:** tracked + admin page (source: `todo.md`).
- **Shipping policy:** `ShippingPolicy.tsx` (live).

## Roadmap (fill with owner)

| Area | Item | Status |
| --- | --- | --- |
| Fulfilment | Courier/3PL integration, AWB & tracking automation | 🔲 |
| Inventory | Stock sync, low-stock alerts, reorder points | 🔲 |
| Packaging | SKU-wise packaging SOP, gifting | 🔲 |
| CX | Returns/refunds SOP, WhatsApp support window | 🔲 |
| SLAs | Dispatch TAT, delivery TAT targets | 🔲 |

🔲 _Current courier partners, warehouse/3PL, daily order volume — owner to provide (not in repo)._
