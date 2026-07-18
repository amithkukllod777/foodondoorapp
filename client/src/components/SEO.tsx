/**
 * SEO Component — Dynamic meta tags for all pages
 * Uses react-helmet-async to inject per-page SEO tags
 */
import { Helmet } from "react-helmet-async";
import { trpc } from "@/lib/trpc";

const SITE_NAME = "Nutriwow";
const BASE_URL = "https://www.nutriwow.in";
const DEFAULT_IMAGE = "https://www.nutriwow.in/og-image.png"; // social share card (1200×630)
const LOGO_URL = "https://www.nutriwow.in/nutriwow-logo.png"; // brand logo for JSON-LD
const DEFAULT_DESCRIPTION = "Buy premium dry fruits, nuts, seeds & healthy snacks online. 100% natural, no preservatives. Free shipping across India. Shop cashews, almonds, dates & more.";
const STATIC_META_PIXEL_ID = "1753762272279602";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "product" | "article";
  keywords?: string;
  noIndex?: boolean;
  /** JSON-LD structured data object */
  jsonLd?: object | object[];
  /** Canonical URL override */
  canonical?: string;
}

/** Injects Pinterest Tag and Microsoft UET tracking pixels from DB settings */
export function MarketingPixels() {
  const { data: allSettings } = trpc.settings.getPublic.useQuery();
  const integrations = (() => {
    if (!allSettings) return null;
    const val = (allSettings as Record<string, unknown>)["integrations"];
    if (!val) return null;
    try { return typeof val === "string" ? JSON.parse(val) : val; } catch { return null; }
  })() as Record<string, string> | null;

  const pinterestId = integrations?.pinterest_tag_id?.trim();
  const uetId = integrations?.microsoft_uet_id?.trim();
  const snapPixelId = integrations?.snapchat_pixel_id?.trim();
  // Check both integrations and events settings for FB Pixel
  const events = (() => {
    if (!allSettings) return null;
    const val = (allSettings as Record<string, unknown>)["events"];
    if (!val) return null;
    try { return typeof val === "string" ? JSON.parse(val) : val; } catch { return null; }
  })() as Record<string, string> | null;
  const configuredFbPixelId = events?.fbpixel?.trim() || integrations?.facebook_pixel_id?.trim();
  const fbPixelId = configuredFbPixelId && configuredFbPixelId !== STATIC_META_PIXEL_ID
    ? configuredFbPixelId
    : "";
  const gtmId = events?.gtm?.trim();
  const hotjarId = events?.hotjar?.trim();

  if (!pinterestId && !uetId && !snapPixelId && !fbPixelId && !gtmId && !hotjarId) return null;

  return (
    <Helmet>
      {gtmId && (
        <script>{`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');
        `}</script>
      )}
      {hotjarId && (
        <script>{`
(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};h._hjSettings={hjid:${hotjarId},hjsv:6};a=o.getElementsByTagName('head')[0];r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;a.appendChild(r);})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
        `}</script>
      )}
      {fbPixelId && (
        <script>{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${fbPixelId}');
fbq('track','PageView');
        `}</script>
      )}
      {pinterestId && (
        <script>{`
!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
pintrk('load', '${pinterestId}', {em: ''});
pintrk('page');
        `}</script>
      )}
      {uetId && (
        <script>{`
(function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${uetId}",enableAutoSpaTracking:true};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");
        `}</script>
      )}
      {snapPixelId && (
        <script>{`
(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');
snaptr('init','${snapPixelId}',{});
snaptr('track','PAGE_VIEW');
        `}</script>
      )}
    </Helmet>
  );
}

/** Separate component that injects GSC meta tag once for the whole app */
export function GoogleSiteVerification() {
  const { data: allSettings } = trpc.settings.getPublic.useQuery();
  const general = (() => {
    if (!allSettings) return null;
    const val = (allSettings as Record<string, unknown>)["general"];
    if (!val) return null;
    try { return typeof val === "string" ? JSON.parse(val) : val; } catch { return null; }
  })();
  const integrations = (() => {
    if (!allSettings) return null;
    const val = (allSettings as Record<string, unknown>)["integrations"];
    if (!val) return null;
    try { return typeof val === "string" ? JSON.parse(val) : val; } catch { return null; }
  })();
  const code = (general as Record<string, string> | null)?.gscVerification
    || (integrations as Record<string, string> | null)?.gsc_verification;
  if (!code) return null;
  return (
    <Helmet>
      <meta name="google-site-verification" content={code} />
    </Helmet>
  );
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  keywords,
  noIndex = false,
  jsonLd,
  canonical,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Premium Dry Fruits & Healthy Snacks Online`;
  const fullUrl = url ? `${BASE_URL}${url}` : BASE_URL;
  const canonicalUrl = canonical || fullUrl;
  const ogType = type === "product" ? "product" : type === "article" ? "article" : "website";

  return (
    <Helmet>
      {/* Primary */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd])}
        </script>
      )}
    </Helmet>
  );
}

// ─── JSON-LD Builders ─────────────────────────────────────────────────────────

export function buildProductJsonLd(product: {
  id: number;
  handle?: string;
  name: string;
  description?: string;
  price: number;
  mrp?: number;
  image?: string;
  /** All product images (high-res). Improves Google Merchant "images per offer". */
  images?: string[];
  category?: string;
  rating?: number;
  reviewCount?: number;
  /** true = InStock, false = OutOfStock. Defaults to InStock. */
  available?: boolean;
}) {
  const productUrl = product.handle
    ? `${BASE_URL}/products/${product.handle}`
    : `${BASE_URL}/products/${product.id}`;
  // Google Merchant rewards 2+ high-resolution images per offer. Emit ALL images.
  const imgs = (product.images && product.images.length > 0
    ? product.images
    : [product.image]
  ).filter((u): u is string => !!u);
  // Offers need a priceValidUntil for rich results; default ~1 year out.
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.name,
    image: imgs,
    url: productUrl,
    sku: String(product.id),
    mpn: String(product.id),
    brand: { "@type": "Brand", name: "Nutriwow" },
    category: product.category,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      priceValidUntil: validUntil.toISOString().slice(0, 10),
      availability: product.available === false
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      url: productUrl,
      seller: { "@type": "Organization", name: "Nutriwow" },
    },
    // Only emit aggregateRating when there are REAL reviews — never from
    // placeholder/seed data (Google spammy-structured-markup risk).
    ...(product.rating && product.reviewCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };
}

/** FAQPage schema from a list of Q&A — for product pages, FAQ page, etc. */
export function buildFaqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function buildArticleJsonLd(post: {
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  author?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || post.title,
    image: post.coverImage,
    url: `${BASE_URL}/blogs/news/${post.slug}`,
    datePublished: post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
    dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
    author: { "@type": "Person", name: post.author || "Nutriwow Team" },
    publisher: {
      "@type": "Organization",
      name: "Nutriwow",
      logo: { "@type": "ImageObject", url: LOGO_URL },
    },
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
    })),
  };
}

export function buildCategoryJsonLd(category: string, productCount: number) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category} - Nutriwow`,
    description: `Buy premium ${category.toLowerCase()} online from Nutriwow. 100% natural, no preservatives. Free shipping across India.`,
    url: `${BASE_URL}/collections/${encodeURIComponent(category)}`,
    numberOfItems: productCount,
    provider: { "@type": "Organization", name: "Nutriwow" },
  };
}
