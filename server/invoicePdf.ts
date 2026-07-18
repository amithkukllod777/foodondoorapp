/**
 * GST tax-invoice PDF generator (pdf-lib — pure JS, serverless-safe).
 * Takes the object returned by buildGSTInvoiceData and renders an A4 invoice.
 * Note: pdf-lib's standard fonts use WinAnsi encoding, which has no ₹ glyph,
 * so amounts are prefixed with "Rs.".
 *
 * Logos & stamps are fetched from the live static host (client/public) at
 * runtime and cached in-memory, so dropping a new PNG into client/public is
 * enough — no rebuild of this file needed. If a logo can't be fetched the
 * invoice still renders (text-only fallback).
 */
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, PDFImage } from "pdf-lib";

type Inv = Awaited<ReturnType<any>> & Record<string, any>;

const money = (n: number) =>
  "Rs. " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ── Logo/stamp loading ─────────────────────────────────────────────
const ASSET_BASE = (process.env.PUBLIC_SITE_URL || "https://www.foodondoor.com").replace(/\/$/, "");
const _logoCache = new Map<string, Uint8Array | null>();

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  if (_logoCache.has(url)) return _logoCache.get(url) ?? null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) {
      _logoCache.set(url, null);
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    _logoCache.set(url, buf);
    return buf;
  } catch {
    _logoCache.set(url, null);
    return null;
  }
}

// Resolve an asset to a URL: an admin-uploaded absolute URL wins; otherwise
// fall back to the static file in client/public.
function resolveAssetUrl(explicit: string | undefined, defaultFile: string): string {
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit;
  return `${ASSET_BASE}/${defaultFile}`;
}

