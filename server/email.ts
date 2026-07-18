import nodemailer from "nodemailer";
import { ENV as env } from "./_core/env";
import { isNotificationEnabled, getStoreSetting, createEmailLog } from "./db";

/** HTML-escape untrusted text before interpolating into email markup, so a
 * customer-controlled order field (name/address/etc.) can't inject markup into
 * the customer's confirmation email or the operator's admin notification. */
export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Transporter ────────────────────────────────────────────────────────────

let _transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function createTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: false, // TLS on port 587
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface OrderEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  address: string;
  paymentMethod: string;
  orderDate: string;
}

export interface ShippingEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  awbNumber: string;
  courierName: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

export interface OtpEmailData {
  customerEmail: string;
  otp: string;
  purpose?: string; // "login" | "verify"
}

// ─── Shared Styles ───────────────────────────────────────────────────────────

const baseStyle = `
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #f5f5f5;
  margin: 0;
  padding: 0;
`;

const containerStyle = `
  max-width: 600px;
  margin: 32px auto;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
`;

const headerStyle = `
  background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
  padding: 28px 32px;
  text-align: center;
`;

const footerStyle = `
  background: #f9f9f9;
  border-top: 1px solid #e8e8e8;
  padding: 20px 32px;
  text-align: center;
  font-size: 12px;
  color: #888;
`;

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nutriwow</title>
</head>
<body style="${baseStyle}">
  <div style="${containerStyle}">
    <div style="${headerStyle}">
      <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663511606631/CdmiS9X3tpMWG6J8LrtNoP/nutriwow-logo-white_b0839a83.png"
           alt="Nutriwow" height="180" width="auto"
           style="display:block;margin:0 auto 4px;max-width:320px;"
           onerror="this.style.display='none'" />
      <h1 style="color:#fff;margin:8px 0 0;font-size:22px;font-weight:700;letter-spacing:0.5px;">
        Nutriwow
      </h1>
      <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">
        Premium Dry Fruits &amp; Healthy Snacks
      </p>
    </div>
    ${content}
    <div style="${footerStyle}">
      <p style="margin:0 0 4px;">
        &copy; ${new Date().getFullYear()} Nutriwow | 
        <a href="https://www.nutriwow.in" style="color:#43a047;text-decoration:none;">www.nutriwow.in</a>
      </p>
      <p style="margin:0;">
        Questions? Email us at 
        <a href="mailto:wecare@nutriwow.in" style="color:#43a047;text-decoration:none;">wecare@nutriwow.in</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Order Confirmation Template ─────────────────────────────────────────────

