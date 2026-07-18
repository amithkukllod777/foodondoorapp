# Foodondoor — Project Context for Claude

Hybrid commerce & delivery app for **groceries, dairy, nutrition, packaged products and daily essentials**, operated by **Foodondoor Private Limited** (corporate site https://www.foodondoor.com). Consumer promise: *"Shopping, delivered your way."* Local pilot: **Bhopal–Sehore**; packaged products ship nationally. Owner communicates in Hinglish — reply in simple Hindi/Hinglish.

> This codebase was cloned from the **Nutriwow** store (a sibling Foodondoor brand) and is being rebranded. Some infra still points at Nutriwow accounts — see "Infra to migrate" below. The app **domain is not final**; SEO/canonical currently use `https://www.foodondoor.com` as a placeholder — confirm before launch (may be an app-specific subdomain).

## Stack & architecture

- **Vite + React 19 SPA + Express + tRPC v11 + Drizzle ORM (mysql2)** — NOT Next.js.
- Package manager: **pnpm** (`pnpm@10.4.1`). Use `pnpm add`, never `npm i`.
- Deployed on **Vercel** as a single serverless function: `build:vercel` runs `vite build` then esbuild-bundles the server into `api/_app.mjs`; `api/index.ts` lazy-imports it. All routes (tRPC, webhooks, SEO routes, SPA) on one origin. Details in `DEPLOY_VERCEL.md`.
- GitHub `main` push → auto-deploys to production. Feature branches → preview deployments (preview env lacks `DATABASE_URL`, so products don't render on previews).
- Tailwind v4 CSS-first: NO tailwind.config.js — all design tokens live in `client/src/index.css` (`@theme` + `:root`). shadcn/ui in `client/src/components/ui` (storefront barely uses it; admin does).

## Infrastructure

- **DB:** owner's own TiDB Cloud Serverless (MySQL-compatible), connected via `DATABASE_URL` env (TLS).
- **Media:** Vercel Blob (`*.public.blob.vercel-storage.com`) via `server/storage.ts` `storagePut()` (needs `BLOB_READ_WRITE_TOKEN`). Images served through Vercel Image Optimization: `optImg()` helper in `client/src/lib/img.ts` → `/_vercel/image`; allowed hosts in `vercel.json images.remotePatterns`.
- Favicons/logo are local in `client/public` (`foodondoor-logo.png`, `favicon.svg`).

### Infra to migrate (still Nutriwow's accounts — replace before launch)

- **Firebase** (`client/src/lib/firebase.ts`) — Nutriwow project; swap for Foodondoor's.
- **GA4 + Meta Pixel** (`client/index.html`) — Nutriwow's tags were removed/commented; add Foodondoor's IDs.
- **WhatsApp OTP + order templates** (`server/whatsapp.ts`, `nutriwow_otp` etc.) — Meta-approved template *names*; keep as-is until Foodondoor templates are approved, then rename.
- **Android native** (`android/`, `assetlinks.json`) — package `com.foodondoor.app` set in `capacitor.config.ts`, but the native `applicationId`, signing key + `assetlinks.json` SHA-256 fingerprint still need a proper migration.
- **Product seed content** (`client/src/lib/products.ts`) — Nutriwow dry-fruit sample data; real catalog comes from DB.
- Support email defaults to `wecare@foodondoor.com`, phone `+91 92431 77706` (per corporate site) — verify mailbox/number exist.

## Design system: "Clay 3D on Foodondoor tiranga palette"

- Claymorphism shapes: `shadow-clay-sm/clay/clay-lg` (raised), `shadow-clay-pressed` (inset — inputs & active), `shadow-clay-btn` (CTA glow), `active:translate-y-0.5` press-down, rounded-2xl/3xl, hover `-translate-y-1` lift.
- **Brand colors (from the Foodondoor logo):** royal/cobalt **blue** `--primary` (`oklch(0.42 0.19 266)`, ≈ `#1A34A8`) — dominant, used for nav/primary CTAs; **green** `nutrigreen` and **saffron/orange** `nutriorange` are the tricolor accents (the logo swoosh + the green "on" in the wordmark); off-white `--background`; gold shimmer `%OFF` badges. Token names `nutrigreen`/`nutriorange` are kept internal (used across ~13 files) — only their meaning is Foodondoor's now. Don't change brand colors without asking.
- Pastel chip tokens: `bg-clay-green/-pink/-peach/-butter` + `text-clay-brown`.
- Headings font: **'Baloo 2'** (`--font-serif`, h1–h3, `.font-serif`); body Poppins.
- Semantic colors stay meaningful: green=paid/savings, red=failed, orange=COD-due. Third-party brand colors (PhonePe purple #5f259f, Razorpay navy #072654, GPay/Visa/Mastercard/RuPay, WhatsApp green) must never be re-themed.
- Admin panel (`client/src/pages/admin`, 15 files) is intentionally NOT redesigned.

## Key flows & gotchas

- **Checkout lives in `client/src/components/CartDrawer.tsx`** (~1300 lines, 3 steps: cart+coupon → address → payment). `client/src/pages/Checkout.tsx` is only a redirect stub. Test checkout after touching it (coupons, address form, all payment plans).
- **Payments:** Razorpay + COD; PhonePe toggleable. Gateways/keys come from DB `storeSettings.payments` JSON via `payment.getActiveGateways` — admin Settings → Payments toggles control checkout. NOTE: `storeSettings.value` is a MySQL **json column** → `getAllStoreSettings()` returns already-parsed objects; never `JSON.parse` them blindly (use `typeof raw === "string" ? JSON.parse(raw) : raw`).
- **Auth:** mobile + WhatsApp OTP (Meta template `nutriwow_otp`), JWT session. Admin login is a client-side password (known weakness; security hardening tracked separately).
- **Hero carousel:** slides admin-managed (Admin → Homepage), stored in `heroCarousel` store setting. Standard sizes: desktop 1920×640 (3:1), mobile 1080×1080 — admin uploader auto-center-crops to these. Slides cached in localStorage to avoid stale-banner flash on load. `HeroBanner.tsx` is only the zero-slides fallback.
- **Settings hooks:** `useSettings.get()` must return memoized stable references per key, or settings tabs become read-only after first save (fixed once — don't regress).
- Layout-load-bearing values: ProductCard `w-[220px] sm:w-[240px]`, ProductSection `scrollAmount = 260`, keyframe names `marquee`/`shimmer`/`confetti-fall`, `.hide-scrollbar`, `.gold-shimmer`.
- `prices are stored in paise` in DB (`products.price`), variant multipliers live in `shared/pricing.ts` (shared client/server for anti-tampering validation).
- SEO: canonical/OG/sitemap currently hardcode `https://www.foodondoor.com` (placeholder domain — confirm).

## Conventions

- Visual changes: edit className/tokens only; never touch logic, conditional ternary branches must be restyled on BOTH sides.
- Build check: `pnpm vite build` (client) or `pnpm build:vercel` (full).
- For risky/site-wide changes: work on a feature branch, share the Vercel preview URL, get owner approval ("haan live karo") before merging to main.
