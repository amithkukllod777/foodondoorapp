# CTO → CMO: Marketing Requirements → Technical Implementation

> CTO response to CMO campaign requirements from [`../marketing/campaigns.md`](../marketing/campaigns.md).
> Date: 2026-06-16. Context: [`../company/master-context.md`](../company/master-context.md).

---

## 1. Website Changes Required

### 1.1 Performance Ads Landing Page Support (for Meta/Google campaigns)

CMO needs performance ads (Meta/Google) to drive traffic. Technical requirements:

| Change | File(s) | Status | Detail |
|--------|---------|--------|--------|
| UTM parameter capture & persistence | `client/src/App.tsx`, new `useUtm.ts` hook | 🔲 TODO | Parse `utm_source/medium/campaign/content/term` from URL, store in sessionStorage, pass to checkout for attribution |
| Landing page variants | `client/src/pages/Home.tsx` | 🔲 TODO | Support `?lp=offer` query param to show campaign-specific hero banner (use existing HeroCarousel admin system) |
| Dedicated offer pages | New route `/offers/:slug` | 🔲 TODO | Render coupon-gated landing pages for specific campaigns (e.g. `SUPERSAVER10`) |
| Exit-intent popup | New `ExitIntentPopup.tsx` component | 🔲 TODO | Coupon capture for abandoning visitors (only on first visit, localStorage flag) |
| Product page social proof | `ProductDetail.tsx` | ✅ Done | Reviews + ratings already rendered; JSON-LD Product schema exists |

### 1.2 Conversion Optimization

| Change | File(s) | Status |
|--------|---------|--------|
| Free shipping progress bar in cart | `CartDrawer.tsx` | ✅ Done (PR merged to main) |
| Coupon auto-apply from URL | `CartDrawer.tsx` | 🔲 TODO — read `?coupon=XXX` from URL, auto-fill coupon field |
| Trust badges on checkout | `CartDrawer.tsx` (payment step) | 🔲 TODO — add Razorpay secure badge, FSSAI, SSL icons |
| Sticky "Add to Cart" on mobile | `ProductDetail.tsx` | 🔲 TODO — fixed bottom bar on scroll |
| Recently viewed products | New `useRecentlyViewed.ts` hook + section | 🔲 TODO — localStorage-based, show on Home/ProductDetail |

### 1.3 Marketplace & Quick-Commerce (🔲 Planned)

No website changes needed — these are separate seller portals (Amazon Seller Central, Flipkart Seller Hub, etc.). Technical support needed:

| Task | Status |
|------|--------|
| Product data export (CSV/feed) for marketplace listings | ✅ Done — `/feed/google-shopping.xml`, `/feed/facebook-catalog.csv` exist. Adapt for Amazon/Flipkart format. |
| Inventory sync API | 🔲 TODO — webhook/API to push stock changes to marketplace APIs when `productStock` updates |
| Order import from marketplaces | 🔲 TODO — pull orders from Amazon/Flipkart MWS/API into unified `orders` table |

---

## 2. Tracking Setup

### 2.1 Current State (LIVE)

| Event | Browser Pixel | Server CAPI | Status |
|-------|:---:|:---:|--------|
| PageView | ✅ fbq + gtag | — | Auto-fires on every page |
| ViewContent | ✅ fbq via hook | ✅ tRPC `capi.trackEvent` | Fires on ProductDetail load |
| AddToCart | ✅ fbq via hook | ✅ tRPC `capi.trackEvent` | Fires in CartDrawer on add |
| InitiateCheckout | ✅ fbq via hook | ✅ tRPC `capi.trackEvent` | Fires on checkout step entry |
| Purchase | — | ✅ Server-side only | Fires on Razorpay/PhonePe webhook confirm |

### 2.2 Missing Tracking (TODO)

| Event | Where | Priority | Implementation |
|-------|-------|----------|----------------|
| `Search` | Live search component | P1 | Add `fbq('track', 'Search', {search_string})` + CAPI call on search submit |
| `Lead` | Newsletter subscribe, WhatsApp subscribe | P2 | `fbq('track', 'Lead')` on successful subscription |
| `CompleteRegistration` | OTP verify success | P2 | `fbq('track', 'CompleteRegistration')` after first login |
| `AddPaymentInfo` | Checkout payment step | P3 | `fbq('track', 'AddPaymentInfo')` when user selects payment method |
| UTM → Purchase attribution | Checkout flow | P1 | Pass UTM params from sessionStorage to order creation, store in `orders` table |
| `gtag('event', 'purchase')` | Post-payment confirmation page | P1 | GA4 purchase event with `transaction_id`, `value`, `items[]` for Google Ads |
| `gtag('event', 'add_to_cart')` | CartDrawer | P2 | GA4 standard e-commerce event |
| Scroll depth | Home, ProductDetail, Blog | P3 | GTM trigger or custom Intersection Observer |