function orderConfirmationHtml(data: OrderEmailData): string {
  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div>
            <p style="margin:0;font-size:14px;font-weight:600;color:#222;">${esc(item.name)}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#888;">Qty: ${item.quantity}</p>
          </div>
        </div>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;font-weight:600;color:#222;">
        ₹${(item.price * item.quantity).toLocaleString("en-IN")}
      </td>
    </tr>`
    )
    .join("");

  const content = `
    <div style="padding:28px 32px;">
      <div style="background:#e8f5e9;border-radius:8px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:24px;">🎉</span>
        <div>
          <p style="margin:0;font-size:16px;font-weight:700;color:#2e7d32;">Order Confirmed!</p>
          <p style="margin:2px 0 0;font-size:13px;color:#555;">
            Hi ${esc(data.customerName)}, your order has been placed successfully.
          </p>
        </div>
      </div>

      <div style="background:#f9f9f9;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;font-size:13px;color:#888;">Order ID</p>
        <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#222;">#${data.orderId}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#888;">${data.orderDate}</p>
      </div>

      <h3 style="font-size:15px;font-weight:700;color:#222;margin:0 0 12px;">Order Summary</h3>
      <table style="width:100%;border-collapse:collapse;">
        ${itemsHtml}
      </table>

      <div style="margin-top:16px;padding-top:16px;border-top:2px solid #f0f0f0;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:13px;color:#666;">Subtotal</span>
          <span style="font-size:13px;color:#222;">₹${data.subtotal.toLocaleString("en-IN")}</span>
        </div>
        ${
          data.discount > 0
            ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:13px;color:#e53935;">Discount</span>
          <span style="font-size:13px;color:#e53935;">-₹${data.discount.toLocaleString("en-IN")}</span>
        </div>`
            : ""
        }
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:13px;color:#666;">Shipping</span>
          <span style="font-size:13px;color:#222;">${data.shipping === 0 ? "FREE" : `₹${data.shipping}`}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid #e0e0e0;">
          <span style="font-size:15px;font-weight:700;color:#222;">Total</span>
          <span style="font-size:15px;font-weight:700;color:#2e7d32;">₹${data.total.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div style="margin-top:20px;background:#f9f9f9;border-radius:8px;padding:14px 18px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#222;">📦 Delivery Address</p>
        <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">${esc(data.address)}</p>
      </div>

      <div style="margin-top:12px;background:#f9f9f9;border-radius:8px;padding:14px 18px;">
        <p style="margin:0;font-size:13px;color:#555;">
          💳 Payment: <strong>${esc(data.paymentMethod)}</strong>
        </p>
      </div>

      <div style="margin-top:24px;text-align:center;">
        <a href="https://www.nutriwow.in/track-order?orderId=${encodeURIComponent(data.orderId)}"
           style="display:inline-block;background:#43a047;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;">
          Track Your Order →
        </a>
      </div>
      <p style="text-align:center;font-size:12px;color:#888;margin-top:8px;">Order ID: #${data.orderId}</p>
    </div>`;

  return emailWrapper(content);
}

// ─── Shipping Update Template ─────────────────────────────────────────────────

function shippingUpdateHtml(data: ShippingEmailData): string {
  const content = `
    <div style="padding:28px 32px;">
      <div style="background:#e3f2fd;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:16px;font-weight:700;color:#1565c0;">🚚 Your Order is on the Way!</p>
        <p style="margin:6px 0 0;font-size:13px;color:#555;">
          Hi ${data.customerName}, your order #${data.orderId} has been shipped.
        </p>
      </div>

      <div style="background:#f9f9f9;border-radius:8px;padding:18px;margin-bottom:20px;">
        <div style="margin-bottom:12px;">
          <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Courier Partner</p>
          <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#222;">${data.courierName}</p>
        </div>
        <div>
          <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">AWB / Tracking Number</p>
          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#1565c0;letter-spacing:1px;">${data.awbNumber}</p>
        </div>
        ${
          data.estimatedDelivery
            ? `<div style="margin-top:12px;">
          <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Estimated Delivery</p>
          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#2e7d32;">${data.estimatedDelivery}</p>
        </div>`
            : ""
        }
      </div>

      <div style="text-align:center;">
        <a href="${data.trackingUrl || `https://www.nutriwow.in/track-order?orderId=${encodeURIComponent(data.orderId)}`}"
           style="display:inline-block;background:#1565c0;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;">
          Track Shipment →
        </a>
      </div>

      <p style="margin-top:20px;font-size:13px;color:#888;text-align:center;">
        You can also track your order at 
        <a href="https://www.nutriwow.in/track-order?orderId=${encodeURIComponent(data.orderId)}" style="color:#43a047;">www.nutriwow.in/track-order</a>
      </p>
    </div>`;

  return emailWrapper(content);
}

// ─── OTP Template ─────────────────────────────────────────────────────────────

function otpHtml(data: OtpEmailData): string {
  const content = `
    <div style="padding:28px 32px;text-align:center;">
      <p style="font-size:16px;color:#333;margin:0 0 8px;">
        Your verification code for Nutriwow
      </p>
      <p style="font-size:13px;color:#888;margin:0 0 28px;">
        ${data.purpose === "login" ? "Use this OTP to login to your account." : "Use this OTP to verify your account."}
      </p>

      <div style="background:#f1f8e9;border:2px dashed #43a047;border-radius:12px;padding:24px;display:inline-block;margin-bottom:24px;">
        <p style="margin:0;font-size:40px;font-weight:800;color:#2e7d32;letter-spacing:8px;">${data.otp}</p>
      </div>

      <p style="font-size:13px;color:#888;margin:0 0 4px;">This OTP is valid for <strong>10 minutes</strong>.</p>
      <p style="font-size:13px;color:#e53935;margin:0;">
        Do not share this OTP with anyone.
      </p>
    </div>`;

  return emailWrapper(content);
}

// ─── Resend-aware transactional send ─────────────────────────────────────────

async function sendTransactionalEmail(
  to: string,
  subject: string,
  html: string,
  txnType?: string,
  attachments?: { filename: string; content: Buffer }[],
): Promise<boolean> {
  let resendKey = await getStoreSetting("resendApiKey") as string | null;
  if (typeof resendKey === "string") { try { resendKey = JSON.parse(resendKey); } catch { /* keep */ } }
  let resendFrom = await getStoreSetting("resendFrom") as string | null;
  if (typeof resendFrom === "string") { try { resendFrom = JSON.parse(resendFrom); } catch { /* keep */ } }
  const apiKey = (typeof resendKey === "string" ? resendKey.trim() : "") || env.resendApiKey;
  const from = (typeof resendFrom === "string" ? resendFrom.trim() : "") || env.resendFrom;

  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: from || `Nutriwow <onboarding@resend.dev>`,
          to,
          subject,
          html,
          ...(attachments && attachments.length
            ? { attachments: attachments.map(a => ({ filename: a.filename, content: a.content.toString("base64") })) }
            : {}),
        }),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`[Email] Resend transactional FAILED to ${to}:`, data?.message || res.status);
        if (txnType) createEmailLog(txnType, to, undefined, data?.message || `Resend ${res.status}`).catch(() => {});
        return false;
      }
      console.log(`[Email] resend(txn) -> ${to} | id=${data?.id}`);
      if (txnType) createEmailLog(txnType, to, data?.id).catch(() => {});
      return true;
    } catch (err: any) {
      console.error(`[Email] Resend transactional error to ${to}:`, err);
      if (txnType) createEmailLog(txnType, to, undefined, err?.message || "Resend error").catch(() => {});
      return false;
    }
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"Nutriwow" <${env.SMTP_USER}>`,
      to,
      subject,
      html,
      ...(attachments && attachments.length ? { attachments } : {}),
    });
    console.log(`[Email] smtp(txn) -> ${to}`);
    if (txnType) createEmailLog(txnType, to, info?.messageId).catch(() => {});
    return true;
  } catch (err: any) {
    console.error(`[Email] SMTP transactional FAILED to ${to}:`, err);
    if (txnType) createEmailLog(txnType, to, undefined, err?.message || "SMTP error").catch(() => {});
    return false;
  }
}

