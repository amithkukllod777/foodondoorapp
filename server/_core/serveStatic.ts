import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { getProductByHandle, getBlogPostBySlug, getProductsByCategory, getBestsellers } from "../db";

const SITE_URL = "https://www.foodondoor.com";
const SITE_NAME = "Foodondoor";
const DEFAULT_TITLE = "Foodondoor | Premium Dry Fruits & Healthy Snacks Online";
const DEFAULT_DESC = "Buy premium dry fruits, nuts, seeds & healthy snacks online. Free delivery, best prices, 100% quality assured.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: string;
  /** Server-rendered visible content injected into #root for non-JS crawlers.
   *  React (createRoot) replaces this on hydration, so users never see it. */
  bodyHtml?: string;
}

const inr = (paise: number) => `₹${Number(paise || 0).toLocaleString("en-IN")}`;

// ── Server-rendered body content (crawler-visible, React replaces on load) ──

function buildProductBody(product: {
  name: string; handle: string; description?: string | null; price: number;
  mrp?: number | null; image?: string | null; category?: string | null;
  ingredients?: string | null; weight?: string | null; shelfLife?: string | null;
  images?: string[] | null;
}): string {
  const cat = product.category || "";
  const catUrl = `/collections/${encodeURIComponent(cat)}`;
  const desc = product.description ? escapeHtml(stripHtml(product.description)) : "";
  const priceLine = product.mrp && product.mrp > product.price
    ? `<strong>${inr(product.price)}</strong> <s>${inr(product.mrp)}</s>`
    : `<strong>${inr(product.price)}</strong>`;
  const details: string[] = [];
  if (product.weight) details.push(`<li>Weight: ${escapeHtml(product.weight)}</li>`);
  if (product.ingredients) details.push(`<li>Ingredients: ${escapeHtml(stripHtml(product.ingredients))}</li>`);
  if (product.shelfLife) details.push(`<li>Shelf life: ${escapeHtml(product.shelfLife)}</li>`);
  return `<main style="max-width:1100px;margin:0 auto;padding:16px;font-family:sans-serif">
  <nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; ${cat ? `<a href="${catUrl}">${escapeHtml(cat)}</a> &rsaquo; ` : ""}<span>${escapeHtml(product.name)}</span></nav>
  <h1>${escapeHtml(product.name)}</h1>
  ${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" width="400" loading="eager" />` : ""}
  <p>${priceLine}</p>
  ${desc ? `<p>${desc}</p>` : ""}
  ${cat ? `<p>Category: <a href="${catUrl}">${escapeHtml(cat)}</a></p>` : ""}
  ${details.length ? `<ul>${details.join("")}</ul>` : ""}
</main>`;
}

function buildCategoryBody(displayName: string, slug: string, products: { name: string; handle: string; price: number }[]): string {
  const items = products.map(p =>
    `<li><a href="/products/${escapeHtml(p.handle)}">${escapeHtml(p.name)}</a> — ${inr(p.price)}</li>`
  ).join("");
  return `<main style="max-width:1100px;margin:0 auto;padding:16px;font-family:sans-serif">
  <nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <span>${escapeHtml(displayName)}</span></nav>
  <h1>Buy ${escapeHtml(displayName)} Online</h1>
  <p>Shop premium ${escapeHtml(displayName.toLowerCase())} at Foodondoor — 100% natural, no preservatives, free delivery across India.</p>
  ${items ? `<ul>${items}</ul>` : ""}
</main>`;
}

function buildBlogBody(post: { title: string; content?: string | null; excerpt?: string | null; coverImage?: string | null; author?: string | null; createdAt: Date | string; slug: string }): string {
  const date = new Date(post.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  // Blog content is our own admin-authored HTML — safe to inline verbatim.
  const body = post.content || (post.excerpt ? `<p>${escapeHtml(post.excerpt)}</p>` : "");
  return `<main style="max-width:800px;margin:0 auto;padding:16px;font-family:sans-serif">
  <nav aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/blog">Blog</a> &rsaquo; <span>${escapeHtml(post.title)}</span></nav>
  <article>
    <h1>${escapeHtml(post.title)}</h1>
    <p>By ${escapeHtml(post.author || "Foodondoor Team")} · ${date}</p>
    ${post.coverImage ? `<img src="${escapeHtml(post.coverImage)}" alt="${escapeHtml(post.title)}" width="700" />` : ""}
    ${body}
  </article>
