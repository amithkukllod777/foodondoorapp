# Nutriwow — Project Handoff (browser/web Claude ke liye)

> Ye file claude.ai/code ya kisi naye Claude session ko paste karo taaki use poora context mil jaaye.
> Puri purani baat-cheet `nutriwow-chat-history.md` me hai (reference ke liye).

## Project kya hai
**Nutriwow** — Indian dry-fruits/nuts e-commerce store.
- **Stack:** Vite 7 + React 19 SPA, Express server, tRPC, Drizzle ORM + TiDB Cloud (MySQL).
- **Deploy:** Vercel serverless single-function. GitHub `main` par push = auto-deploy.
- **Live:** nutriwow.vercel.app
- **Repo:** github.com/amithkukllod777/nutriwow
- **Local path:** `C:\Users\Hi\nutriwow-repo`

## ⚠️ Zaroori rules (warna kaam tootega)
1. **Package manager = pnpm** (npm MAT use karo — lockfile/peer conflict se fail hota hai).
   - Build: `pnpm build:vercel` (vite build + esbuild → `api/_app.mjs`).
2. **Commit se pehle hamesha `git branch --show-current` check karo.** Is repo me parallel agents
   beech-beech me branch switch kar dete hain, jisse commit galat branch par chala jata hai.
   Pattern: feature branch banao off `main`, fir `git checkout main && git merge` (ya cherry-pick), fir push `main`.
3. **DATABASE_URL Vercel par "Sensitive" hai** — pull nahi hoti. Isliye nayi tables
   "self-creating" pattern se banti hain (`CREATE TABLE IF NOT EXISTS` pehli baar use par).
4. **Main (assistant) API keys/passwords kisi field/env me khud nahi daalta** — wo user karta hai.

## Architecture quick-map
- **Admin auth:** server-validated. `admin.login(password)` cookie set karta hai, `admin.me` → `{isAdmin}`,
  `AdminGuard` routes gate karta hai. Password = `ADMIN_PASSWORD` env (legacy fallback hardcoded in `server/routers.ts` — value yahan redact, code me dekho).
- **Settings:** `storeSettings` key/value (JSON) table via `getStoreSetting`/`setStoreSetting`.
  Keys: `productCategories`, `categoryTree`, `emailCampaigns`, `anthropicApiKey`, `resendApiKey`, `resendFrom`.
  (Schema migration ki zaroorat nahi.)
- **Email:** Resend (HTTP API, preferred) → fallback Gmail/Brevo SMTP. `server/email.ts`.
- **AI email campaigns:** Anthropic SDK, model `claude-opus-4-8`, structured output. `server/_core/emailAI.ts`.
- **Routing:** wouter (`useRoute`, `useSearch`, `Link`).

## Key files
- `client/src/components/CategoryMegaMenu.tsx` — desktop "Shop by Categories" mega-menu (DEFAULT_TREE instant render + cached `categories.getTree`).
- `client/src/components/admin/CategoryTreeEditor.tsx` — admin: category→subcategory tree editor.
- `client/src/pages/CategoryPage.tsx` — `?sub=` keyword filter.
- `server/routers.ts` — routers: `categories` (list/set/rename/getTree/setTree), `emailCampaigns`, `stock` (back-in-stock hook), `abandonedCarts`.
- `server/db.ts` — self-creating `otpCodes` + `stockAlerts`, abandoned-cart enrichment.
- `server/email.ts`, `server/_core/emailAI.ts`.

## Recent kaam (latest pehle)
- ✅ Mega-menu ab instantly load hota hai (DEFAULT_TREE + 10-min cache). `main` par deploy ho gaya (commit efd4081).
- ✅ Mega-menu ke inline category links hata diye, sirf dropdown rakha.
- ✅ Happilo-style mega-menu nav (categories + subcategories) banaya.
- ✅ OTP serverless persistence fix (DB-backed `otpCodes`).
- ✅ Resend email integration (deliverability fix).
- ✅ OOS products ab clickable + "Notify me when available" + back-in-stock email/WhatsApp.
- ✅ Abandoned carts city+customer ke saath enrich kiye.

## Open / housekeeping (audit June 2026 se)
> Details: `.claude\projects\...\memory\nutriwow-audit-2026-06.md`
- 🔴 Client-side admin auth ke kuch hisse + kuch admin mutations `publicProcedure` par (server-side gate karo).
- 🔴 Price tampering possibility — server par price re-validate karo, client se trust mat karo.
- 🔴 Brevo + Resend API keys pehle chat me galti se share ho gayi thi → **rotate karo** (naye keys banao, purane revoke karo).

## Browser se continue kaise karein
1. [claude.ai/code](https://claude.ai/code) kholo.
2. GitHub repo `amithkukllod777/nutriwow` connect karo.
3. Ye `HANDOFF.md` paste karo (ya repo me already hai to "read HANDOFF.md" bolo).
4. Kaam continue karo. Yaad rakhо: pnpm, branch check, push to `main` = deploy.