// ─── Send Functions ───────────────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(
  data: OrderEmailData,
  invoicePdf?: Buffer,
): Promise<boolean> {
  if (!(await isNotificationEnabled("newOrder"))) return false;
  return sendTransactionalEmail(
    data.customerEmail,
    `Order Confirmed ✅ #${data.orderId} — Nutriwow`,
    orderConfirmationHtml(data),
    `order-${data.orderId}`,
    invoicePdf ? [{ filename: `Invoice-${data.orderId}.pdf`, content: invoicePdf }] : undefined,
  );
}

export async function sendShippingUpdateEmail(data: ShippingEmailData): Promise<boolean> {
  if (!(await isNotificationEnabled("orderShipped"))) return false;
  return sendTransactionalEmail(
    data.customerEmail,
    `Your Order #${data.orderId} is Shipped 🚚 — Nutriwow`,
    shippingUpdateHtml(data),
    `shipping-${data.orderId}`,
  );
}

// ─── Order Cancellation + Refund emails ────────────────────────────────────
export async function sendOrderCancelledEmail(
  data: { orderId: string; customerName: string; customerEmail: string; total: number; reason?: string; paymentMethod?: string },
  creditNotePdf?: Buffer,
): Promise<boolean> {
  const prepaid = data.paymentMethod && !/cod/i.test(data.paymentMethod);
  const content = `
    <div style="padding:28px;">
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#b71c1c;">Order Cancelled</h2>
      <p style="margin:0 0 14px;font-size:14px;color:#333;">Hi ${data.customerName || "there"}, your order <b>#${data.orderId}</b> has been cancelled.</p>
      <table style="width:100%;font-size:13px;color:#444;border-collapse:collapse;">
        <tr><td style="padding:6px 0;">Order</td><td style="text-align:right;font-weight:600;">#${data.orderId}</td></tr>
        <tr><td style="padding:6px 0;">Amount</td><td style="text-align:right;font-weight:600;">₹${data.total}</td></tr>
        ${data.reason ? `<tr><td style="padding:6px 0;">Reason</td><td style="text-align:right;">${data.reason}</td></tr>` : ""}
      </table>
      <p style="margin:16px 0 0;font-size:13px;color:#555;">
        A <b>credit note</b> for this cancellation is attached.
        ${prepaid ? "Your refund (if paid online) will be processed to the original payment method within 5-7 business days." : ""}
      </p>
      <p style="margin:14px 0 0;font-size:13px;color:#1b5e20;font-weight:600;">Team Nutriwow</p>
    </div>`;
  return sendTransactionalEmail(
    data.customerEmail,
    `Order #${data.orderId} Cancelled — Nutriwow`,
    emailWrapper(content),
    `cancel-${data.orderId}`,
    creditNotePdf ? [{ filename: `CreditNote-${data.orderId}.pdf`, content: creditNotePdf }] : undefined,
  );
}