### 2.3 Event Deduplication

Already implemented: same `event_id` (UUID) sent to both browser pixel (`fbq`) and server CAPI. Location: `client/src/hooks/useFacebookCapi.ts`.

---

## 3. GA4 / GTM / Meta Pixel Checklist

### GA4 (Tag ID: `G-N1EESY3X9F`)

| Item | Status | Action |
|------|--------|--------|
| Base tag in index.html | ✅ | Lines 8-15 of `client/index.html` |
| Enhanced measurement (scroll, outbound clicks) | ✅ | Auto-enabled in GA4 property |
| E-commerce events: `view_item` | 🔲 | Add `gtag('event', 'view_item', {...})` on ProductDetail |
| E-commerce events: `add_to_cart` | 🔲 | Add `gtag('event', 'add_to_cart', {...})` in CartDrawer |
| E-commerce events: `begin_checkout` | 🔲 | Add `gtag('event', 'begin_checkout', {...})` on checkout start |
| E-commerce events: `purchase` | 🔲 | Add `gtag('event', 'purchase', {...})` on confirmation page |
| User ID tracking | 🔲 | `gtag('config', 'G-N1EESY3X9F', {user_id: customerId})` on login |
| Search term tracking | 🔲 | `gtag('event', 'search', {search_term})` on search |
| Custom dimensions: payment_method, coupon_code | 🔲 | Pass as event params on purchase |

### GTM (Dynamic — Admin Settings)

| Item | Status | Action |
|------|--------|--------|
| GTM container support | ✅ | `SEO.tsx` loads GTM dynamically from `storeSettings.events.gtm` |
| GTM noscript iframe | 🔲 | Add `<noscript><iframe>` to body for GTM (currently only `<script>` head tag) |
| DataLayer push for e-commerce | 🔲 | Push `dataLayer.push({event: 'purchase', ecommerce: {...}})` for GTM-based tags |

### Meta Pixel (ID: `1753762272279602`)

| Item | Status | Action |
|------|--------|--------|
| Base pixel + PageView | ✅ | `client/index.html` lines 17-29 + noscript fallback |
| ViewContent | ✅ | `useFacebookCapi.ts` → ProductDetail |
| AddToCart | ✅ | `useFacebookCapi.ts` → CartDrawer |
| InitiateCheckout | ✅ | `useFacebookCapi.ts` → CartDrawer |
| Purchase (server CAPI) | ✅ | `server/facebookCapi.ts` → payment webhooks |
| Search event | 🔲 | Add to search component |
| Lead event | 🔲 | Add to newsletter/WhatsApp subscribe |
| Custom audiences (website visitors) | ✅ | Auto-created by pixel |
| Conversion API (CAPI) | ✅ | Full implementation with user data hashing + dedup |
| Domain verification | 🔲 | Verify `www.nutriwow.in` in Meta Business Suite (owner action) |
| Aggregated Event Measurement (AEM) | 🔲 | Configure top 8 events in Events Manager (owner action) |

### Additional Pixels (Admin-Configurable)

Already supported via `SEO.tsx` MarketingPixels component:

| Pixel | Admin Setting Key | Status |
|-------|-------------------|--------|
| Hotjar | `events.hotjar` | ✅ Ready — enter ID in Admin → Settings → Events |
| Pinterest Tag | `integrations.pinterest_tag_id` | ✅ Ready |
| Microsoft UET (Bing) | `integrations.microsoft_uet_id` | ✅ Ready |
| Snapchat Pixel | `integrations.snapchat_pixel_id` | ✅ Ready |
| Google Site Verification | `general.gscVerification` | ✅ Ready |

---

## 4. WhatsApp Automation Plan

### 4.1 Current Automations (LIVE — do NOT rebuild)

