/**
 * Generates the social-share (Open Graph) card: client/public/og-image.png
 *
 * Why: the bare logo (600×262) was being used as og:image, so Facebook /
 * WhatsApp / Twitter center-cropped it (the "W" got cut) and the preview
 * looked broken. Social cards want a 1200×630 (1.91:1) image. This script
 * composes the logo on the brand off-white background with the tagline so
 * nothing is cropped and the preview is on-brand.
 *
 * Run:  node scripts/generate-og-image.mjs
 * Colours mirror the OKLCH design tokens in client/src/index.css.
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, "..", "client", "public");

// ── OKLCH → sRGB (Björn Ottosson) so colours match index.css exactly ──────────
function oklchToHex(L, C, H) {
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const toByte = (x) => {
    x = Math.max(0, Math.min(1, x));
    const g = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return Math.round(g * 255);
  };
  return "#" + lin.map(toByte).map((v) => v.toString(16).padStart(2, "0")).join("");
}

const C = {
  bgTop:    oklchToHex(0.985, 0.006, 75),  // --background
  bgBottom: oklchToHex(0.96, 0.02, 90),    // warm cream
  green:    oklchToHex(0.50, 0.17, 145),   // --primary
  brown:    oklchToHex(0.32, 0.02, 60),    // --clay-brown
  gold:     oklchToHex(0.80, 0.13, 85),    // gold shimmer
  clayGreen: oklchToHex(0.94, 0.05, 145),
  clayPeach: oklchToHex(0.94, 0.06, 55),
  clayButter: oklchToHex(0.95, 0.06, 90),
  clayPink:  oklchToHex(0.94, 0.05, 25),
};

const W = 1200, H = 630;
const LOGO_W = 600;
const LOGO_H = Math.round((LOGO_W * 262) / 600); // 262
const LOGO_X = Math.round((W - LOGO_W) / 2);      // 300
const LOGO_Y = 112;

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.bgTop}"/>
      <stop offset="1" stop-color="${C.bgBottom}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <!-- soft brand-pastel corner accents -->
  <circle cx="-30" cy="-30" r="210" fill="${C.clayGreen}" opacity="0.55"/>
  <circle cx="${W + 40}" cy="${H + 40}" r="230" fill="${C.clayPeach}" opacity="0.55"/>
  <circle cx="${W - 30}" cy="40" r="80" fill="${C.clayButter}" opacity="0.6"/>
  <circle cx="30" cy="${H - 30}" r="70" fill="${C.clayPink}" opacity="0.55"/>
  <!-- gold divider -->
  <rect x="${W / 2 - 50}" y="418" width="100" height="7" rx="3.5" fill="${C.gold}"/>
  <!-- tagline -->
  <text x="${W / 2}" y="482" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-weight="bold" font-size="46" fill="${C.green}">Premium Dry Fruits &amp; Healthy Snacks</text>
  <!-- features -->
  <text x="${W / 2}" y="527" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-size="25" fill="${C.brown}">100% Natural   •   No Preservatives   •   Free Shipping across India</text>
  <!-- url -->
  <text x="${W / 2}" y="590" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-weight="bold" font-size="24" fill="${C.green}" opacity="0.9">www.nutriwow.in</text>
</svg>`;

const logo = await sharp(path.join(PUBLIC, "nutriwow-logo.png"))
  .resize(LOGO_W, LOGO_H, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

await sharp(Buffer.from(svg))
  .composite([{ input: logo, left: LOGO_X, top: LOGO_Y }])
  .flatten({ background: C.bgTop })
  .png({ compressionLevel: 9 })
  .toFile(path.join(PUBLIC, "og-image.png"));

console.log("✓ wrote client/public/og-image.png  (1200×630)");