export async function sendRefundEmail(
  data: { orderId: string; customerName: string; customerEmail: string; refundAmount: number; status?: string },
  creditNotePdf?: Buffer,
): Promise<boolean> {
  const content = `
    <div style="padding:28px;">
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#1b5e20;">Refund Processed 💸</h2>
      <p style="margin:0 0 14px;font-size:14px;color:#333;">Hi ${data.customerName || "there"}, we've processed a refund for your order <b>#${data.orderId}</b>.</p>
      <table style="width:100%;font-size:13px;color:#444;border-collapse:collapse;">
        <tr><td style="padding:6px 0;">Order</td><td style="text-align:right;font-weight:600;">#${data.orderId}</td></tr>
        <tr><td style="padding:6px 0;">Refund Amount</td><td style="text-align:right;font-weight:700;color:#1b5e20;">₹${data.refundAmount}</td></tr>
        ${data.status ? `<tr><td style="padding:6px 0;">Type</td><td style="text-align:right;text-transform:capitalize;">${data.status} refund</td></tr>` : ""}
      </table>
      <p style="margin:16px 0 0;font-size:13px;color:#555;">
        The amount will reflect in your original payment method within 5-7 business days. A credit note is attached for your records.
      </p>
      <p style="margin:14px 0 0;font-size:13px;color:#1b5e20;font-weight:600;">Team Nutriwow</p>
    </div>`;
  return sendTransactionalEmail(
    data.customerEmail,
    `Refund of ₹${data.refundAmount} for Order #${data.orderId} — Nutriwow`,
    emailWrapper(content),
    `refund-${data.orderId}`,
    creditNotePdf ? [{ filename: `CreditNote-${data.orderId}.pdf`, content: creditNotePdf }] : undefined,
  );
}

export async function sendOtpEmail(data: OtpEmailData): Promise<boolean> {
  return sendTransactionalEmail(
    data.customerEmail,
    `${data.otp} is your Nutriwow OTP`,
    otpHtml(data),
    "otp",
  );
}

// ─── Welcome Email for Newsletter Subscribers ──────────────────────────────

