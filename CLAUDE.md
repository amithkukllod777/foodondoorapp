# Nutriwow — Project Context for Claude

Dry-fruits e-commerce store, live at **https://www.nutriwow.in** (canonical host, keep www). Owner communicates in Hinglish — reply in simple Hindi/Hinglish.

## Stack & architecture

- **Vite + React 19 SPA + Express + tRPC v11 + Drizzle ORM (mysql2)** — NOT Next.js.
- Package manager: **pnpm** (`pnpm@10.4.1`). Use `pnpm add`, never `npm i`.
- Deployed on **Vercel** as a single serverless function: `build:vercel` runs `vite build` then esbuild-bundles the server into `api/_app.mjs`; `api/index.ts` lazy-imports it. All routes (tRPC, webhooks, SEO routes, SPA) on one origin. Details in `DEPLOY_VERCEL.md`.
- GitHub `main` push → auto-deploys to production. Feature branches → preview deployments (preview env lacks `DATABASE_URL`, so products don't render on previews).
- Tailwind v4 CSS-first: NO tailwind.config.js — all design tokens live in `client/src/index.css` (`@theme` + `:root`). shadcn/ui in `client/src/components/ui` (storefront barely uses it; admin does).

## Infrastructure (100% independent — no Manus platform deps)

- **DB:** owner's own TiDB Cloud Serverless (MySQL-compatible), connected via `DATABASE_URL` env (TLS). 22 tables.
- **Media:** Vercel Blob (`*.public.blob.vercel-storage.com`) via `server/storage.ts` `storagePut()` (needs `BLOB_READ_WRITE_TOKEN`). Images served through Vercel Image Optimization: `optImg()` helper in `client/src/lib/img.ts` → `/_vercel/image`; allowed hosts in `vercel.json images.remotePatterns`.
- Favicons/logo are local in `client/public`.

## Design system (LIVE June 2026): "Clay 3D on original palette"

- Claymorphism shapes: `shadow-clay-sm/clay/clay-lg` (raised), `shadow-clay-pressed` (inset — inputs & active), `shadow-clay-btn` (CTA glow), `active:translate-y-0.5` press-down, rounded-2xl/3xl, hover `-translate-y-1` lift.
- **Colors are the ORIGINAL palette** — green primary, orange `nutriorange` cart/Buy-Now CTAs, off-white `--background`, gold shimmer `%OFF` badges, dark-gray footer. The owner explicitly REJECTED a peach/cream palette; never change brand colors without asking.
- Pastel chip tokens: `bg-clay-green/-pink/-peach/-butter` + `text-clay-brown`.
- Headings font: **'Baloo 2'** (`--font-serif`, h1–h3, `.font-serif`); body Poppins. Playfair Display is removed.
- Semantic colors stay meaningful: green=paid/savings, red=failed, orange=COD-due. Third-party brand colors (PhonePe purple #5f259f, Razorpay navy #072654, GPay/Visa/Mastercard/RuPay, WhatsApp green) must never be re-themed.
- Admin panel (`client/src/pages/admin`, 15 files) is intentionally NOT redesigned.

## Key flows & gotchas

- **Checkout lives in `client/src/components/CartDrawer.tsx`** (~1300 lines, 3 steps: cart+coupon → address → payment). `client/src/pages/Checkout.tsx` is only a redirect stub. Test checkout after touching it (coupons, address form, all payment plans).
- **Payments:** Razorpay live + COD; PhonePe toggleable. Gateways/keys come from DB `storeSettings.payments` JSON via `payment.getActiveGateways` — admin Settings → Payments toggles control checkout. NOTE: `storeSettings.value` is a MySQL **json column** → `getAllStoreSettings()` returns already-parsed objects; never `JSON.parse` them blindly (use `typeof raw === "string" ? JSON.parse(raw) : raw`).
- **Auth:** mobile + WhatsApp OTP (Meta template `nutriwow_otp`), JWT session. Admin login is a client-side password (known weakness; security hardening tracked separately).
- **Hero carousel:** slides admin-managed (Admin → Homepage), stored in `heroCarousel` store setting. Standard sizes: desktop 1920×640 (3:1), mobile 1080×1080 — admin uploader auto-center-crops to these. Slides cached in localStorage to avoid stale-banner flash on load. CTA buttons (Shop Now / View Combos) are overlaid bottom-left on every slide. `HeroBanner.tsx` is only the zero-slides fallback.
- **Settings hooks:** `useSettings.get()` must return memoized stable references per key, or settings tabs become read-only after first save (fixed once — don't regress).
- Layout-load-bearing values: ProductCard `w-[220px] sm:w-[240px]`, ProductSection `scrollAmount = 260`, keyframe names `marquee`/`shimmer`/`confetti-fall`, `.hide-scrollbar`, `.gold-shimmer`.
- `prices are stored in paise` in DB (`products.price`), variant multipliers live in `shared/pricing.ts` (shared client/server for anti-tampering validation).
- SEO: canonical/OG/sitemap all hardcode `https://www.nutriwow.in`. GA4 tag `G-N1EESY3X9F` in index.html.

## Conventions

- Visual changes: edit className/tokens only; never touch logic, conditional ternary branches must be restyled on BOTH sides.
- Build check: `pnpm vite build` (client) or `pnpm build:vercel` (full).
- For risky/site-wide changes: work on a feature branch, share the Vercel preview URL, get owner approval ("haan live karo") before merging to main.
