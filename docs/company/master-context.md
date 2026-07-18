# Master Context — Nutriwow

> ⭐ **Ye sabse important file hai. HAR agent (CEO / CMO / CTO) apna kaam shuru karne se pehle sabse pehle yahi file padhega.** Baaki docs isi context ko extend karte hain.

> 🔲 jahan likha hai wahan **owner input chahiye** — abhi placeholder hai, ise verify/fill karein.

---

## 1. Foodondoor Pvt Ltd — Overview

- **Legal entity:** Foodondoor Pvt Ltd (Nutriwow brand ki parent company)
- **Brand:** Nutriwow — premium dry fruits, nuts & healthy snacks
- **Website:** https://www.nutriwow.in (canonical, `www` mandatory)
- 🔲 **Registration / CIN:** _TODO (owner)_
- 🔲 **Registered address / GSTIN:** _TODO (owner)_
- 🔲 **Founded:** _TODO (owner)_
- 🔲 **Other brands / verticals under Foodondoor (agar hain):** _TODO (owner)_

## 2. Nutriwow — Vision

- **Mission (working):** Premium, fresh aur honestly-priced dry fruits & healthy snacks har Indian ghar tak pahunchana — direct-to-consumer, bina middleman ke.
- **Positioning:** "Premium" quality at fair price; combos aur health-focused snacking (makhana, seeds) ke through repeat purchase.
- 🔲 **Official vision/mission statement (owner ke shabdon me):** _TODO (owner) — confirm/replace above._
- 🔲 **3–5 saal ka long-term vision:** _TODO (owner)_

## 3. Products

51 products, 7 categories me. (Source: `scripts/seed-products.mjs`)

| Category | Products | Examples |
| --- | :---: | --- |
| Combos | 18 | Nuts & dry-fruit combo packs (almonds + cashews + raisins, etc.) |
| Nuts | 11 | Almonds (Badam), Cashews (Kaju), Pistachios (Pista) — whole & roasted-salted |
| Seeds | 9 | Chia seeds, Flax seeds (Alsi) |
| Makhana | 5 | Flavored fox-nuts (Peri Peri, Tangy Tomato, Himalaya Salt, Pudina Lemon) |
| Berries | 4 | Green Raisins (Kishmish), Apricots |
| Dates | 3 | Omani Dates, Kalmi Dates (Khajur) |
| Snacks | 1 | Misc snack |

**Pricing model:** Base price DB me **paise** me store hoti hai. Har product 3 weight variants offer karta hai — multipliers `[1, 1.85, 3.5]` (`shared/pricing.ts`, client+server dono validate karte hain anti-tampering ke liye).

🔲 **Hero / bestseller SKUs aur margins:** _TODO (owner)_ — currently `isBestseller` flag se top products mark hote hain (e.g. Premium Nuts & Dry Fruits Combo 600g, Roasted & Salted Almonds 400g).

## 4. Target Customers

- **Primary (working assumption):** 25–45 age, urban/semi-urban India, health-conscious; gifting (festive/corporate) aur daily snacking dono.
- **Channels:** Direct via nutriwow.in (D2C). 🔲 _Marketplaces (Amazon/Flipkart) — owner confirm._
- 🔲 **Verified customer personas, top cities, repeat-rate:** _TODO (owner / analytics)_

## 5. Revenue Goals

🔲 **_TODO (owner) — numbers fill karein. Invent nahi kiye._**

| Metric | Current | Target | Timeline |
| --- | --- | --- | --- |
| Monthly revenue (GMV) | 🔲 | 🔲 | 🔲 |
| Avg order value (AOV) | 🔲 | 🔲 | 🔲 |
| Orders / month | 🔲 | 🔲 | 🔲 |
| Repeat purchase rate | 🔲 | 🔲 | 🔲 |

> Detail aur breakdown: [`business-goals.md`](./business-goals.md)

## 6. Current Status