function welcomeEmailHtml(name?: string): string {
  const greeting = name ? `Hi ${name}!` : "Hi there!";
  const content = `
    <!-- Welcome Banner -->
    <div style="background:linear-gradient(135deg,#e8f5e9 0%,#c8e6c9 100%);padding:32px 28px;text-align:center;">
      <div style="font-size:48px;margin-bottom:8px;">🎉</div>
      <h2 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#1b5e20;letter-spacing:-0.5px;">
        Welcome to the Nutriwow Family!
      </h2>
      <p style="margin:0;font-size:15px;color:#2e7d32;font-weight:500;">
        ${greeting} You're now part of India's premium dry fruits community.
      </p>
    </div>

    <div style="padding:28px 32px;">
      <!-- What You Get -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:12px 16px;background:#f1f8e9;border-radius:8px 8px 0 0;border-bottom:1px solid #e8f5e9;">
            <table style="width:100%"><tr>
              <td style="width:32px;vertical-align:top;font-size:20px;">✅</td>
              <td style="font-size:13px;color:#333;line-height:1.5;"><strong style="color:#2e7d32;">Early Access</strong> — Be the first to know about new product launches</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;background:#fff8e1;border-bottom:1px solid #fff3cd;">
            <table style="width:100%"><tr>
              <td style="width:32px;vertical-align:top;font-size:20px;">🏷️</td>
              <td style="font-size:13px;color:#333;line-height:1.5;"><strong style="color:#e65100;">Exclusive Discounts</strong> — Special offers only for our subscribers</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;background:#e3f2fd;border-bottom:1px solid #bbdefb;">
            <table style="width:100%"><tr>
              <td style="width:32px;vertical-align:top;font-size:20px;">🎁</td>
              <td style="font-size:13px;color:#333;line-height:1.5;"><strong style="color:#1565c0;">Seasonal Deals</strong> — Festival specials on premium dry fruits & gift boxes</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;background:#fce4ec;border-radius:0 0 8px 8px;">
            <table style="width:100%"><tr>
              <td style="width:32px;vertical-align:top;font-size:20px;">📖</td>
              <td style="font-size:13px;color:#333;line-height:1.5;"><strong style="color:#c62828;">Healthy Recipes</strong> — Nutrition tips & delicious dry fruit recipes</td>
            </tr></table>
          </td>
        </tr>
      </table>

      <!-- Welcome Offer -->
      <div style="background:linear-gradient(135deg,#fff8e1,#ffecb3);border:2px dashed #f9a825;border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#e65100;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your Welcome Offer</p>
        <p style="margin:0 0 8px;font-size:28px;font-weight:800;color:#e65100;">FLAT 10% OFF</p>
        <div style="display:inline-block;background:#fff;border:2px dashed #2e7d32;border-radius:6px;padding:8px 20px;margin-bottom:8px;">
          <span style="font-size:18px;font-weight:800;color:#2e7d32;letter-spacing:2px;">WELCOME10</span>
        </div>
        <p style="margin:8px 0 0;font-size:12px;color:#888;">Use this code at checkout on your first order</p>
      </div>

      <!-- Popular Products -->
      <div style="background:#fafafa;border-radius:10px;padding:20px;margin-bottom:24px;">
        <h3 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#222;text-align:center;">🥜 Our Bestsellers</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 8px;text-align:center;width:33%;">
              <div style="background:#fff;border-radius:8px;padding:12px 8px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                <div style="font-size:28px;margin-bottom:6px;">🥜</div>
                <p style="margin:0;font-size:11px;color:#333;font-weight:600;">California Almonds</p>
              </div>
            </td>
            <td style="padding:6px 8px;text-align:center;width:33%;">
              <div style="background:#fff;border-radius:8px;padding:12px 8px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                <div style="font-size:28px;margin-bottom:6px;">🫘</div>
                <p style="margin:0;font-size:11px;color:#333;font-weight:600;">Premium Cashews</p>
              </div>
            </td>
            <td style="padding:6px 8px;text-align:center;width:33%;">
              <div style="background:#fff;border-radius:8px;padding:12px 8px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                <div style="font-size:28px;margin-bottom:6px;">🎁</div>
                <p style="margin:0;font-size:11px;color:#333;font-weight:600;">Gift Hampers</p>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0;">
        <a href="https://www.nutriwow.in" style="display:inline-block;background:linear-gradient(135deg,#2e7d32,#43a047);color:#fff;text-decoration:none;padding:16px 40px;border-radius:50px;font-size:15px;font-weight:700;letter-spacing:0.5px;box-shadow:0 4px 12px rgba(46,125,50,0.3);">
          🛒 Start Shopping Now
        </a>
      </div>

      <!-- Social & Support -->
      <div style="border-top:1px solid #eee;padding-top:20px;text-align:center;">
        <p style="margin:0 0 8px;font-size:13px;color:#888;">Follow us for daily health tips & offers</p>
        <p style="margin:0 0 12px;">
          <a href="https://www.instagram.com/nutriwow.in/" style="color:#e91e63;text-decoration:none;font-size:13px;font-weight:600;margin:0 8px;">Instagram</a>
          <span style="color:#ddd;">|</span>
          <a href="https://wa.me/919993883710" style="color:#25d366;text-decoration:none;font-size:13px;font-weight:600;margin:0 8px;">WhatsApp</a>
          <span style="color:#ddd;">|</span>
          <a href="https://www.nutriwow.in" style="color:#2e7d32;text-decoration:none;font-size:13px;font-weight:600;margin:0 8px;">Website</a>
        </p>
        <div style="background:#e8f5e9;border-radius:8px;padding:12px 16px;">
          <p style="margin:0;font-size:12px;color:#2e7d32;">
            💬 Questions? WhatsApp us anytime: <a href="https://wa.me/919993883710" style="color:#2e7d32;font-weight:700;">+91 99938 83710</a>
          </p>
        </div>
      </div>
    </div>`;
  return emailWrapper(content);
}