</main>`;
}

function buildHomeBody(products: { name: string; handle: string; price: number }[]): string {
  const cats = ["Nuts","Seeds","Berries","Snacks","Dates","Makhana"];
  const catLinks = cats.map(c => `<li><a href="/collections/${encodeURIComponent(c)}">${c}</a></li>`).join("");
  const items = products.slice(0, 12).map(p =>
    `<li><a href="/products/${escapeHtml(p.handle)}">${escapeHtml(p.name)}</a> — ${inr(p.price)}</li>`
  ).join("");
  return `<main style="max-width:1100px;margin:0 auto;padding:16px;font-family:sans-serif">
  <h1>Buy Premium Dry Fruits, Nuts &amp; Healthy Snacks Online</h1>
  <p>Foodondoor — 100% natural dry fruits, nuts, seeds and healthy snacks. No preservatives, free shipping above ₹499 across India.</p>
  <h2>Shop by Category</h2>
  <ul>${catLinks}</ul>
  ${items ? `<h2>Bestsellers</h2><ul>${items}</ul>` : ""}
</main>`;
}

function buildProductJsonLd(product: {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  mrp?: number | null;
  image?: string | null;
  handle: string;
  rating?: number | null;
  reviewCount?: number | null;
}): string {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ? truncate(stripHtml(product.description), 500) : undefined,
    image: product.image || DEFAULT_IMAGE,
    url: `${SITE_URL}/products/${product.handle}`,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/products/${product.handle}`,
    },
  };
  if (product.rating && product.reviewCount) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating / 10,
      reviewCount: product.reviewCount,
    };
  }
  return JSON.stringify(ld).replace(/<\//g, "<\\/");
}

function buildArticleJsonLd(post: {
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  slug: string;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  author?: string | null;
}): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || "",
    image: post.coverImage || DEFAULT_IMAGE,
    url: `${SITE_URL}/blogs/news/${post.slug}`,
    datePublished: new Date(post.createdAt).toISOString(),
    dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
    author: { "@type": "Person", name: post.author || SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
  }).replace(/<\//g, "<\\/");
}

async function getPageSeo(pathname: string): Promise<SeoMeta | null> {
  const productMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    try {
      const product = await getProductByHandle(productMatch[1]);
      if (product) {
        const desc = product.description
          ? truncate(stripHtml(product.description), 155)
          : `Buy ${product.name} online at best price. ${DEFAULT_DESC}`;
        return {
          title: `${product.name} - Buy Online | ${SITE_NAME}`,
          description: desc,
          canonical: `${SITE_URL}/products/${product.handle}`,
          ogImage: product.image || DEFAULT_IMAGE,
          ogType: "product",
          jsonLd: buildProductJsonLd(product),
          bodyHtml: buildProductBody(product as Parameters<typeof buildProductBody>[0]),
        };
      }
    } catch (e) { console.error("[SEO] product lookup failed:", e); }
  }

  const blogMatch = pathname.match(/^\/blogs?\/news\/([^/]+)$/);
  if (blogMatch) {
    try {
      const post = await getBlogPostBySlug(blogMatch[1]);
      if (post) {
        return {
          title: `${post.title} | ${SITE_NAME} Blog`,
          description: post.excerpt ? truncate(post.excerpt, 155) : DEFAULT_DESC,
          canonical: `${SITE_URL}/blogs/news/${post.slug}`,
          ogImage: post.coverImage || DEFAULT_IMAGE,
          ogType: "article",
          jsonLd: buildArticleJsonLd(post),
          bodyHtml: buildBlogBody(post),
        };
      }
    } catch (e) { console.error("[SEO] blog lookup failed:", e); }
  }

  const categoryMatch = pathname.match(/^\/collections\/([^/]+)$/);
  if (categoryMatch) {
    const slug = categoryMatch[1];
    const displayName = decodeURIComponent(slug)
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    let products: { name: string; handle: string; price: number }[] = [];
    try {
      const rows = await getProductsByCategory(decodeURIComponent(slug), 60);
      products = (rows as { name: string; handle: string; price: number }[])
        .map(p => ({ name: p.name, handle: p.handle, price: p.price }));
    } catch (e) { console.error("[SEO] category products failed:", e); }
    return {
      title: `Buy ${displayName} Online - Premium ${displayName} | ${SITE_NAME}`,
      description: `Shop premium ${displayName.toLowerCase()} online at ${SITE_NAME}. Best quality, great prices, free delivery.`,
      canonical: `${SITE_URL}/collections/${slug}`,
      ogType: "website",
      bodyHtml: buildCategoryBody(displayName, slug, products),
    };
  }

  // Home — inject an H1 + category/bestseller links for crawlers & discovery.
  if (pathname === "/" || pathname === "") {
    let products: { name: string; handle: string; price: number }[] = [];
    try {
      const rows = await getBestsellers(12);
      products = (rows as { name: string; handle: string; price: number }[])
        .map(p => ({ name: p.name, handle: p.handle, price: p.price }));
    } catch (e) { console.error("[SEO] home bestsellers failed:", e); }
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
      canonical: `${SITE_URL}/`,
      ogType: "website",
      bodyHtml: buildHomeBody(products),
    };
  }

  return null;
}

