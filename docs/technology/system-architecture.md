# System Architecture

> Owner: CTO Agent ([`../agents/cto.md`](../agents/cto.md)). Source of truth: repo + `CLAUDE.md`, `HANDOFF.md`, `DEPLOY_VERCEL.md`.

## Stack

- **Frontend:** Vite 7 + React 19 SPA (`client/`), Tailwind v4 (CSS-first, no config), shadcn/ui (admin-heavy).
- **Backend:** Express + tRPC v11 (`server/`, `api/`), shared types/pricing in `shared/`.
- **ORM/DB:** Drizzle ORM via `mysql2` → TiDB Cloud Serverless (MySQL-compatible), 22 tables. Migrations in `drizzle/`.
- **Deploy:** Vercel single serverless function. `build:vercel` = `vite build` + esbuild-bundle server → `api/_app.mjs`; `api/index.ts` lazy-imports it. GitHub `main` push → prod auto-deploy.

## Request Flow

```
Browser (React SPA)
  → /api/trpc/*          tRPC procedures (server/routers.ts)
  → /api/razorpay/*      Razorpay payment webhooks (HMAC-SHA256 verified)
  → /api/phonepe/*       PhonePe payment webhooks
  → /api/whatsapp/*      Meta WhatsApp webhooks (signature validated)
  → /api/shipping/*      Shiprocket/iThink delivery webhooks
  → /api/cron/jobs       Vercel cron (every 6h, Bearer token auth)
  → /api/track/*         Email open/click tracking pixels
  → /api/unsubscribe     Email unsubscribe handler
  → /sitemap.xml         Dynamic XML sitemap (products + blogs from DB)
  → /robots.txt          Dynamic robots.txt
  → /feed/*              Google Shopping XML + Facebook Catalog CSV/XML
  → everything else      → SPA fallback (dist/public/index.html)
All on ONE origin (cookie auth, no CORS workarounds).
```

## Database Schema (22 Tables)

### Core Commerce
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `products` | Product catalog | id, handle (slug), name, price/mrp (paise), weight, images (JSON), category, isBestseller, isTrending |
| `productImages` | Multi-image gallery | productId, url, fileKey, isHero, sortOrder |
| `productStock` | Stock tracking | productId (unique), stock, lowStockThreshold |
| `orders` | Order records | id (varchar 20), customerId, phone, items (JSON), paymentMethod, paymentPlan, status, awbCode |
| `coupons` | Discount codes | code (unique), discountType, discountValue, minOrderAmount, maxUses, expiresAt |
| `abandonedCarts` | Cart recovery | customerId, phone, items (JSON), total, recovered |

### Customers & Auth
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `customerProfiles` | Customer accounts | phone (unique), name, email |
| `addresses` | Delivery addresses | customerId, phone, flat, area, city, state, pincode, isDefault |
| `otpCodes` | OTP persistence | phone (unique), codeHash (SHA256), expiresAt, attempts, sendCount |
| `adminUsers` | Multi-user admin | email (unique), passwordHash (scrypt), role (owner/admin/manager) |
| `users` | OAuth-backed users | openId, name, email, role |

### Messaging & Marketing
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `whatsappCampaigns` | Broadcast campaigns | name, message, templateId, status, targetSegment, totalSent/Failed |
| `whatsappContacts` | Campaign recipients | campaignId, phone, status (pending/sent/failed) |
| `whatsappTemplates` | Meta-approved templates | name, metaTemplateId, approvalStatus |
| `whatsappLogs` | Message send logs | phone, messageType, status, metaMessageId, campaignId |
| `whatsappMessages` | Chat messages | conversationId, direction, messageType, content |
| `whatsappConversations` | Chat threads | phone (unique), lastMessage, unreadCount, status |
| `whatsappSubscribers` | Newsletter subscribers | phone (unique), name |
| `emailLogs` | Email campaign tracking | campaignId, email, status, openCount, clickCount |
| `emailUnsubscribes` | Marketing opt-out | email (unique) |

### Content & Analytics
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `blogPosts` | SEO blog articles | slug (unique), title, content, coverImage, status |
| `productReviews` | Customer reviews | productId, customerName, rating, verified |
| `pageViews` | Analytics tracking | path, referrer, country, device, sessionId |
| `homepageSections` | Homepage product placement | sectionType, productId, sortOrder |
| `stockAlerts` | Back-in-stock notifications | productId, phone/email |
| `storeSettings` | Admin config key-value | key (unique), value (JSON) |

### Key Indexes (auto-applied on deploy via `ensureRuntimeColumns`)
- `orders(customerId, createdAt)` — customer order history
- `orders(phone, createdAt)` — chatbot order lookups
- `products(status, sortOrder)` — storefront listing
- `productImages(productId, sortOrder)` — product gallery (hot path)
- `whatsappLogs(metaMessageId)` — webhook dedup
- `whatsappLogs(phone, sentAt)` — message history
- `whatsappLogs(campaignId, status)` — campaign stats
- `emailLogs(campaignId, sentAt)` — campaign analytics
- `stockAlerts(productId)` — back-in-stock queries

