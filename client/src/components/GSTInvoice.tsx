/*
 * Nutriwow - GST Compliant Invoice Component
 * Printable tax invoice with CGST/SGST or IGST breakdown.
 * Opens in a new window for print/PDF via window.print().
 */

/** GST invoice data shape returned by the server procedure */
export interface GSTInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  orderId: string;
  orderDate: string;

  // Seller
  seller: {
    name: string;        // "Nutriwow"
    legalName: string;   // "Foodondoor Private Limited"
    gstin: string;
    address: string;
    state: string;
    email: string;
  };

  // Buyer / Customer
  buyer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };

  // Line items with tax
  items: {
    sno: number;
    description: string;
    hsn: string;
    qty: number;
    rate: number;          // unit price (inclusive)
    taxableValue: number;  // rate * qty  / 1.05 (GST extracted)
    cgst: number;
    sgst: number;
    igst: number;
    lineTotal: number;     // taxableValue + cgst + sgst + igst
  }[];

  // Totals
  subtotal: number;
  couponDiscount: number;
  shipping: number;
  totalTaxableValue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  grandTotal: number;

  isInterState: boolean;
  paymentMethod: string;
  status: string;
}

/**
 * Opens a new window with a printable GST invoice and triggers print.
 */
export function openGSTInvoice(data: GSTInvoiceData) {
  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) {
    alert("Please allow popups to view the GST invoice.");
    return;
  }

  const {
    invoiceNumber, invoiceDate, orderId, orderDate,
    seller, buyer, items,
    subtotal, couponDiscount, shipping,
    totalTaxableValue, totalCGST, totalSGST, totalIGST, grandTotal,
    isInterState, paymentMethod, status,
  } = data;

  const fmt = (v: number) => "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // SECURITY: escape every interpolated string. Buyer/item fields are
  // customer-controlled and this HTML runs in a same-origin popup (incl. the
  // admin's session when staff open an order's invoice) — unescaped values are
  // stored XSS.
  const esc = (s: unknown) => String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>GST Invoice ${esc(invoiceNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; padding: 24px; max-width: 900px; margin: 0 auto; }

    .inv-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2e7d32; padding-bottom: 16px; margin-bottom: 20px; }
    .inv-brand { color: #2e7d32; font-size: 24px; font-weight: 800; }
    .inv-brand-sub { color: #666; font-size: 11px; margin-top: 2px; line-height: 1.6; }
    .inv-title { text-align: right; }
    .inv-title h2 { font-size: 18px; color: #2e7d32; font-weight: 800; letter-spacing: 1px; }
    .inv-title p { font-size: 12px; color: #555; margin-top: 3px; }

    .inv-parties { display: flex; gap: 24px; margin-bottom: 20px; }
    .inv-party { flex: 1; }
    .inv-party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #888; letter-spacing: 0.08em; margin-bottom: 6px; }
    .inv-party-box { background: #f8faf8; border: 1px solid #e8e8e8; border-radius: 8px; padding: 12px; font-size: 12px; line-height: 1.7; }
    .inv-party-box strong { font-size: 13px; color: #222; }

    .inv-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
    .inv-table th { background: #e8f5e9; color: #2e7d32; padding: 8px 6px; text-align: right; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #c8e6c9; }
    .inv-table th:nth-child(1), .inv-table th:nth-child(2), .inv-table th:nth-child(3) { text-align: left; }
    .inv-table td { padding: 7px 6px; border-bottom: 1px solid #f0f0f0; text-align: right; }
    .inv-table td:nth-child(1), .inv-table td:nth-child(2), .inv-table td:nth-child(3) { text-align: left; }
    .inv-table tbody tr:last-child td { border-bottom: 2px solid #c8e6c9; }

    .inv-summary { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .inv-summary table { width: 320px; font-size: 12px; }
    .inv-summary td { padding: 5px 8px; }
    .inv-summary td:first-child { color: #666; }
    .inv-summary td:last-child { text-align: right; font-weight: 600; }
    .inv-summary .grand-total td { font-size: 15px; font-weight: 800; color: #2e7d32; border-top: 2px solid #2e7d32; padding-top: 10px; }

    .inv-footer { margin-top: 24px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 14px; line-height: 1.7; }
    .inv-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; background: #e8f5e9; color: #2e7d32; }

    @media print {
      body { padding: 10px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="inv-header">
    <div>
      <div class="inv-brand">Nutriwow</div>
      <div class="inv-brand-sub">
        ${esc(seller.legalName)}<br/>
        ${esc(seller.address)}<br/>
        ${seller.gstin ? `GSTIN: ${esc(seller.gstin)}<br/>` : ""}
        ${esc(seller.email)}
      </div>
    </div>
    <div class="inv-title">
      <h2>TAX INVOICE</h2>
      <p>
        Invoice: <strong>${esc(invoiceNumber)}</strong><br/>
        Date: ${esc(invoiceDate)}<br/>
        Order: #${esc(orderId)}<br/>
        Order Date: ${esc(orderDate)}<br/>
        <span class="inv-badge">${esc(status.charAt(0).toUpperCase() + status.slice(1))}</span>
      </p>
    </div>
  </div>

  <div class="inv-parties">
    <div class="inv-party">
      <div class="inv-party-label">Bill To</div>
      <div class="inv-party-box">
        <strong>${esc(buyer.name)}</strong><br/>
        ${esc(buyer.phone)}<br/>
        ${esc(buyer.email || "")}
      </div>
    </div>
    <div class="inv-party">
      <div class="inv-party-label">Ship To</div>
      <div class="inv-party-box">
        <strong>${esc(buyer.name)}</strong><br/>
        ${esc(buyer.address)}<br/>
        ${esc(buyer.city)}, ${esc(buyer.state)} - ${esc(buyer.pincode)}
      </div>
    </div>
  </div>

  <table class="inv-table">
    <thead>
      <tr>
        <th>S.No</th>
        <th>Description</th>
        <th>HSN</th>
        <th>Qty</th>
        <th>Rate</th>
        <th>Taxable Value</th>
        ${isInterState
          ? `<th>IGST @5%</th>`
          : `<th>CGST @2.5%</th><th>SGST @2.5%</th>`}
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${item.sno}</td>
          <td>${esc(item.description)}</td>
          <td>${esc(item.hsn)}</td>
          <td>${item.qty}</td>
          <td>${fmt(item.rate)}</td>
          <td>${fmt(item.taxableValue)}</td>
          ${isInterState
            ? `<td>${fmt(item.igst)}</td>`
            : `<td>${fmt(item.cgst)}</td><td>${fmt(item.sgst)}</td>`}
          <td>${fmt(item.lineTotal)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="inv-summary">
    <table>
      <tr><td>Subtotal (Taxable)</td><td>${fmt(totalTaxableValue)}</td></tr>
      ${isInterState
        ? `<tr><td>IGST @5%</td><td>${fmt(totalIGST)}</td></tr>`
        : `<tr><td>CGST @2.5%</td><td>${fmt(totalCGST)}</td></tr>
           <tr><td>SGST @2.5%</td><td>${fmt(totalSGST)}</td></tr>`}
      ${couponDiscount > 0 ? `<tr><td>Coupon Discount</td><td style="color:#2e7d32">-${fmt(couponDiscount)}</td></tr>` : ""}
      <tr><td>Shipping</td><td>${shipping === 0 ? '<span style="color:#2e7d32">FREE</span>' : fmt(shipping)}</td></tr>
      <tr class="grand-total"><td>Grand Total</td><td>${fmt(grandTotal)}</td></tr>
      <tr><td>Payment Method</td><td>${esc(paymentMethod)}</td></tr>
    </table>
  </div>

  <div class="inv-footer">
    This is a computer-generated invoice and does not require a physical signature.<br/>
    Thank you for shopping with Nutriwow! For queries: ${esc(seller.email)}<br/>
    www.nutriwow.in
  </div>

  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}
