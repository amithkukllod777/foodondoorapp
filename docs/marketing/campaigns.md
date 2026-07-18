# Campaigns

> Owner: CMO Agent ([`../agents/cmo.md`](../agents/cmo.md)). Context: [`../company/master-context.md`](../company/master-context.md).
> CTO implementation spec: [`../technology/cto-marketing-implementation.md`](../technology/cto-marketing-implementation.md).

## Channel Status

| Channel | Status | Technical Readiness | Notes |
|---------|--------|---------------------|-------|
| D2C (nutriwow.in) | ✅ Live | ✅ Full | Razorpay + PhonePe + COD checkout |
| WhatsApp | ✅ Live | ✅ Full | 12 templates, chatbot, campaigns, order notifications |
| Email | ✅ Live | ✅ Full | Resend + SMTP, campaign builder, tracking (open/click) |
| Performance ads (Meta) | 🔲 TODO | ✅ Ready | FB Pixel + CAPI fully implemented. Missing: domain verification, AEM config (owner action in Meta Business Suite) |
| Performance ads (Google) | 🔲 TODO | ⚠️ Partial | GA4 base tag live. Missing: e-commerce events (`purchase`, `add_to_cart`) — see CTO spec P0 items |
| Amazon | 🔲 Planned | 🔲 | Marketplace expansion — _owner confirm_ |
| Flipkart | 🔲 Planned | 🔲 | Marketplace expansion — _owner confirm_ |
| JioMart | 🔲 Planned | 🔲 | Quick-commerce — _owner confirm_ |
| Blinkit | 🔲 Planned | 🔲 | Quick-commerce — _owner confirm_ |
| Zepto | 🔲 Planned | 🔲 | Quick-commerce — _owner confirm_ |

## Live WhatsApp Marketing (reuse, do not duplicate)

Already built & deployed (source: `WHATSAPP_CAMPAIGNS_HANDOFF.md`, `server/whatsapp.ts`):

| Campaign Type | Template | Format | Admin Access |
|---------------|----------|--------|-------------|
| Product Hero | `nutriwow_product_hero` | 1080×1080 image per product | Admin → WhatsApp Campaigns |
| Bestseller Carousel | `nutriwow_bestsellers` | 10-card swipeable carousel (1125×600) | Admin → WhatsApp Campaigns |
| Product Catalog | Native `product_list` | WhatsApp commerce catalog (ID `3914290288874560`) | Admin → WhatsApp Campaigns |
| Promo Banner | `nutriwow_promo_banner` | Image + CTA button | Admin → WhatsApp Campaigns |
| Abandoned Cart | `abandoned_cart_recovery` | Auto-triggered (45 min idle) | Automatic (cron every 6h) |

### Transactional Messages (automatic)
- Order confirmed → `order_confirm_v2`
- Order shipped → `order_shipped` (with tracking link)
- Order delivered → `order_delivery_update`
- OTP login → `nutriwow_otp` (META AUTHENTICATION template)

## Email Marketing (LIVE)

| Feature | Status |
|---------|--------|
| Campaign builder (admin panel) | ✅ Live — Admin → Email Campaigns |
| AI-generated HTML emails (Claude) | ✅ Live |
| Open tracking (pixel) | ✅ Live |
| Click tracking (redirect) | ✅ Live |
| Unsubscribe handling | ✅ Live |
| Audience: all customers / buyers | ✅ Live |

## Analytics & Tracking

| System | Status | What's Tracked |
|--------|--------|----------------|
| GA4 (`G-N1EESY3X9F`) | ✅ Live | PageView, enhanced measurement |
| Meta Pixel (`1753762272279602`) | ✅ Live | PageView, ViewContent, AddToCart, InitiateCheckout |
| Facebook CAPI (server) | ✅ Live | ViewContent, AddToCart, InitiateCheckout, Purchase (with user hashing + dedup) |
| Firebase Analytics | ✅ Live | Client-side engagement |
| Custom pageViews table | ✅ Live | Path, referrer, country, device — admin analytics dashboard |

### Missing (CTO P0 items)
- GA4 e-commerce events (`purchase`, `add_to_cart`, `view_item`) — needed for Google Ads ROAS
- UTM parameter capture + attribution — needed to attribute revenue to campaigns
- See full spec: [`../technology/cto-marketing-implementation.md`](../technology/cto-marketing-implementation.md)

## SEO Assets

| Asset | Status | URL |
|-------|--------|-----|
| XML Sitemap | ✅ Live | `/sitemap.xml` (products + blogs with real lastmod dates) |
| robots.txt | ✅ Live | `/robots.txt` (blocks admin, API, checkout) |
| Google Shopping feed | ✅ Live | `/feed/google-shopping.xml` |
| Facebook Catalog feed | ✅ Live | `/feed/facebook-catalog.csv` + `.xml` |
| JSON-LD (Organization) | ✅ Live | index.html |
| JSON-LD (Product) | ✅ Live | ProductDetail page (via SEO.tsx) |
| JSON-LD (Article) | ✅ Live | BlogPost page (via SEO.tsx) |
| Blog engine | ✅ Live | `/blog/:slug` with AI cover image generation |
| PWA manifest | ✅ Live | Mobile Add to Home Screen |

### SEO Gaps (CTO P1 items)
- Server-side meta injection for SPA pages (Google bot can't render JS well)
- Product page titles need keyword optimization
- Blog content cadence for high-intent keywords
- See full spec: [`../technology/cto-marketing-implementation.md`](../technology/cto-marketing-implementation.md) §5

## Admin-Configurable Tracking Pixels

All configurable via Admin → Settings without code changes:

| Pixel | Setting Key | Status |
|-------|-------------|--------|
| GTM | `events.gtm` | ✅ Ready |
| Hotjar | `events.hotjar` | ✅ Ready |
| Facebook Pixel (override) | `events.fbpixel` | ✅ Ready |
| Pinterest Tag | `integrations.pinterest_tag_id` | ✅ Ready |
| Microsoft UET (Bing) | `integrations.microsoft_uet_id` | ✅ Ready |
| Snapchat Pixel | `integrations.snapchat_pixel_id` | ✅ Ready |
| Google Site Verification | `general.gscVerification` | ✅ Ready |

## Campaign Roadmap

### Immediate (Owner Action Required)
1. **Verify domain** `www.nutriwow.in` in Meta Business Suite
2. **Configure AEM** (Aggregated Event Measurement) — top 8 events in Events Manager
3. **Set `JWT_SECRET`** in Vercel dashboard (sessions lost on redeploy without it)

### CTO Engineering Queue
See [`../technology/cto-marketing-implementation.md`](../technology/cto-marketing-implementation.md) for full priority matrix.

🔲 Prioritise channels above with owner; set budgets, target ROAS, and launch dates. Tie offers to coupons (server-validated).