- **Live:** https://www.nutriwow.in production me chal raha hai (Vercel).
- **Infra:** 100% independent — owner ki apni TiDB Cloud DB + Vercel Blob media. Koi third-party platform dependency nahi.
- **Tech:** Vite + React 19 SPA + Express + tRPC v11 + Drizzle ORM (MySQL/TiDB). Detail: [`../technology/system-architecture.md`](../technology/system-architecture.md)
- **Payments:** Razorpay (live) + COD active; PhonePe toggleable (admin Settings).
- **Auth:** Mobile + WhatsApp OTP (Meta template `nutriwow_otp`), JWT session.
- **Design:** "Clay 3D on original palette" (green primary, orange CTAs) — June 2026 redesign live.
- 🔲 **Business KPIs (current traffic, sales, conversion):** _TODO (owner / GA4 `G-N1EESY3X9F`)_

## 7. Team Structure

🔲 **_TODO (owner) — actual team fill karein._**

| Role | Person | Responsibility |
| --- | --- | --- |
| Founder / Owner | 🔲 | Overall business |
| Operations | 🔲 | Inventory, fulfilment, shipping |
| Marketing | 🔲 | Campaigns, content, social |
| Tech | 🔲 | Website, infra (currently AI-assisted) |

**AI Command Center agents** (alag se, repo me): CEO / CMO / CTO agents — scopes [`../agents/`](../agents/) me defined hain.

---

## 8. Mission

Premium-quality dry fruits, nuts & healthy snacks ko fair price par, fresh aur honestly, direct Indian consumers tak pahunchana — apni independent infra par.

🔲 _Owner ka official mission statement (verbatim): TODO._

## 9. Competitor List

Indian premium dry-fruit / healthy-snack D2C space (🔲 _owner confirm & prioritise — ye starting reference list hai, repo me confirmed nahi_):

- Happilo
- Farmley
- Nutty Gritties
- True Elements
- Wonderland Foods
- Urban Platter
- The Whole Truth / Open Secret (snacking adjacency)
- Tata-backed ranges (note: WhatsApp catalog Tata `3914290288874560` use hota hai)

🔲 Per-competitor: pricing, positioning, channels — owner/market research.

## 10. Current Technology Stack

- **Frontend:** Vite 7 + React 19 SPA, Tailwind v4 (CSS-first), shadcn/ui (admin).
- **Backend:** Express + tRPC v11; shared logic in `shared/`.
- **DB/ORM:** Drizzle ORM + `mysql2` → **TiDB Cloud Serverless (MySQL)**, 22 tables.
- **Hosting:** Vercel single serverless function; `main` → prod auto-deploy.
- **Media:** Vercel Blob + Vercel Image Optimization.
- **Payments:** Razorpay (live), COD, PhonePe (toggle).
- **Messaging/Auth:** Meta WhatsApp (OTP `nutriwow_otp` + campaigns), JWT.
- **Analytics:** GA4 `G-N1EESY3X9F` + Facebook CAPI.

Detail: [`../technology/system-architecture.md`](../technology/system-architecture.md), [`../technology/infrastructure.md`](../technology/infrastructure.md).

## 11. Current Challenges

- **Admin login** abhi client-side password hai (known weakness, `CLAUDE.md` / `AUDIT_STATUS.md`) — hardening pending.
- **Tests/CI** coverage badhana (automated checks on PRs).
- **Preview deploys** me `DATABASE_URL` nahi hota → products preview pe render nahi hote.
- **Scalability** — traffic badhne par DB pooling/caching review.
- 🔲 **Business challenges** (CAC, margins, fulfilment, competition): owner to add.

## 12. Company Roadmap

| Horizon | Focus |
| --- | --- |
| Now | Stabilise D2C; security hardening; WhatsApp marketing (live) |
| Next | Marketplace + quick-commerce expansion (Amazon/Flipkart/JioMart/Blinkit/Zepto — 🔲 planned); SEO + content engine |
| Later | Subscriptions/retention; scale infra; broaden catalog |

Detail: business → [`business-goals.md`](./business-goals.md); marketing → [`../marketing/campaigns.md`](../marketing/campaigns.md); tech → [`../technology/roadmap.md`](../technology/roadmap.md); ops → [`../operations/operations-roadmap.md`](../operations/operations-roadmap.md).

---

### Agents ke liye note
- Ye file **source of truth** hai company context ka. Kuch bhi assume karne se pehle yahan check karo.
- 🔲 placeholders ko owner ke confirmed data se replace karte raho.
- Business facts change hon to **yahi file pehle** update karo, phir dependent docs.
