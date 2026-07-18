# FEATURE_INVENTORY.md

**Application:** Nutriwow — premium dry-fruits & healthy-snacks D2C e-commerce
**Live:** https://www.nutriwow.in · **Audit date:** 2026-07-14
**Method:** Static source review (read-only). Runtime behaviour marked NOT TESTED where a live/staging environment or credentials were unavailable.

## Platforms & stack

| Platform | Stack | Evidence |
|---|---|---|
| Web storefront + Admin | Vite + React 19 SPA (wouter), Tailwind v4 | `client/src/App.tsx`, `client/src/index.css` |
| API server | Express + tRPC v11, superjson | `server/routers.ts` (~3860 lines), `server/_core/index.ts` |
| Database | Drizzle ORM on TiDB Cloud (MySQL-compatible) | `server/db.ts`, `drizzle.config.ts` |
| Mobile (Android/iOS) | Flutter app (`flutter_app/`), customer-only | `flutter_app/lib/*` |
| Mobile (legacy) | Capacitor Android wrapper `in.nutriwow.app` | `android/`, `capacitor.config.ts` |
| Hosting | Vercel single serverless function | `vercel.json`, `api/index.ts`, `DEPLOY_VERCEL.md` |

DB tables: **31 table exports** in `drizzle/schema.ts` (CLAUDE.md's "22 tables" is outdated — documentation drift, see BUG_REPORT NW-DOC-01).

## User roles

| Role | Auth | Scope |
|---|---|---|
| Guest | none | Browse/search/filter, product detail, local cart, validate coupon, pincode check, read reviews/blog, newsletter/back-in-stock signup, analytics/CAPI events |
| Customer | Mobile + WhatsApp OTP → HMAC httpOnly cookie | + place/confirm orders, pay (Razorpay/COD/PhonePe), order history & tracking, GST invoice, addresses, profile, write reviews, wishlist, loyalty balance, referral, subscriptions |
| Admin | email+password or legacy shared password → signed admin cookie | Full CRUD + operations (see admin modules). Roles `owner/admin/manager` stored but **not enforced per-endpoint** (all use one `adminProcedure`) — see BUG_REPORT NW-AUTHZ-01 |

## Feature inventory

Legend — Impl: ✅ Implemented · ◑ Partial · ✖ Missing · Test: Auto / Manual / None · Risk: H/M/L

### Storefront (customer-facing)

| Module | Feature | Role | Impl | Test | Docs | Risk |
|---|---|---|---|---|---|---|
| Catalog | Product list / bestsellers / trending / by-category / search / recommendations / FBT | Guest | ✅ | Auto (homepage.test) | CLAUDE.md | L |
| Product | Detail, gallery, variants (weight multipliers), stock, pincode ETA | Guest | ✅ | None | Partial | M |
| Product | Admin-editable detail fields (highlights, nutrition, ingredients, shelf-life, storage, origin, processing) | Guest | ✅ | None | None | L |
| Cart | Local cart (CartContext, localStorage) | Guest | ✅ | None | CLAUDE.md | L |
| Checkout | 3-step drawer (cart+coupon → address → payment) | Customer | ✅ | None | CLAUDE.md | **H** |
| Coupons | Validate + apply; server re-validates at placeOrder | Guest/Customer | ✅ | None | None | M |
| Payments | Razorpay (live), COD, PhonePe (toggleable) | Customer | ✅ | Partial (phonepe.test = cred check only) | CLAUDE.md | **H** |
| Orders | Place, confirm (gateway-verified), history, GST invoice (5% GST, HSN, CGST/SGST/IGST) | Customer | ✅ | None | None | **H** |
| Tracking | Order tracking, AWB/shipment status | Customer | ✅ | None | None | M |
| Reviews | Read (approved), write (auto verified-purchase), image upload, helpful | Guest/Customer | ✅ | None | None | M |
| Wishlist | Toggle, list, server merge on login | Customer | ✅ | None | None | L |
| Profile | Name/email edit, address book (add/update/delete) | Customer | ✅ | None | None | M |
| Loyalty | Earn (₹1=1pt on delivery), balance, history | Customer | ◑ | None | None | M |
| Loyalty | **Redemption** | Customer | ✖ | None | None | M |
| Referral | Code, stats, redeem, validate | Customer | ✅ | None | None | L |
| Subscriptions | Subscribe & Save (15/30/60/90 days) | Customer | ✅ | None | None | M |
| Newsletter | WhatsApp + email subscribe, welcome coupon | Guest | ✅ | None | None | L |
| Stock alerts | Back-in-stock subscribe + auto-notify | Guest | ✅ | None | None | L |
| Blog | List, post, AI-assisted authoring (admin) | Guest/Admin | ✅ | Auto (blog.test = cred) | None | L |
| SEO | JSON-LD, sitemap, partial SSR for crawlers | — | ✅ | None | CLAUDE.md | L |
| Legal | Privacy, Terms, Refund, Return, Shipping, Cookie banner | Guest | ✅ | None | None | L |

### Loyalty redemption is intentionally disabled

`loyalty.redeem` throws `METHOD_NOT_SUPPORTED` (`server/routers.ts:~1611`). Points are earned and displayed but cannot be spent — a **partially-implemented feature visible to users** (they see a growing balance they can never use). See BUG_REPORT NW-FUNC-02.

### Admin modules (18 pages, gated by `AdminGuard` → `admin.me`)

| Module | Page | Impl | Risk |
|---|---|---|---|
| Dashboard | AdminDashboard | ✅ | L |
| Products | AdminProducts (+ image manager) | ✅ | M |
| Orders | AdminOrders (status → auto WhatsApp + loyalty + stock restore on cancel) | ✅ | H |
| Coupons | AdminCoupons | ✅ | M |
| Customers | AdminCustomers (+ bulk import) | ✅ | H (PII) |
| Analytics | AdminAnalytics (+ CEO dashboard, segments) | ✅ | M |
| Settings | AdminSettings (107 KB — payments, pixels, SEO, shipping, all secrets) | ✅ | **H** |
| Homepage | AdminHomepage (hero carousel) | ✅ | L |
| Reviews | AdminReviews (moderate) | ✅ | L |
| Subscriptions | AdminSubscriptions | ✅ | M |
| Abandoned carts | AdminAbandonedCarts (+ reminder) | ✅ | M |
| WhatsApp | AdminWhatsApp, WhatsAppTemplates, WhatsAppCampaigns (campaigns, templates→Meta, live 2-way chat) | ✅ | M |
| Email | AdminEmailCampaigns (AI generate + send) | ✅ | M |
| Blog | AdminBlogs, BlogEditor (AI write/topics/image) | ✅ | L |
| Admin users | (in Settings) create/setRole/setPassword/remove | ✅ | **H** |

### External integrations

| Integration | Purpose | Status | Evidence |
|---|---|---|---|
| Razorpay | Payment (live) | ✅ | `routers.ts` payment router, `/api/razorpay/webhook` |
| PhonePe | Payment (toggleable) | ✅ | `server/phonepe.ts`, `/api/phonepe/webhook` |
| Meta WhatsApp (Graph v25) | OTP, order/shipping/delivery, campaigns, live chat, back-in-stock | ✅ | `server/whatsapp.ts` (73 KB) |
| Resend + SMTP | Transactional + campaign email, open/click tracking | ✅ | `server/email.ts` |
| Vercel Blob | Media storage, direct browser upload | ✅ | `server/storage.ts` |
| Shiprocket + iThink | Shipping/AWB, `/api/shipping/webhook` | ✅ | `server/shipping.ts` |
| India Post | Pincode serviceability | ✅ | `shipping.checkPincode` |
| Fast2SMS | Order SMS (env-gated) | ✅ | `sendOrderConfirmationSMS` |
| GA4 + Meta Pixel + FB CAPI | Analytics/attribution (client + server) | ✅ | `index.html`, `server/facebookCapi.ts` |
| Firebase | **Analytics only** (no Auth/Firestore/FCM) | ◑ | `client/src/lib/firebase.ts` |
| Sentry | Error monitoring (client + server) | ✅ | `client/src/lib/sentry.ts` |
| Anthropic / OpenAI | AI blog + email + image gen + chatbox | ✅ | `server/_core/llm.ts`, `emailAI` |

### Flutter app — feature parity gaps vs web

The Flutter app (`flutter_app/lib`) is a customer-only storefront on the same tRPC API. Gaps:

| Feature | Web | Flutter | Note |
|---|---|---|---|
| PhonePe payment | ✅ | ✖ | App = COD + Razorpay only (`checkout.dart:31`) |
| Payment plans (advance30) | ✅ | ✖ | Hardcoded `razorpay_full`/`cod` |
| Referral | ✅ | ✖ | No referral calls |
| Subscriptions | ✅ | ✖ | Not in app |
| GST invoice | ✅ | ✖ | Not in app |
| Loyalty history | ✅ | ◑ | Balance only |
| Address update/delete | ✅ | ◑ | Add + list only |
| Order tracking (AWB) | ✅ | ◑ | Order list only |
| Reviews (read+write) | ✅ | ✅ | With images |
| Wishlist | ✅ | ✅ | Local-first + server merge |

App-store review test bypass: `9999900000` / OTP `1234` in `otp.send`/`otp.verify` — intentional but not env-gated (see SECURITY_AUDIT).