export async function sendWelcomeEmail(email: string, name?: string): Promise<boolean> {
  return sendTransactionalEmail(
    email,
    "🎉 Welcome to the Nutriwow Family! Here's Your Welcome Kit",
    welcomeEmailHtml(name),
    "welcome",
  );
}

export interface CampaignSendResult {
  ok: boolean;
  messageId?: string;
  accepted?: string[];
  rejected?: string[];
  response?: string;
  from?: string;
  error?: string;
}

export interface CampaignSendOptions {
  fromName?: string;
  /** Resend API key (admin-entered, takes priority over env). If present, Resend
   *  is used instead of SMTP. */
  resendApiKey?: string;
  /** Resend "from" — must be on a Resend-verified domain, e.g. "Nutriwow <noreply@nutriwow.in>". */
  resendFrom?: string;
}

/** Send one email via the Resend HTTP API. */
async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string
): Promise<CampaignSendResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.message || data?.error || `Resend HTTP ${res.status}`;
      console.error(`[Email] Resend send FAILED to ${to} from ${from}:`, msg);
      return { ok: false, error: msg, from, response: `resend ${res.status}` };
    }
    console.log(`[Email] resend -> ${to} | id=${data?.id} | from=${from}`);
    return { ok: true, messageId: data?.id, accepted: [to], rejected: [], response: "resend: accepted", from };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Email] Resend network error to ${to}:`, msg);
    return { ok: false, error: msg, from };
  }
}

/**
 * Send one marketing-campaign email. Uses Resend when a key is configured
 * (admin setting or RESEND_API_KEY env), otherwise falls back to SMTP. Returns
 * the provider's verdict so the caller can tell accepted vs rejected.
 */
export async function sendCampaignEmail(
  to: string,
  subject: string,
  html: string,
  opts: CampaignSendOptions = {}
): Promise<CampaignSendResult> {
  const fromName = opts.fromName || "Nutriwow";
  const resendKey = opts.resendApiKey || env.resendApiKey;

  if (resendKey) {
    // Resend requires a verified-domain sender. Default to Resend's onboarding
    // sender (only delivers to the account owner) until a domain is verified.
    const from = (opts.resendFrom || env.resendFrom || `Nutriwow <onboarding@resend.dev>`).trim();
    return sendViaResend(resendKey, from, to, subject, html);
  }

  // SMTP fallback (Gmail/Brevo)
  const from = `"${fromName}" <${env.SMTP_USER}>`;
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({ from, to, subject, html });
    const accepted = (info.accepted || []).map(String);
    const rejected = (info.rejected || []).map(String);
    console.log(
      `[Email] campaign(smtp) -> ${to} | id=${info.messageId} | accepted=${JSON.stringify(accepted)} | rejected=${JSON.stringify(rejected)} | resp=${info.response}`
    );
    return { ok: accepted.length > 0 && rejected.length === 0, messageId: info.messageId, accepted, rejected, response: info.response, from };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Email] Campaign send FAILED to ${to} from ${from}:`, msg);
    return { ok: false, error: msg, from };
  }
}

export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return true;
  } catch (err) {
    console.error("[Email] SMTP connection failed:", err);
    return false;
  }
}
