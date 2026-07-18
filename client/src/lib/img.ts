// Route remote images through Vercel's Image Optimization so large source images
// (some product images are 10+ MB) are resized to display size and served as
// WebP — typically dropping them from megabytes to tens of kilobytes.
//
// Non-remote inputs (data:, blob:, relative paths) and already-optimized URLs
// pass through unchanged. The `width` MUST be one of the sizes configured in
// vercel.json -> images.sizes, otherwise the optimizer rejects the request.
export function optImg(src?: string | null, width = 640, quality = 72): string {
  if (!src) return "";
  if (!/^https?:\/\//i.test(src)) return src; // data:/blob:/relative
  if (src.startsWith("/_vercel/image")) return src; // already optimized
  return `/_vercel/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

// For SEO / Open Graph / structured data / Google Merchant: return the LARGEST
// available version of an image (NOT a resized one). Google Drive links
// ("lh3.googleusercontent.com/d/ID" or "drive.google.com/.../id=ID") serve a small
// thumbnail by default — force a large size so Google counts them as high-resolution.
// Also undoes any Vercel image-optimization wrapper to recover the original.
export function hiRes(src?: string | null): string {
  if (!src) return "";
  let u = src;
  if (u.startsWith("/_vercel/image")) {
    try {
      const q = new URLSearchParams(u.split("?")[1] || "");
      u = decodeURIComponent(q.get("url") || u);
    } catch { /* keep u */ }
  }
  // googleusercontent /d/<id>[=size] → force large
  const g = u.match(/lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]+)/);
  if (g) return `https://lh3.googleusercontent.com/d/${g[1]}=s1600`;
  // drive.google.com file or ?id= → large googleusercontent form
  const d = u.match(/drive\.google\.com\/(?:file\/d\/|[^?]*[?&]id=)([A-Za-z0-9_-]+)/);
  if (d) return `https://lh3.googleusercontent.com/d/${d[1]}=s1600`;
  return u;
}

// Single shared fallback for blog posts that have no cover image set, so the
// SAME placeholder shows everywhere (home "New Reads" card, blog listing, and
// the post page) instead of three different stock photos.
export const BLOG_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=1200&q=80";