async function embedAsset(doc: PDFDocument, url: string): Promise<PDFImage | null> {
  const bytes = await fetchBytes(url);
  if (!bytes || bytes.length < 8) return null;
  try {
    // PNG magic: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes);
    return await doc.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function generateInvoicePdf(inv: Inv): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const green = rgb(0.02, 0.42, 0.09);
  const dark = rgb(0.13, 0.13, 0.13);
  const grey = rgb(0.45, 0.45, 0.45);
  const line = rgb(0.8, 0.8, 0.8);
  const red = rgb(0.72, 0.11, 0.11);

  // Credit note (issued when an order is cancelled/refunded) vs tax invoice.
  const isCredit = inv.docType === "credit";
  const docTitle = isCredit ? "CREDIT NOTE" : "TAX INVOICE";
  const titleColor = isCredit ? red : dark;

  // Preload brand assets (parallel). Names map to files in client/public.
  // Logo/stamp URLs: admin-uploaded (inv.brandAssets) take priority, else the
  // static files in client/public.
  const ba = (inv.brandAssets || {}) as Record<string, string | undefined>;
  const [foodLogo, foodStamp, signature, nutriLogo, kuddleLogo, healthybiteLogo, nutridayLogo] = await Promise.all([
    embedAsset(doc, resolveAssetUrl(ba.foodondoorLogo, "foodondoor-logo.png")),
    embedAsset(doc, resolveAssetUrl(ba.foodondoorStamp, "foodondoor-stamp.png")),
    ba.signature ? embedAsset(doc, resolveAssetUrl(ba.signature, "signature.png")) : Promise.resolve(null),
    embedAsset(doc, resolveAssetUrl(ba.nutriwowLogo, "nutriwow-logo.png")),
    embedAsset(doc, resolveAssetUrl(ba.kuddleLogo, "kuddle-logo.png")),
    embedAsset(doc, resolveAssetUrl(ba.mrHealthybiteLogo, "mr-healthybite-logo.png")),
    embedAsset(doc, resolveAssetUrl(ba.nutridayLogo, "nutriday-logo.png")),
  ]);

  const W = 595.28;
  const M = 40; // margin
  let y = 800;

  const text = (
    p: PDFPage,
    s: string,
    x: number,
    yy: number,
    opts: { size?: number; f?: PDFFont; color?: any } = {},
  ) => p.drawText(String(s ?? ""), { x, y: yy, size: opts.size ?? 9, font: opts.f ?? font, color: opts.color ?? dark });

  const right = (
    p: PDFPage,
    s: string,
    xRight: number,
    yy: number,
    opts: { size?: number; f?: PDFFont; color?: any } = {},
  ) => {
    const f = opts.f ?? font;
    const size = opts.size ?? 9;
    const w = f.widthOfTextAtSize(String(s ?? ""), size);
    text(p, s, xRight - w, yy, opts);
  };

  const hr = (yy: number) =>
    page.drawLine({ start: { x: M, y: yy }, end: { x: W - M, y: yy }, thickness: 0.7, color: line });

  // Draw a logo scaled to fit within maxW×maxH, top-left anchored at (x, topY).
  // Returns the drawn height so callers can advance layout.
  const drawLogo = (img: PDFImage | null, x: number, topY: number, maxW: number, maxH: number): number => {
    if (!img) return 0;
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    page.drawImage(img, { x, y: topY - h, width: w, height: h });
    return h;
  };

  // ── Header: Foodondoor company logo (top-left), then TAX INVOICE ──
  const logoTop = y + 8;
  const fH = drawLogo(foodLogo, M, logoTop, 300, 80); // 2× bigger header logo

  if (fH > 0) {
    // Company text sits just under the Foodondoor logo
    y = logoTop - fH - 6;
    text(page, inv.seller?.legalName || "Foodondoor Private Limited", M, y, { size: 9, f: bold, color: dark });
    right(page, docTitle, W - M, logoTop - 4, { size: 16, f: bold, color: titleColor });
    right(page, `${isCredit ? "Credit Note" : "Invoice"}: ${inv.invoiceNumber}`, W - M, logoTop - 20, { size: 9, color: grey });
    right(page, `Date: ${inv.invoiceDate}`, W - M, logoTop - 32, { size: 9, color: grey });
    y -= 11;
    text(page, `GSTIN: ${inv.seller?.gstin || ""}`, M, y, { size: 8, color: grey });
    right(page, `Order: #${inv.orderId}`, W - M, y, { size: 9, color: grey });
    y -= 10;
    text(page, inv.seller?.address || "", M, y, { size: 8, color: grey });
    y -= 14;
  } else {
    // Text-only fallback (no logo available)
    text(page, inv.seller?.legalName || "Foodondoor Private Limited", M, y, { size: 18, f: bold, color: dark });
    right(page, docTitle, W - M, y, { size: 16, f: bold, color: titleColor });
    y -= 16;
    text(page, isCredit ? "GST credit note" : "GST tax invoice", M, y, { size: 9, color: grey });
    right(page, `Invoice: ${inv.invoiceNumber}`, W - M, y, { size: 9, color: grey });
    y -= 12;
    text(page, `GSTIN: ${inv.seller?.gstin || ""}`, M, y, { size: 9, color: grey });
    right(page, `Date: ${inv.invoiceDate}`, W - M, y, { size: 9, color: grey });
    y -= 12;
    text(page, inv.seller?.address || "", M, y, { size: 8, color: grey });
    right(page, `Order: #${inv.orderId}`, W - M, y, { size: 9, color: grey });
    y -= 14;
  }
  hr(y);
  y -= 16;

  // ── Bill to ──
  text(page, "BILL TO", M, y, { size: 9, f: bold, color: green });
  y -= 13;
  text(page, inv.buyer?.name || "", M, y, { size: 10, f: bold });
  y -= 12;
  const addr = [inv.buyer?.address, inv.buyer?.city, inv.buyer?.state, inv.buyer?.pincode]
    .filter(Boolean)
    .join(", ");
  text(page, addr, M, y, { size: 8.5, color: grey });
  y -= 11;
  text(page, `Phone: +91 ${inv.buyer?.phone || ""}`, M, y, { size: 8.5, color: grey });
  if (inv.buyer?.email) {
    right(page, inv.buyer.email, W - M, y, { size: 8.5, color: grey });
  }
  y -= 16;

  // ── Items table ──
  const inter = inv.isInterState === true;
  // Column x positions
  const cX = { sno: M, desc: M + 22, hsn: 300, qty: 340, rate: 375, taxable: 425, tax: 485, total: W - M };
  // Header row
  page.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: 16, color: rgb(0.94, 0.97, 0.94) });
  text(page, "#", cX.sno + 2, y, { size: 8, f: bold });
  text(page, "Item", cX.desc, y, { size: 8, f: bold });
  text(page, "HSN", cX.hsn, y, { size: 8, f: bold });
  text(page, "Qty", cX.qty, y, { size: 8, f: bold });
  right(page, "Rate", cX.rate + 28, y, { size: 8, f: bold });
  right(page, "Taxable", cX.taxable + 45, y, { size: 8, f: bold });
  right(page, inter ? "IGST" : "GST", cX.tax + 30, y, { size: 8, f: bold });
  right(page, "Total", cX.total, y, { size: 8, f: bold });
  y -= 18;

  for (const it of inv.items || []) {
    const taxAmt = inter ? it.igst : (it.cgst || 0) + (it.sgst || 0);
    const desc = String(it.description || "").slice(0, 42);
    text(page, String(it.sno), cX.sno + 2, y, { size: 8 });
    text(page, desc, cX.desc, y, { size: 8 });
    text(page, String(it.hsn || "0801"), cX.hsn, y, { size: 8, color: grey });
    text(page, String(it.qty), cX.qty + 2, y, { size: 8 });
    right(page, money(it.rate), cX.rate + 28, y, { size: 8 });
    right(page, money(it.taxableValue), cX.taxable + 45, y, { size: 8 });
    right(page, money(taxAmt), cX.tax + 30, y, { size: 8 });
    right(page, money(it.lineTotal), cX.total, y, { size: 8 });
    y -= 14;
    if (y < 200) break; // simple single-page guard (leave room for stamps)
  }
  y -= 4;
  hr(y);
  y -= 16;

  // ── Totals (right aligned block) ──
  const labelX = 360;
  const valX = W - M;
  const row = (label: string, val: string, opts: { f?: PDFFont; color?: any; size?: number } = {}) => {
    text(page, label, labelX, y, { size: opts.size ?? 9, f: opts.f, color: opts.color });
    right(page, val, valX, y, { size: opts.size ?? 9, f: opts.f, color: opts.color });
    y -= 14;
  };
  row("Taxable Value", money(inv.totalTaxableValue));
  if (inter) {
    row("IGST", money(inv.totalIGST));
  } else {
    row("CGST", money(inv.totalCGST));
    row("SGST", money(inv.totalSGST));
  }
  if (inv.shipping > 0) row("Shipping", money(inv.shipping));
  if (inv.couponDiscount > 0) row("Discount", "- " + money(inv.couponDiscount), { color: green });
  y -= 2;
  hr(y + 8);
  row(isCredit ? "Total Credited (incl. GST)" : "Grand Total (incl. GST)", money(inv.grandTotal), {
    f: bold,
    size: 11,
    color: isCredit ? red : green,
  });

  y -= 10;
  text(page, `Payment: ${inv.paymentMethod || "Online"}   |   Status: ${inv.status || "placed"}`, M, y, {
    size: 8.5,
    color: grey,
  });
  if (isCredit) {
    y -= 12;
    text(page, `Against Invoice: ${inv.originalInvoiceNumber || inv.invoiceNumber}   |   Reason: ${inv.creditReason || "Order cancelled"}`, M, y, {
      size: 8.5,
      color: red,
    });
  }
  y -= 20;
  hr(y);
  y -= 12;
  text(page, isCredit
    ? "This is a computer-generated credit note issued against the above tax invoice for the cancelled/refunded order."
    : "This is a computer-generated tax invoice. GST charged as per applicable HSN rates (see line items).", M, y, {
    size: 7.5,
    color: grey,
  });
  y -= 11;
  text(page, `Thank you for shopping with ${inv.seller?.name || "Foodondoor"}!  ${inv.seller?.email || ""}`, M, y, {
    size: 8,
    color: green,
    f: bold,
  });

  // ── Brands strip (bottom-LEFT): the brands that sit under Foodondoor —
  // Foodondoor, Kuddle Super Meal, Mr Healthybite. ──
  const headY = 155;
  text(page, "OUR BRANDS", M, headY, { size: 8, f: bold, color: green });
  const brandRow: Array<{ img: PDFImage | null; name: string }> = [
    { img: nutriLogo, name: "Foodondoor" },
    { img: kuddleLogo, name: "Kuddle" },
    { img: healthybiteLogo, name: "Mr Healthybite" },
    { img: nutridayLogo, name: "Nutriday" },
  ];
  const cellW = 66;
  const cellH = 40;
  const cellTop = headY - 12;
  brandRow.forEach((b, i) => {
    const cx = M + cellW * i + cellW / 2;
    const midCellY = cellTop - cellH / 2;
    if (b.img) {
      const scale = Math.min((cellW - 8) / b.img.width, cellH / b.img.height);
      const w = b.img.width * scale;
      const h = b.img.height * scale;
      page.drawImage(b.img, { x: cx - w / 2, y: midCellY - h / 2, width: w, height: h });
    } else {
      const w = font.widthOfTextAtSize(b.name, 6.5);
      text(page, b.name, cx - w / 2, midCellY - 3, { size: 6.5, color: grey });
    }
  });

  // ── Signatory block (bottom-RIGHT): "For <legal name>", the Foodondoor round
  // stamp and the uploaded digital signature sit together above the signature
  // line and "Authorised Signatory". ──
  const legal = inv.seller?.legalName || "Foodondoor Private Limited";
  right(page, "For " + legal, W - M, headY, { size: 9, f: bold, color: dark });

  const stampBox = 66;
  const stampCx = W - M - stampBox / 2;         // stamp hugs the right margin
  const midY = headY - 14 - stampBox / 2;        // vertical centre of stamp/sign
  // Round company stamp (right)
  if (foodStamp) {
    const scale = Math.min(stampBox / foodStamp.width, stampBox / foodStamp.height);
    const w = foodStamp.width * scale;
    const h = foodStamp.height * scale;
    page.drawImage(foodStamp, { x: stampCx - w / 2, y: midY - h / 2, width: w, height: h });
  } else {
    page.drawEllipse({ x: stampCx, y: midY, xScale: stampBox / 2, yScale: stampBox / 2, borderColor: line, borderWidth: 1 });
    const lbl = "Company Seal";
    const w = font.widthOfTextAtSize(lbl, 6.5);
    text(page, lbl, stampCx - w / 2, midY - 3, { size: 6.5, color: grey });
  }
  // Digital signature (to the left of the stamp)
  if (signature) {
    const maxW = 96, maxH = 40;
    const scale = Math.min(maxW / signature.width, maxH / signature.height);
    const w = signature.width * scale;
    const h = signature.height * scale;
    const sigRight = stampCx - stampBox / 2 - 6; // just left of the stamp
    page.drawImage(signature, { x: sigRight - w, y: midY - h / 2, width: w, height: h });
  }
  // Signature line + label
  const lineY = midY - stampBox / 2 - 6;
  page.drawLine({ start: { x: W - M - 190, y: lineY }, end: { x: W - M, y: lineY }, thickness: 0.6, color: line });
  right(page, "Authorised Signatory", W - M, lineY - 11, { size: 7.5, color: grey });

  // ── KukBook footer ──
  const footY = 40;
  page.drawLine({ start: { x: M, y: footY + 12 }, end: { x: W - M, y: footY + 12 }, thickness: 0.7, color: line });
  const footTxt = "Generated by KukBook - a Kuklabs Inc. Product.";
  const fw = font.widthOfTextAtSize(footTxt, 8);
  text(page, footTxt, (W - fw) / 2, footY, { size: 8, color: grey });

  return doc.save();
}