| Flow | Template | Trigger | Status |
|------|----------|---------|--------|
| Order Confirmed | `order_confirm_v2` / `order_confirmation_img` | Order placed | ✅ Live |
| Order Shipped | `order_shipped` | AWB assigned | ✅ Live |
| Order Delivered | `order_delivery_update` | Delivery confirmed | ✅ Live |
| Abandoned Cart Recovery | `abandoned_cart_recovery` | Cart idle > 45 min (cron) | ✅ Live |
| OTP Login | `nutriwow_otp` (AUTHENTICATION) | Customer login | ✅ Live |
| Chatbot Menu | `chatbot_welcome` | Greeting keyword | ✅ Live |
| Auto Track Order | `chatbot_track_order` | "track"/"status" keyword | ✅ Live |
| Product Hero Campaign | `nutriwow_product_hero` | Admin-triggered | ✅ Live |
| Bestseller Carousel | `nutriwow_bestsellers` | Admin-triggered | ✅ Live |
| Product Catalog | WhatsApp native `product_list` | Admin-triggered | ✅ Live |

### 4.2 New Automations (TODO — CMO priorities)

| Flow | Template Needed | Trigger | Priority | Technical Work |
|------|----------------|---------|----------|----------------|
| **Post-Purchase Review Request** | `review_request` | 3 days after delivery | P1 | New cron job: query delivered orders, send review link template. Need Meta template approval. |
| **Repeat Purchase Nudge** | `reorder_reminder` | 30 days after last order | P1 | New cron job: query customers with last order 25-35 days ago, send personalized product suggestions. |
| **Birthday/Anniversary Offer** | `birthday_offer` | Customer birthday | P3 | Need `birthday` column on `customerProfiles`. Cron checks daily. |
| **Back-in-Stock Alert** | `back_in_stock` | Stock replenished | P2 | `stockAlerts` table already exists. Trigger on stock update when stock goes from 0→N. |
| **Win-back Campaign** | `winback_offer` | 60+ days since last order | P2 | Cron job: identify lapsed customers, send discount template. |
| **COD to Prepaid Conversion** | `cod_prepaid_switch` | COD order placed | P2 | Send prepaid payment link within 30 min of COD order to convert. |

### 4.3 Segmentation Engine (TODO)

Current state: campaigns target "all customers" or manual CSV upload.

Needed segments for CMO:

| Segment | Query Logic | Use Case |
|---------|-------------|----------|
| High-value (top 20% by spend) | `SUM(orders.total) > threshold GROUP BY phone` | VIP offers, early access |
| Repeat buyers (2+ orders) | `COUNT(orders) >= 2 GROUP BY phone` | Loyalty rewards |
| Lapsed (no order 60+ days) | `MAX(orders.createdAt) < NOW() - 60 days` | Win-back campaigns |
| COD-heavy | `>50% orders are COD` | Prepaid incentive nudges |
| Category affinity | `orders.items JSON contains category X` | Cross-sell campaigns |
| New customers (first order < 7 days) | `MIN(orders.createdAt) > NOW() - 7 days` | Welcome series |

Implementation: Add `whatsapp.getSegmentedContacts` tRPC procedure that accepts segment type and returns phone list. Feed into existing campaign system.

### 4.4 WhatsApp Business Constraints

- **Template approval:** 24-48h review by Meta. Submit templates via Meta Business Manager.
- **24h service window:** Free-form messages only within 24h of customer's last message. Outside = template-only.
- **Rate limits:** New WABA starts at 250 messages/day, scales to 1K → 10K → 100K based on quality.
- **Phone number:** `+91 99938 83710` (ID: `1110962362096644`). **DO NOT delete or modify.**

---

## 5. SEO Technical Fixes

### 5.1 Currently Implemented (✅)

| Feature | Location | Status |
|---------|----------|--------|
| Dynamic `<title>` + `<meta description>` per page | `SEO.tsx` component | ✅ |
| Open Graph tags (Facebook sharing) | `SEO.tsx` + `index.html` | ✅ |
| Twitter Card meta | `index.html` | ✅ |
| Canonical URLs | `SEO.tsx` (dynamic) + `index.html` (home) | ✅ |
| JSON-LD: Organization | `index.html` (lines 53-82) | ✅ |
| JSON-LD: Product schema | `SEO.tsx buildProductJsonLd()` | ✅ |
| JSON-LD: Article schema | `SEO.tsx buildArticleJsonLd()` | ✅ |
| JSON-LD: Breadcrumb | `SEO.tsx buildBreadcrumbJsonLd()` | ✅ |
| XML Sitemap with lastmod | `server/_core/index.ts` GET `/sitemap.xml` | ✅ |
| robots.txt | `server/_core/index.ts` GET `/robots.txt` | ✅ |
| Google Shopping feed | `server/_core/index.ts` GET `/feed/google-shopping.xml` | ✅ |
| Facebook Catalog feed | `server/_core/index.ts` GET `/feed/facebook-catalog.csv` + `.xml` | ✅ |
| Blog engine with slugs | `Blog.tsx`, `BlogPost.tsx` | ✅ |
| DNS prefetch + preconnect | `index.html` | ✅ |
| PWA manifest | `client/public/manifest.json` | ✅ |
| Non-blocking font loading | `index.html` (media=print→onload) | ✅ |
| Google Site Verification meta | `SEO.tsx` (from admin settings) | ✅ |