function injectSeoMeta(html: string, seo: SeoMeta): string {
  const title = escapeHtml(seo.title);
  const desc = escapeHtml(seo.description);
  const canonical = escapeHtml(seo.canonical);
  const ogImage = escapeHtml(seo.ogImage || DEFAULT_IMAGE);
  const ogType = seo.ogType || "website";

  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${title}</title>`,
  );

  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${desc}" />`,
  );

  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`,
  );

  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${desc}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${canonical}" />`,
  );
  html = html.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:image" content="${ogImage}" />`,
  );
  // The static width/height describe the 1200×630 homepage card; product/blog
  // images vary, so drop the dimensions when injecting a page-specific image.
  if (seo.ogImage && seo.ogImage !== DEFAULT_IMAGE) {
    html = html.replace(/\s*<meta\s+property="og:image:width"\s+content="[^"]*"\s*\/?>/, "");
    html = html.replace(/\s*<meta\s+property="og:image:height"\s+content="[^"]*"\s*\/?>/, "");
  }
  html = html.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:type" content="${ogType}" />`,
  );

  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${title}" />`,
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${desc}" />`,
  );
  html = html.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:image" content="${ogImage}" />`,
  );

  if (seo.jsonLd) {
    html = html.replace(
      "</head>",
      `<script type="application/ld+json">${seo.jsonLd}</script>\n</head>`,
    );
  }

  // Inject server-rendered content into #root so non-JS crawlers see real
  // page content (headings, text, links). React's createRoot clears and
  // replaces these children when the app boots — no hydration, no flash for
  // users on a normal connection.
  if (seo.bodyHtml) {
    html = html.replace(
      /<div id="root"><\/div>/,
      `<div id="root">${seo.bodyHtml}</div>`,
    );
  }

  return html;
}

/**
 * Serves the built client SPA (Vite output) and falls back to index.html for
 * client-side routes.
 *
 * `distPathOverride` lets callers (e.g. the Vercel serverless entry) pass an
 * explicit directory, since `import.meta.dirname` is not a reliable anchor once
 * the function has been bundled and relocated by the platform — in some bundled
 * contexts it is `undefined`, so we guard every use of it.
 */
export function serveStatic(app: Express, distPathOverride?: string) {
  const dirname = typeof import.meta.dirname === "string" ? import.meta.dirname : undefined;

  const candidates = [
    distPathOverride,
    path.join(process.cwd(), "dist", "public"),
    // Local prod build: esbuild emits dist/index.js, Vite emits dist/public.
    dirname ? path.resolve(dirname, "public") : undefined,
    dirname ? path.resolve(dirname, "..", "..", "dist", "public") : undefined,
  ].filter((p): p is string => Boolean(p));

  const distPath =
    candidates.find(p => fs.existsSync(path.join(p, "index.html"))) ?? candidates[0];

  if (!distPath || !fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  let htmlTemplate: string | null = null;
  try {
    htmlTemplate = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
  } catch {}

  // index:false so "/" doesn't short-circuit to the raw index.html — it must
  // fall through to the SEO-injection middleware below. Static assets (files
  // with extensions) are still served normally.
  app.use(express.static(distPath, { index: false }));

  app.use("*", async (req, res) => {
    const pathname = req.originalUrl.split("?")[0];

    if (htmlTemplate) {
      try {
        const seo = await getPageSeo(pathname);
        if (seo) {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          return res.send(injectSeoMeta(htmlTemplate, seo));
        }
      } catch (e) {
        console.error("[SEO] meta injection failed for", pathname, e);
      }
      // Serve the in-memory template (200) rather than sendFile, which honours
      // Range headers from crawlers and replies 206 Partial Content — that made
      // the Facebook scraper report a 206 for the homepage.
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(htmlTemplate);
    }

    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