## Key Subsystems

### Checkout (`CartDrawer.tsx` — ~1300 lines, 3 steps)
1. **Cart + Coupon** — items, quantities, weight variants, coupon validation
2. **Address** — saved addresses + new address form, pincode serviceability
3. **Payment** — Razorpay / PhonePe / COD selection + processing

Prices in **paise**; variant multipliers `[1, 1.85, 3.5]` in `shared/pricing.ts` (client+server validated, anti-tampering).

### Payments
- **Razorpay** (primary): Standard checkout. Webhook at `/api/razorpay/webhook` (HMAC-SHA256 timing-safe). Events: `payment.captured`, `payment.failed`.
- **PhonePe** (toggle): Hosted checkout via `@phonepe-pg/pg-sdk-node`. Webhook at `/api/phonepe/webhook`.
- **COD**: Direct order creation. Status: `pending_payment` → `placed`.

### Auth
- **Customer**: Phone OTP via WhatsApp (template `nutriwow_otp`). HMAC-signed session token in httpOnly cookie. OTP codes hashed (SHA256) in DB, rate-limited (5/15min, 30s gap).
- **Admin**: Password (timing-safe) + scrypt hashing. HMAC-signed token. Rate-limited (5/15min).

### Shipping
- **Shiprocket** (primary): REST API, email/password auth. AWB assignment, tracking, label generation.
- **iThink Logistics** (fallback): Token-based auth. Default courier: Delhivery.
- Both via `server/shipping.ts`. Webhook at `/api/shipping/webhook`.

### Media
- **Upload**: Vercel Blob via `server/storage.ts` `storagePut()`. Public CDN-served.
- **Optimization**: Vercel Image Optimization (`optImg()` helper → `/_vercel/image`). Allowed hosts in `vercel.json`.
- **Formats**: WebP auto-conversion, sizes 64-1600px, 24h cache.

### Cron Jobs (every 6 hours via Vercel cron)
1. **Email campaign batch** — sends 20 emails per run (80ms delay between)
2. **WhatsApp campaign batch** — sends 20 messages per run (150ms delay)
3. **Abandoned cart recovery** — messages carts idle > 45 min
4. **Stale order cleanup** — cancels unpaid orders > 1 hour, restores stock

### Analytics & Tracking
- **GA4**: `G-N1EESY3X9F` (index.html)
- **Meta Pixel**: `1753762272279602` (browser) + server CAPI (`server/facebookCapi.ts`)
- **Firebase Analytics**: Client-side via `client/src/lib/firebase.ts`
- **Sentry**: Error tracking, client (lazy-loaded) + server
- **Page views**: Custom `pageViews` table for admin analytics dashboard
- **Email tracking**: Open pixels + click redirects via `/api/track/*`

### AI Integrations
- **Claude** (Anthropic): Email campaign HTML generation (`server/_core/emailAI.ts`), Claude Opus 4 with thinking mode
- **OpenAI**: Blog cover image generation (`server/_core/imageGeneration.ts`), `gpt-image-1` model

## Frontend Bundle Architecture

Optimized with Vite `manualChunks` (June 2026):

| Chunk | Size (minified) | Caching |
|-------|-----------------|---------|
| `vendor-react-dom` | 732 KB | Immutable (content hash) |
| `index` (app code) | 312 KB | Changes per deploy |
| `vendor-sentry` | 271 KB → **lazy-loaded** | Deferred from critical path |
| `vendor-data` (tRPC/tanstack) | 99 KB | Immutable |
| `vendor-ui` (radix/lucide) | 80 KB | Immutable |
| `vendor-react` (core/wouter) | 34 KB | Immutable |
| `AreaChart` (recharts) | 394 KB | Lazy-loaded (admin only) |

Admin pages are all code-split via React lazy routes.

## Security Layer

- Rate limiting: In-memory per warm instance (`server/_core/rateLimit.ts`)
- Webhook signatures: Timing-safe HMAC comparison (Razorpay, WhatsApp, shipping)
- Password hashing: scrypt with transparent SHA256→scrypt rehash
- Session tokens: HMAC-signed with `JWT_SECRET` (httpOnly cookies)
- Input validation: Zod schemas on all tRPC procedures
- XSS protection: `escHtml()` on server-rendered pages
- Coupon enforcement: Server-side recompute at checkout

## Detail
Deployment → [`infrastructure.md`](./infrastructure.md). Roadmap → [`roadmap.md`](./roadmap.md). Deep deploy notes → `DEPLOY_VERCEL.md`. Marketing-tech spec → [`cto-marketing-implementation.md`](./cto-marketing-implementation.md).
