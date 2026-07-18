# WhatsApp Campaigns — Handoff (2026-06-14)

Status of the WhatsApp marketing work so the next developer can continue. All code is
on `main` and deployed to production (Vercel). Nothing is uncommitted.

## Relevant commits (all on main, live)
- `12a604a` — Refresh Status imports Meta templates into local DB; carousel send fix; admin auto-process poll
- `c0e4f1c` — carousel cards: 1080² images + bold name/offer + MRP strikethrough/discount
- `b141a4b` — product campaigns send big single-image **heroes** (one per product)
- `88f2449` — admin **Hero/Carousel format toggle** (Campaigns → Product Cards → Format)

## What works (LIVE)
- **OTP** via WhatsApp (`nutriwow_otp` template), rate-limited, DB-backed.
- **Hero product campaign** — each selected product → one big single-image message
  (`nutriwow_product_hero` template): full 1080² image + bold name + MRP strikethrough +
  discount% + "Shop now" → product page. `sendProductCampaignMessage` in `server/whatsapp.ts`.
- **Carousel toggle** — `nutriwow_bestsellers` 10-card carousel; admin can pick Hero vs Carousel.
- **Catalog toggle** — admin Product Cards now includes `Catalog (Tata)`, which sends a native
  WhatsApp `interactive.type:"product_list"` using catalog `3914290288874560` and selected
  product IDs as `product_retailer_id`. This gives live price + View/cart cards, but only inside
  the 24h customer-service window until an approved MARKETING MPM template exists.
- **Banner** — `nutriwow_promo_banner` (image header + Shop now).
- Admin: WhatsApp → Templates → **Refresh Status** imports approved Meta templates into the
  `whatsappTemplates` DB so they're selectable. Campaigns auto-process via UI poll.

## Meta assets
- WABA `718666704638313`, phone `1110962362096644` (+91 99938 83710), app "Nutriwow" (`27302875302656435`).
- System user "Nutriwow API" (`122108761827306151`); permanent token in Vercel env `WHATSAPP_TOKEN`
  (scopes: whatsapp_business_management, whatsapp_business_messaging, manage_app_solution,
  whatsapp_business_manage_events — **no catalog_management**).
- Approved templates: `nutriwow_otp`, `nutriwow_promo_banner`, `nutriwow_product_carousel`,
  `nutriwow_bestsellers` (square-locked carousel), `nutriwow_product_hero`.

## Meta Commerce CATALOG (the Tata-style "price + View + cart" format) — WORKS
- WhatsApp **commerce is already enabled** on the phone (`is_cart_enabled:true, is_catalog_visible:true`).
- **catalog_id `3914290288874560`** ("Catalog_products"); product **retailer_id == the store product `id`**
  (e.g. 51, 49, 48 — no SKU prefix). Product **Set id** `1467808808427709` (not needed for sends).
- Sending catalog interactive messages needs only `whatsapp_business_messaging`:
  - **SPM**: `interactive.type:"product"`, `action.catalog_id` + `action.product_retailer_id`.
  - **MPM**: `interactive.type:"product_list"`, `action.catalog_id` + `sections[].product_items[].product_retailer_id`.
  - Both delivered correctly to the test number (big image + LIVE ₹ price + View/Add-to-cart).
- **CAVEAT:** free-form interactive SPM/MPM only deliver INSIDE the 24h customer-service window.
  For cold broadcasts you must create + get approval for a MARKETING **MPM template** (button type `MPM`)
  — NOT yet created. To READ the catalog programmatically (list products/prices) you need
  `catalog_management` scope, which isn't offered in the app's token flow (no catalog use case on the app);
  the system user already has "Manage" on the catalog asset, so adding a catalog use case to the app +
  regenerating the token would unlock reads. Sending does NOT need it.

## OPEN ISSUE (owner not satisfied) — "carousel full size like Tata"
The owner wants the **carousel** cards as BIG as Tata Nutrikorner's. Findings:
- A 5-agent research pass concluded WhatsApp **carousel template cards are a fixed small ~1.91:1
  rail** and cannot be enlarged via any setting; Tata's big "price + View" cards are **catalog
  SPM/MPM**, not carousel templates; Tata's big hero banners are single-image templates.
- BUT the owner's Tata screenshots show swipeable cards that look ~square and big, so this is
  contested. The most likely truth: WhatsApp crops carousel card images to its frame; the lever is
  the uploaded image. Earlier attempts used `fit:contain`/`trim` (white margins → product looked small).
  The **last attempt used `fit:"cover"` (product FILLS the square, no margins)** to `nutriwow_bestsellers`
  — owner stopped before confirming.
- Suggested next step to END the guessing: send ONE **labeled diagnostic image** (1080² with edge
  labels + nested aspect-ratio boxes) as a carousel card, screenshot it, and measure exactly how
  WhatsApp crops/sizes the card — then build images to that exact frame. Alternatively, standardize on
  **catalog SPM/MPM** (which is the real Tata "price + View + cart" format and already works).

## Recommended path for the next dev
1. Decide: catalog MPM (Tata-exact, needs an MPM marketing template for broadcast) vs. keep hero+carousel.
2. If catalog: the free-form `Catalog (Tata)` admin format is now wired for warm/inbound users.
   For cold broadcast, create a MARKETING `MPM` template (button type `MPM`, header text + body + footer)
   and send via template with catalog_id + product sections.
3. If carousel size is the goal: run the diagnostic-image measurement first; do not keep blind-iterating.

## Operational TODO (owner-side, still pending)
- Set `WHATSAPP_APP_SECRET` in Vercel (webhook signature verification — currently skipped).
- WhatsApp webhook: Callback URL `https://www.nutriwow.in/api/whatsapp/webhook`, verify token
  `nutriwow_wa_verify`; subscribe to the `messages` field; publish the app for production delivery.
- (Optional) `WHATSAPP_CATALOG_ID=3914290288874560` env if catalog sends get wired in.