### 5.2 Technical Fixes Needed

| Fix | Priority | File(s) | Detail |
|-----|----------|---------|--------|
| **SPA → SSR for critical pages** | P1 | `server/_core/index.ts` | Google renders JS SPAs poorly. Server-render `<title>`, `<meta>`, JSON-LD for product/category/blog pages at the Express level (inject into HTML template). |
| **Product page SEO optimization** | P1 | `ProductDetail.tsx`, `SEO.tsx` | Ensure unique `<title>` = `{ProductName} - Buy Online | Nutriwow`, `<meta description>` = first 155 chars of product description. Currently uses generic format. |
| **Category page titles** | P1 | `CategoryPage.tsx` | Dynamic `<title>` = `Buy {Category} Online - Premium {Category} | Nutriwow` |
| **Blog post SEO** | P1 | `BlogPost.tsx` | Ensure `<title>` includes primary keyword, meta description = excerpt, canonical = `/blog/{slug}` |
| **FAQ schema on product pages** | P2 | `ProductDetail.tsx` | Add `FAQPage` JSON-LD from product description accordion sections |
| **Image alt text** | P2 | `ProductCard.tsx`, `ProductDetail.tsx` | Ensure all product images have descriptive alt = `{productName} - {weight} - Nutriwow` |
| **Internal linking** | P2 | `ProductDetail.tsx` | "Related products" section already exists. Add "Also in {category}" links. Combos should link to individual SKUs. |
| **Sitemap: add blog categories** | P3 | `server/_core/index.ts` | Add `/blog?category=X` URLs to sitemap |
| **Hreflang for Hindi** | P3 | `SEO.tsx` | If Hindi content is planned, add `<link rel="alternate" hreflang="hi">` |
| **Core Web Vitals** | P2 | Various | LCP: hero carousel first image preloaded ✅. CLS: set explicit dimensions on all images ✅ (ProductCard). FID: lazy Sentry ✅. INP: review event handlers. |

### 5.3 SSR Strategy for SEO (Recommended)

Since the app is an SPA, Google bot may not render JS reliably. Two approaches:

**Option A: Express-level meta injection (Recommended — minimal change)**
- In `server/_core/serveStatic.ts` SPA fallback, detect product/blog/category routes
- Fetch product/blog data from DB
- Inject `<title>`, `<meta>`, JSON-LD into the HTML template before sending
- No React SSR needed — just string replacement in the HTML shell

**Option B: Full SSR migration to Next.js**
- Major rewrite. Not recommended at current scale. Evaluate at ₹10Cr+ GMV.

---

## Implementation Priority Matrix

| Priority | Item | Effort | Business Impact |
|----------|------|--------|-----------------|
| P0 | GA4 e-commerce events (purchase, add_to_cart) | 1 day | Enables Google Ads ROAS tracking |
| P0 | UTM capture + attribution | 1 day | Attributes revenue to campaigns |
| P1 | Server-side meta injection for SEO | 2 days | Critical for organic search rankings |
| P1 | Post-purchase review request automation | 1 day | Drives social proof + UGC |
| P1 | Repeat purchase nudge automation | 1 day | Revenue from existing customers |
| P2 | Search + Lead pixel events | 0.5 day | Better Meta audience building |
| P2 | Customer segmentation engine | 2 days | Higher campaign ROAS |
| P2 | Back-in-stock WhatsApp alerts | 1 day | Converts waiting demand |
| P3 | Landing page variants + exit-intent | 2 days | Better campaign landing experience |
| P3 | FAQ schema on product pages | 0.5 day | Rich snippets in SERP |
