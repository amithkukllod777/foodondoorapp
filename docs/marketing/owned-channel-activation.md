# Owned-Channel Activation — Ready-to-Send Kit (Week of 16 Jun 2026)

> Owner: CMO Agent ([`../agents/cmo.md`](../agents/cmo.md)). Context: [`../company/master-context.md`](../company/master-context.md).
> Plans: [`campaigns.md`](./campaigns.md) · Calendar: [`content-calendar.md`](./content-calendar.md).
> **This is the execution layer** — copy-paste ready. Greenlit by **D-0005** (owned-channel activation, zero CAC).

**Goal:** Generate revenue THIS WEEK with ₹0 ad spend by activating our already-opted-in audience.
**Why:** WhatsApp Business API (approved templates), Resend email, coupon engine — all live. This needs **no** ad budget, **no** secret rotation, **no** baseline numbers. Highest-ROI move available right now.

---

## Audience segments (already in admin)
| Segment | Source | Use for |
| --- | --- | --- |
| **Recent 30d buyers** | admin WhatsApp segment / orders | Cross-sell / AOV lift (warm) |
| **Inactive 90d+** | admin WhatsApp segment / orders | Winback (email-led; WhatsApp only if opted-in) |
| **WhatsApp subscribers** | `whatsappSubscribers` (Newsletter signup) | Broadcast (opted-in only) |
| **Email list** | Newsletter + customers (minus `emailUnsubscribes`) | Winback + cross-sell |

## Offer ladder (premium-safe — discounts tactical, never the brand)
- New/first order → **`WELCOME5`** (5%).
- AOV lift → cart **milestone**: ₹899 → **`SUPERSAVER10`** (auto), ₹1499 → **`SUPERSAVER12`** (auto) + free shipping over ₹899.
- No deep/blanket discounts — protect "Premium Everyday Nutrition".

---

## 📲 Campaign A — WhatsApp broadcast (template-based)
> Cold broadcast = **approved template only** (free-form text only works inside the 24h window). Use existing approved assets — no re-approval needed.

- **Template:** `nutriwow_promo_banner` (image header + body + "Shop now" button) **or** `nutriwow_bestsellers` (10-card carousel) for a product spotlight.
- **Audience:** WhatsApp subscribers + **Recent 30d** (warm, high quality-rating safety). *Skip cold Inactive-90d on WhatsApp to protect sender quality.*
- **Send window:** **Sat 20 Jun**, ~11:00 or 19:00 IST (aligns to content-calendar promo day). **Cap: 1 promo broadcast/week.**
- **Image (1080²):** "Weekend Summer Snack Box" — combos hero, gold `%OFF` badge, brand palette (green/`nutriorange`), FSSAI mark.
- **Offer in creative:** "Stock up & save — free shipping over ₹899, extra 10% auto-applied." Button → combos collection.
- **Daily limit:** ~2,000/day (admin shows remaining) → batch if list larger; sends process in background.

## 📧 Campaign B — Email (Resend) — 2 sends

### B1 · Winback → *Inactive 90d+ / one-time buyers*
- **Subject (A/B):** "We saved your spot 🌰 (+5% inside)" · *vs* · "Snack stash running low?"
- **Preview:** "Fresh almonds, makhana & combos — back in your cart in 2 taps."
- **Body (premium, short):**
  > Hi {{name}}, your favourites are fresh and ready. Every batch is FSSAI-certified and quality-checked — that's the Nutriwow promise.
  > Here's **5% off** your next order with **WELCOME5**, plus **free shipping over ₹899**.
  > **[ Shop Bestsellers → ]**  *(Roasted & Salted Almonds · Flavoured Makhana · Snack Combos)*
- **CTA:** Shop Bestsellers. **Footer:** unsubscribe link (respect `emailUnsubscribes`).

### B2 · Cross-sell / AOV → *Recent 30d buyers*
- **Subject (A/B):** "Pair your order with these 3 ☑️" · *vs* · "You're ₹{{gap}} away from 10% off"
- **Body:** milestone framing — "Add ₹{{gap}} to unlock **SUPERSAVER10** (10% off)." Recommend 3 complements (Seeds, Makhana, a Combo). CTA → cart/collection.

---

## Send schedule (this week)
| Day | Channel | Campaign | Segment |
| --- | --- | --- | --- |
| Thu 18 Jun | Email | **B1 Winback** | Inactive 90d+ / one-time |
| Sat 20 Jun | WhatsApp | **A Broadcast** (promo) | Subscribers + Recent 30d |
| Sun 21 Jun | Email | **B2 Cross-sell** | Recent 30d buyers |

## KPIs & targets
| Metric | Target |
| --- | --- |
| Email open rate | ≥ 25% (winback often higher) |
| Email CTR | ≥ 3% |
| WhatsApp delivered / read | ≥ 95% delivered · ≥ 55% read |
| WhatsApp CTR | ≥ 5% |
| Recovered/incremental orders | ≥ 2–4% of contacted dormant base |
| Owned-channel ROAS | ∞ (₹0 media cost) |
> Tracking: GA4 (`G-N1EESY3X9F`) UTM tags + Razorpay/COD orders + WhatsApp/email logs.

