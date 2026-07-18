# SEO Roadmap

> Owner: CMO Agent ([`../agents/cmo.md`](../agents/cmo.md)). Context: [`../company/master-context.md`](../company/master-context.md).

**Goal:** Make organic search the lowest-CAC acquisition channel. **Target: grow organic sessions & organic
revenue (GA4) — set baseline +X% once owner shares current numbers.** Compounding asset, not a media spend.

## Current SEO setup (source of truth = repo — strong foundation already shipped)

- Canonical / OG / Twitter / sitemap all **hardcode** `https://www.nutriwow.in` (keep `www`).
- SEO component: `client/src/components/SEO.tsx`; dynamic `/sitemap.xml`, `/robots.txt`, `/feed/*` via Express.
- **JSON-LD already live:** Organization, Product, Article, Breadcrumb, CollectionPage (`todo.md` SEO history).
- Shopify-style URLs (`/products/:handle`, `/collections/:name`, `/blogs/news/:slug`) + **301 redirects** from old patterns.
- **16 SEO blog articles published** + AI blog writer in admin. Review data (`rating`, `reviewCount`) exists → ready for star-rating rich results.
- Analytics: GA4 `G-N1EESY3X9F`. Product feeds: `/feed/google-shopping.xml`, `/feed/facebook-catalog.xml`.

> So this roadmap = **build on a working base**, not start from zero. Focus shifts to content depth, on-page commercial intent, and authority.

---

## Phased plan

### Phase 0 — Foundation & hygiene (Week 1–2)
| Item | Why |
| --- | --- |
| Verify **Google Search Console** + Bing Webmaster; submit `/sitemap.xml` | Measurement + indexing control (GSC verify tag support already in code) |
| Coverage/Index audit — fix "Discovered/Crawled not indexed", duplicates, ensure all PDPs + collections indexable | Stop leaking crawl budget |
| Confirm 301s resolve (old Shopify URLs → new) + no chains | Preserve legacy equity |
| Core Web Vitals pass (LCP/CLS) — images already Vercel-optimized; check mobile | Ranking + CVR |
| Merchant Center: enable **product ratings** + fix feed issues | Star ratings in Shopping + organic |

### Phase 1 — On-page commercial SEO (Month 1) · **P1**
| Item | Detail |
| --- | --- |
| **Collection pages** | Unique 300+ word descriptions targeting "buy {category} online India" (Nuts, Seeds, Makhana, Dates, Combos). H1 added (Jun 9) — now add copy + internal links. |
| **PDP optimization** | Title ≤ 60 chars, meta description, descriptive H1, alt text, keyword-rich descriptions (badam/kaju/kishmish + English). |
| **AggregateRating schema** | Wire existing `rating`/`reviewCount` into Product schema → review stars in SERP. |
| **FAQ schema** | Add to PDPs (freshness, shipping, returns) — FAQ accordion already exists → mark up for rich results. |
| **Internal linking** | Combos ↔ constituent single SKUs; blog → relevant PDP (expand existing "Shop Related Products"). |

### Phase 2 — Content / topic-cluster engine (Month 2) · **P1**
Build **pillar → cluster** structure (pillar page links to collection + supporting blogs; blogs link back).
| Pillar | Supporting content (some exist, expand) | Intent |
| --- | --- | --- |
| **Dry Fruits guide** | almonds, cashews, raisins, dates, pistachios benefits (✅ exist) + "best dry fruits for weight loss", "...for immunity" | Info → PDP |
| **Seeds** | chia/flax benefits + recipes + "seeds for weight loss" | Info → Seeds collection |
| **Makhana** | "makhana for weight loss" (✅), "makhana recipes", "is makhana good for diabetes" | Info → Makhana collection |
| **Weight-management snacking** | "healthy evening snacks", "high-protein veg snacks", snack-swaps | Mid-funnel |
| **Gifting** | "dry fruit gift box online", "corporate gifting", "Diwali/Rakhi dry fruit hampers" | **Commercial — high AOV** |
- **Cadence:** 1 new article/week (use admin AI writer + human edit). Prioritise commercial-intent + gifting (revenue) over pure info.
- **Commercial keyword pages:** "dry fruits online India", "almonds 1kg price", "premium dry fruits", "{festival} dry fruit gift pack".

### Phase 3 — Authority / off-page (Month 3+) · **P2–P3**
- **Digital PR + backlinks:** health/nutrition/fitness sites, dietitian quotes, HARO-style, "best dry fruit brands in India" listicles.
- **Guest posts** on fitness/health blogs (doubles as influencer content from `campaigns.md`).
- **Google Business Profile** for Foodondoor Pvt Ltd (Sehore, MP) — local + brand SERP.
- Reviews/UGC → review-rich pages keep earning long-tail.

### Seasonal SEO (build 6–8 weeks ahead)
Pre-build & index **Diwali** and **Rakhi gifting** landing/collection pages well before the window (see festive calendar in [`content-calendar.md`](./content-calendar.md)). Diwali gifting = #1 organic revenue window.

---

## Target keyword clusters
| Type | Examples |
| --- | --- |
| **Branded** (defend) | nutriwow, nutriwow dry fruits, nutriwow.in |
| **Commercial** (convert) | buy dry fruits online, premium almonds online, flavoured makhana online, dry fruit gift box, omani dates price |
| **Informational** (attract) | almonds benefits, makhana for weight loss, dry fruits for diabetics, chia vs flax |
| **Gifting / seasonal** | Diwali dry fruit gift pack, Rakhi gift hamper, corporate gifting dry fruits |
> 🔲 Owner/keyword-tool: finalise target list with search volumes + difficulty; assign monthly targets.

## Measurement
- **Primary:** GSC clicks · impressions · avg position; **organic revenue + sessions** (GA4); indexed-page count.
- **Secondary:** target-keyword rankings; blog → PDP assisted conversions; review-rich-result coverage.
- Review cadence: monthly in [`../reports/weekly-review-template.md`](../reports/weekly-review-template.md) rollup.

## Owner inputs needed
🔲 GSC + Merchant Center access · keyword-tool subscription (Ahrefs/Semrush) · backlink/PR budget · GBP business details (address, hours) · sign-off on 1 blog/week cadence.

## Scope note
SEO **content** edits (blog, PDP/collection copy, `SEO.tsx` meta) are in CMO scope. Anything touching routing,
server feed logic or schema *rendering code* (`server/`, build) is **CTO** — coordinate via [`../technology/roadmap.md`](../technology/roadmap.md).