## Guardrails / compliance
- WhatsApp marketing → **opted-in only**; watch sender quality rating; don't blast cold lists.
- Email → unsubscribe link mandatory; suppress `emailUnsubscribes`.
- Frequency: **max 1 WhatsApp promo/week**; ≤ 2 marketing emails/week. Transactional unlimited.
- Tone = premium/helpful, never "BUY CHEAP NOW".

## How to send (admin)
1. **WhatsApp:** Admin → WhatsApp → **Campaigns** → pick approved template → upload 1080² image → choose segment (or CSV) → Send (background).
2. **Email:** Admin email campaign tool (Resend) → paste B1/B2 → choose segment → schedule/send.
3. Add **UTM tags** to all links (`?utm_source=whatsapp|email&utm_campaign=owned_jun16`) for GA4 attribution.

## Owner input (minimal — to go live)
✅ **APPROVED 16 Jun 2026 — default offer** (`WELCOME5` + milestone `SUPERSAVER10/12`). Final paste-ready assets below.

---

# ✅ Final paste-ready assets (approved 16 Jun, default offer)

> Owner executes the **send** in admin (I can't access the live panel). Just upload the image + paste copy + Send.

## UTM links (already tagged — use as-is)
- **WhatsApp button →** `https://www.nutriwow.in/collections/combos?utm_source=whatsapp&utm_medium=broadcast&utm_campaign=owned_jun16`
- **Email B1 (winback) →** `https://www.nutriwow.in/collections/bestseller?utm_source=email&utm_medium=winback&utm_campaign=owned_jun16`
- **Email B2 (cross-sell) →** `https://www.nutriwow.in/collections/makhana?utm_source=email&utm_medium=crosssell&utm_campaign=owned_jun16`
> 🔲 Confirm exact collection handles in admin (`/collections/combos|makhana|bestseller`) — swap if different.

## 📲 WhatsApp broadcast — `nutriwow_promo_banner`
- **Segment:** WhatsApp subscribers + Recent 30d · **Send:** Sat 20 Jun, ~11:00 or 19:00 IST · **Button URL:** WhatsApp link above.
- **Image brief (1080×1080, the persuasion lives here — template body is approval-locked):**
  - BG off-white; accents brand **green + `nutriorange`** only (no third-party colors).
  - Top headline: **"WEEKEND SUMMER SNACK BOX"**.
  - Hero: appetising combos + assorted nuts/makhana, product **fills the frame** (fit: cover).
  - Gold-shimmer badge: **"EXTRA 10% OFF"** + small **"Free shipping over ₹899"**.
  - Bottom strip: **FSSAI** mark + **nutriwow.in**. Keep text minimal (WhatsApp crops edges).

## 📧 Email B1 — Winback (Inactive 90d+ / one-time buyers)
- **Subject A (primary):** `We saved your spot 🌰 (5% inside)`
- **Subject B (A/B 50/50):** `Your snack stash running low?`
- **Preview:** `Fresh, FSSAI-checked almonds, makhana & combos — 2 taps away.`
- **Body:**
  > Hi {{name}},
  >
  > Good snacking shouldn't be a chore. Your Nutriwow favourites are fresh, **FSSAI-certified** and quality-checked batch by batch — that's our promise.
  >
  > Here's **5% off** your next order with code **`WELCOME5`**, plus **free shipping over ₹899**.
  >
  > **[ Shop Bestsellers → ]**  ← button to Email-B1 UTM link
  > _Roasted & Salted Almonds · Flavoured Makhana · Snack Combos_
  >
  > Stay healthy,
  > **Team Nutriwow**
  >
  > _P.S. Apply `WELCOME5` at checkout._ · _Unsubscribe_

## 📧 Email B2 — Cross-sell / AOV (Recent 30d buyers)
- **Subject A (primary):** `Pair your order with these 3 ☑️`
- **Subject B (A/B 50/50):** `You're a few rupees from 10% off`
- **Preview:** `Add to your box & unlock SUPERSAVER10.`
- **Body:**
  > Hi {{name}},
  >
  > Loved your last order? Round out your healthy week:
  > • **Chia & Flax Seeds** — smoothie/curd boosters
  > • **Flavoured Makhana** — guilt-free evening crunch
  > • **A Snack Combo** — variety for the whole family
  >
  > Spend **₹899 → 10% off auto** (`SUPERSAVER10`); **₹1499 → 12%** (`SUPERSAVER12`). Free shipping over ₹899.
  >
  > **[ Build your box → ]**  ← button to Email-B2 UTM link
  >
  > **Team Nutriwow** · _Unsubscribe_

## Go-live checklist
- [ ] WhatsApp: upload image → Campaigns → `nutriwow_promo_banner` → segment → Send (**Sat 20 Jun**).
- [ ] Email B1 → Inactive 90d+ → Send (**Thu 18 Jun**).
- [ ] Email B2 → Recent 30d → Send (**Sun 21 Jun**).
- [ ] All links carry `utm_campaign=owned_jun16`.
- [ ] +48h: check GA4 (`utm_campaign=owned_jun16`) + orders + WhatsApp/email logs vs targets.
