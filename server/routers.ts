import { ADMIN_COOKIE_NAME, ADMIN_SESSION_MS, CUSTOMER_COOKIE_NAME, CUSTOMER_SESSION_MS, COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { createAdminToken, verifyAdminPassword, verifyAdminLogin, verifyAdminPasswordHash, hashAdminPassword, verifyUserPassword, hashUserPassword, generateResetCode, needsRehash } from "./_core/adminSession";
import { checkRateLimit, getRateLimitKey } from "./_core/rateLimit";
import { createCustomerToken } from "./_core/customerSession";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, ownerProcedure, customerProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { computeOrderAmounts } from "./pricing";
import { createShipment, trackShipment, getServiceableCouriers } from "./shipping";
import { trackPurchase, trackAddToCart, trackInitiateCheckout, trackViewContent, generateEventId, sendCAPIEvent } from "./facebookCapi";
import {
  sendOrderConfirmation,
  sendOrderShipped,
  sendOrderDelivered,
  sendAbandonedCartRecovery,
  sendPromoMessage,
  parseProductCampaignPayload,
  getWhatsAppLogs,
  getWhatsAppLogsWithStats,
  getWhatsAppCampaigns,
  createCampaign,
  updateCampaignStats,
  sendTextMessage,
  sendDocumentMessage,
} from "./whatsapp";
import {
  createWhatsappTemplate,
  getWhatsappTemplates,
  getWhatsappTemplate,
  updateWhatsappTemplate,
  deleteWhatsappTemplate,
  uploadWhatsappContacts,
  getWhatsappContacts,
} from "./db";
import { getDb, isNotificationEnabled } from "./db";
import { getCampaignEmailLogs, getCampaignEmailStats, getTransactionalEmailLogs } from "./db";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import { runInBackground } from "./background";
import { generateInvoicePdf } from "./invoicePdf";
import {
  sendOrderConfirmationEmail,
  sendShippingUpdateEmail,
  sendOrderCancelledEmail,
  sendRefundEmail,
  sendOtpEmail,
  sendCampaignEmail,
  sendWelcomeEmail,
  esc,
} from "./email";
import { generateEmailCampaign, isAiConfigured } from "./_core/emailAI";
import { getMarketableEmails } from "./db";
import { ENV } from "./_core/env";
import { processEmailCampaignBatch, processWhatsAppCampaignBatch, queueEmailCampaign } from "./jobs";

import { eq, desc, and, sql, gte, inArray } from "drizzle-orm";
import { products, orders, productReviews, whatsappConversations, whatsappMessages, whatsappTemplates } from "../drizzle/schema";
import {
  StandardCheckoutClient,
  StandardCheckoutPayRequest,
  Env,
} from "@phonepe-pg/pg-sdk-node";
import Razorpay from "razorpay";
import crypto from "crypto";
import {
  upsertCustomerByPhone,
  getCustomerByPhone,
  getAddressesByCustomerId,
  addAddressForCustomer,
  updateAddressById,
  deleteAddressById,
  createOrderWithStock,
  OrderStockError,
  getOrdersByCustomerId,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  updateOrderShipping,
  getReviewsByProductId,
  addProductReview,
  getAllReviews,
  deleteReview,
  markReviewVerified,
  getProductRatingStats,
  updateReviewStatus,
  getAdminReviews,
  markReviewHelpful,
  getReviewsByCustomerId,
  getOrderByIdForTracking,
  subscribeWhatsapp,
  subscribeEmail,
  isNewsletterSubscribed,
  getEmailSubscribersList,
  getBlogPosts,
  getBlogPostBySlug,
  getAllBlogPostsAdmin,
  getCustomerSegments,
  getSegmentSummary,
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getAllCoupons,
  getFeaturedCoupons,
  getActiveCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getCouponByCode,
  countCustomerCouponUses,
  setOrderPaymentId,
  recordRefund,
  incrementCouponUsage,
  getOtpByPhone,
  upsertOtp,
  incrementOtpAttempts,
  deleteOtp,
  getAllProductStock,
  upsertProductStock,
  bulkGetProductStock,
  getStockByProductId,
  incrementStockForOrder,
  addStockAlert,
  getStockAlertsForProduct,
  deleteStockAlertsForProduct,
  renameProductCategory,
  getAllStoreSettings,
  getStoreSetting,
  setStoreSetting,
  bulkSetStoreSettings,
  getAllAbandonedCarts,
  upsertAbandonedCart,
  markAbandonedCartRecovered,
  deleteAbandonedCart,
  getAllCustomers,
  getDashboardStats,
  getAllProducts,
  getProductById,
  getProductByHandle,
  getBestsellers,
  getTrendingProducts,
  getProductsByCategory,
  getProductsByIds,
  getRecommendedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkInsertProducts,
  getProductCount,
  logPageView,
  getPageViewStats,
  getDailyPageViews,
  getProductImages,
  addProductImage,
  setHeroProductImage,
  deleteProductImage,
  reorderProductImages,
  getHomepageSectionProducts,
  getAllHomepageSections,
  getHomepageAllData,
  addProductToHomepageSection,
  removeProductFromHomepageSection,
  reorderHomepageSection,
  clearHomepageSection,
  getAdminUserByEmail,
  updateAdminUserPassword,
  setAdminResetToken,
  updateAdminLastLogin,
  getAllAdminUsers,
  createAdminUser,
  updateAdminUserRole,
  deleteAdminUser,
  getWishlistByCustomer,
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
  bulkAddToWishlist,
  getFrequentlyBoughtTogether,
  getReferralCode,
  getReferralStats,
  validateReferralCode,
  applyReferral,
  getPointsBalance,
  addLoyaltyPoints,
  refundRedeemedPoints,
  getPointsHistory,
  LOYALTY_RULES,
  logCartEvent,
  getCartFunnelStats,
  getAbandonedCartSessions,
  getCEODashboard,
  createSubscription,
  getUserSubscriptions,
  updateSubscription,
  getSubscriptionById,
  getAdminSubscriptions,
} from "./db";

// ─── PhonePe Client (singleton) ───────────────────────────────────────────────
let phonePeClient: ReturnType<typeof StandardCheckoutClient.getInstance> | null = null;

function getPhonePeClient() {
  if (!phonePeClient) {
    const clientId = process.env.PHONEPE_CLIENT_ID;
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("PhonePe credentials not configured");
    phonePeClient = StandardCheckoutClient.getInstance(clientId, clientSecret, 1, Env.PRODUCTION);
  }
  return phonePeClient;
}

// ─── Razorpay Client (singleton) ──────────────────────────────────────────────
let razorpayClient: Razorpay | null = null;
function getRazorpayClient(keyId?: string, keySecret?: string): Razorpay {
  if (keyId && keySecret) return new Razorpay({ key_id: keyId, key_secret: keySecret });
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay credentials not configured in Admin Settings");
  if (!razorpayClient) razorpayClient = new Razorpay({ key_id: id, key_secret: secret });
  return razorpayClient;
}

/** Resolve the active Razorpay key/secret (DB settings first, then env). */
async function resolveRazorpayCreds(): Promise<{ keyId: string; keySecret: string }> {
  let keyId = process.env.RAZORPAY_KEY_ID || "";
  let keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  try {
    const settings = await getAllStoreSettings() as Record<string, unknown>;
    const raw = settings["payments"];
    const pay = typeof raw === "string" ? JSON.parse(raw) : ((raw as Record<string, unknown>) ?? null);
    if (pay) {
      const isLive = pay.mode === "live";
      keyId = (isLive ? pay.liveKeyId : pay.testKeyId) || keyId;
      keySecret = (isLive ? pay.liveKeySecret : pay.testKeySecret) || keySecret;
    }
  } catch {}
  return { keyId, keySecret };
}

/**
 * Independently confirm a Razorpay payment straight from Razorpay's API (using
 * our secret key — no webhook signature needed). Used as a secure fallback when
 * the webhook signature can't be verified, so a genuinely-captured payment still
 * finalizes the order. Returns the payment status + the order id in its notes.
 */
export async function fetchRazorpayPaymentStatus(paymentId: string): Promise<{ status: string; orderId?: string } | null> {
  try {
    const { keyId, keySecret } = await resolveRazorpayCreds();
    if (!keyId || !keySecret) return null;
    const client = getRazorpayClient(keyId, keySecret);
    const p: any = await client.payments.fetch(paymentId);
    return { status: String(p?.status || ""), orderId: p?.notes?.orderId ? String(p.notes.orderId) : undefined };
  } catch (e: any) {
    console.error("[Razorpay] fetchRazorpayPaymentStatus failed:", e?.message || e);
    return null;
  }
}

/**
 * Build the GST tax-invoice PDF for an order, upload it to Blob storage, and
 * return both the buffer (for email attachment) and the public URL (for the
 * WhatsApp document message). Best-effort — returns null on any failure so the
 * order confirmation never breaks.
 */
export async function generateOrderInvoice(order: any): Promise<{ pdf: Buffer; url: string } | null> {
  try {
    const inv = await buildGSTInvoiceData(order);
    const pdf = Buffer.from(await generateInvoicePdf(inv));
    let url = "";
    try {
      const res = await storagePut(`invoices/Invoice-${order.id}.pdf`, pdf, "application/pdf");
      url = res.url;
    } catch (e) { console.error("[invoice] upload failed", e); }
    return { pdf, url };
  } catch (e) {
    console.error("[invoice] generation failed", e);
    return null;
  }
}

/**
 * Build a GST CREDIT NOTE for a cancelled/refunded order — the accounting
 * document that reverses the original tax invoice. Same layout, marked
 * "CREDIT NOTE" and referencing the original invoice + reason. Best-effort.
 */
export async function generateOrderCreditNote(
  order: any,
  reason = "Order cancelled",
): Promise<{ pdf: Buffer; url: string } | null> {
  try {
    const base = await buildGSTInvoiceData(order);
    const inv = {
      ...base,
      docType: "credit" as const,
      creditReason: reason,
      originalInvoiceNumber: base.invoiceNumber,
      // Credit-note number: CN- prefix so it's distinct from the invoice number.
      invoiceNumber: base.invoiceNumber.replace(/^NW-/, "CN-"),
      status: "cancelled",
    };
    const pdf = Buffer.from(await generateInvoicePdf(inv));
    let url = "";
    try {
      const res = await storagePut(`credit-notes/CreditNote-${order.id}.pdf`, pdf, "application/pdf");
      url = res.url;
    } catch (e) { console.error("[credit-note] upload failed", e); }
    return { pdf, url };
  } catch (e) {
    console.error("[credit-note] generation failed", e);
    return null;
  }
}

/**
 * Finalize a server-side-VERIFIED pending_payment order: flip it to "placed",
 * record amountPaid, redeem the coupon, and fire post-purchase notifications.
 * SECURITY: only call AFTER payment is verified server-side (Razorpay signature
 * via verifyRazorpay, or PhonePe COMPLETED) — never on a bare client request.
 * Idempotent: returns the order unchanged if it is no longer pending_payment.
 */
export async function finalizePendingOrder(order: any, paymentId?: string): Promise<any> {
  if (!order || order.status !== "pending_payment") return order;
  // Persist the gateway payment id so a refund can be issued later (NW-PAY-02).
  if (paymentId) { try { await setOrderPaymentId(order.id, paymentId); } catch {} }
  const amountPaid = order.paymentPlan?.endsWith("advance30")
    ? Math.round(order.total * 0.3)
    : order.total;
  const updated = await updateOrderStatus(order.id, "placed", { amountPaid });
  if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to confirm order" });
  if (order.couponCode) {
    try { await incrementCouponUsage(order.couponCode); } catch (e) { console.error("[coupon] redeem failed", e); }
  }
  const phone = order.phone?.replace(/\D/g, "") || "";
  const name = order.customerName || "Customer";
  const itemsStr = Array.isArray(order.items)
    ? (order.items as any[]).map((i: any) => `${i.name} x${i.quantity}`).join(", ")
    : "your items";
  // GST tax-invoice PDF — generated once (persisted to Blob) and emailed as an
  // attachment here. The WhatsApp invoice document is NOT sent at placement; it
  // goes exactly once when the customer taps "Order Confirm" (24h window opens),
  // handled in the WhatsApp webhook. Best-effort: never fails the order.
  // Invoice + notifications run in the background so the payment-success screen
  // returns instantly instead of waiting on PDF generation, WhatsApp and email.
  runInBackground(async () => {
  const invoice = await generateOrderInvoice(order);
  await Promise.allSettled([
    sendOrderConfirmationSMS(phone, order.id, order.total, order.paymentMethod),
    sendOrderConfirmation({
      phone,
      customerName: name,
      orderId: order.id,
      total: order.total,
      items: itemsStr,
      paymentMethod: order.paymentMethod || "Online",
      firstProductImage: Array.isArray(order.items) ? (order.items as any[])[0]?.image : undefined,
    }),
    order.email ? sendOrderConfirmationEmail({
      orderId: order.id,
      customerName: name,
      customerEmail: order.email,
      items: Array.isArray(order.items) ? (order.items as any[]).map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price, image: i.image })) : [],
      subtotal: order.subtotal || order.total,
      discount: order.couponDiscount || 0,
      shipping: 0,
      total: order.total,
      address: `${order.address}, ${order.city}, ${order.pincode}`,
      paymentMethod: order.paymentMethod || "Online",
      orderDate: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
    }, invoice?.pdf) : Promise.resolve(),
    notifyAdminNewOrder({
      id: order.id,
      customerName: name,
      phone,
      total: order.total,
      paymentMethod: order.paymentMethod || "Online",
      items: Array.isArray(order.items) ? (order.items as any[]).map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price })) : [],
      city: order.city || undefined,
    }),
    trackPurchase({
      eventId: `purchase-${order.id}`,
      orderTotal: order.total,
      orderId: order.id,
      productIds: Array.isArray(order.items) ? (order.items as any[]).map((i: any) => String(i.id)) : [],
      numItems: Array.isArray(order.items) ? (order.items as any[]).reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) : 1,
      userData: {
        phone,
        email: order.email || undefined,
        firstName: name.split(" ")[0],
        lastName: name.split(" ").slice(1).join(" ") || undefined,
        city: order.city || undefined,
        state: order.state || undefined,
        zipCode: order.pincode || undefined,
        country: "in",
      },
      sourceUrl: "https://www.nutriwow.in/payment-status",
    }),
  ]);
  });
  return updated;
}

// ─── OTP config & helpers ─────────────────────────────────────────────────────
// OTPs are persisted in the DB (otpCodes), not an in-memory Map, so they survive
// across serverless instances. Only a hash is stored; sends and verify attempts
// are rate-limited to stop SMS/cost bombing and brute force.
const OTP_TTL_MS = 5 * 60 * 1000;          // code valid for 5 minutes
const OTP_RESEND_INTERVAL_MS = 30 * 1000;  // min gap between sends to one number
const OTP_SEND_WINDOW_MS = 15 * 60 * 1000; // rolling window for the send cap
const OTP_MAX_SENDS_PER_WINDOW = 5;        // max sends per number per window
const OTP_MAX_VERIFY_ATTEMPTS = 5;         // max wrong guesses before a new code is required

function generateOTP(): string {
  // crypto-strong 4-digit code (matches the approved WhatsApp template + client UI)
  return crypto.randomInt(1000, 10000).toString();
}

function hashOTP(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function otpMatches(input: string, storedHash: string): boolean {
  const a = Buffer.from(hashOTP(input));
  const b = Buffer.from(storedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function sendWhatsAppOrderNotification(mobile: string, orderId: string, total: number, customerName: string, paymentMethod: string): Promise<void> {
  const accessToken = process.env.ITHINK_ACCESS_TOKEN;
  const secretKey = process.env.ITHINK_SECRET_KEY;
  if (!accessToken || !secretKey) {
    console.log('[WhatsApp] iThink credentials not set, skipping WhatsApp notification');
    return;
  }
  try {
    const deliveryDays = paymentMethod === 'COD' ? '5-7' : '3-5';
    const greeting = customerName ? 'Hi ' + customerName + '!' : 'Hi!';
    const message = greeting + ' Your Nutriwow order #' + orderId + ' has been placed! Total: Rs.' + total + '. Payment: ' + paymentMethod + '. Delivery in ' + deliveryDays + ' business days. Track: www.nutriwow.in/track-order. Thank you!';
    const payload = {
      data: {
        access_token: accessToken,
        secret_key: secretKey,
        phone: mobile,
        message,
        type: 'text',
      },
    };
    const res = await fetch('https://my.ithinklogistics.com/api_v3/whatsapp/send.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log('[WhatsApp] Order notification sent to ' + mobile + ' for order ' + orderId + ':', data);
  } catch (err) {
    console.error('[WhatsApp] Failed to send order notification:', err); // Non-blocking
  }
}

async function sendOrderConfirmationSMS(mobile: string, orderId: string, total: number, paymentMethod: string): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) return;
  if (!(await isNotificationEnabled("newOrder"))) return;
  try {
    const deliveryDays = paymentMethod === "COD" ? "5-7" : "3-5";
    const message = `Dear Customer, your Nutriwow order #${orderId} placed! Total: Rs.${total}. Delivery in ${deliveryDays} business days. Track: www.nutriwow.in/track-order. Thank you!`;
    await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: { authorization: apiKey, "Content-Type": "application/json", "cache-control": "no-cache" },
      body: JSON.stringify({ route: "q", message, language: "english", flash: 0, numbers: mobile }),
    });
    console.log(`[Order SMS] Confirmation sent to ${mobile} for order ${orderId}`);
  } catch (err) {
    console.error("[Order SMS] Failed:", err); // Non-blocking
  }
}

async function sendOTPviaWhatsApp(mobile: string, otp: string): Promise<{ success: boolean; error?: string }> {
  try {
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1110962362096644";
    const token = process.env.WHATSAPP_TOKEN || "";
    const to = mobile.startsWith("91") ? mobile : `91${mobile}`;

    // Use AUTHENTICATION template (auto-approved, no 24hr window restriction)
    const response = await fetch(`https://graph.facebook.com/v25.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: "nutriwow_otp",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: otp }]
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: otp }]
            }
          ]
        }
      })
    });

    const data = await response.json() as { messages?: { id: string }[]; error?: { message: string } };
    if (data.messages && data.messages.length > 0) {
      console.log(`[OTP] WhatsApp OTP sent via template to ${mobile}`);
      return { success: true };
    }
    console.error(`[OTP] WhatsApp template OTP failed for ${mobile}:`, JSON.stringify(data));
    return { success: false, error: data.error?.message || "WhatsApp delivery failed" };
  } catch (err) {
    console.error("[OTP] WhatsApp OTP network error:", err);
    return { success: false, error: "Network error reaching WhatsApp service" };
  }
}

// Read the Anthropic API key saved from the admin UI (storeSettings). Returns a
// trimmed key string, or "" if none is stored.
async function getStoredAnthropicKey(): Promise<string> {
  let k = await getStoreSetting("anthropicApiKey");
  if (typeof k === "string") { try { k = JSON.parse(k); } catch { /* keep raw */ } }
  return typeof k === "string" ? k.trim() : "";
}

// Read the admin-set password hash from storeSettings. Stored as a salted scrypt
// string (`scrypt$..$..`); returns null when no custom password has been set.
async function getStoredAdminPasswordHash(): Promise<string | null> {
  let h = await getStoreSetting("adminPasswordHash");
  if (typeof h === "string") { try { h = JSON.parse(h); } catch { /* keep raw */ } }
  return typeof h === "string" && h.startsWith("scrypt$") ? h : null;
}

// When a product goes from out-of-stock to in-stock, notify everyone who asked
// (email via Resend/SMTP + WhatsApp best-effort), then clear those alerts.
async function notifyBackInStock(productId: number): Promise<void> {
  try {
    const [product, alerts] = await Promise.all([
      getProductById(productId),
      getStockAlertsForProduct(productId),
    ]);
    if (!product || alerts.length === 0) return;
    const url = `https://nutriwow.in/products/${product.handle}`;
    const rc = await getResendConfig();
    const html =
      `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px">` +
      `<h2 style="color:#43A047;margin:0 0 8px">Good news — it's back! 🎉</h2>` +
      `<p style="font-size:15px;color:#333"><strong>${product.name}</strong> is back in stock at Nutriwow.</p>` +
      `<p style="margin:20px 0"><a href="${url}" style="display:inline-block;background:#43A047;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Order Now</a></p>` +
      `<p style="color:#999;font-size:12px">You asked to be notified when this product is available again.</p></div>`;
    for (const a of alerts) {
      if (a.email) {
        await sendCampaignEmail(a.email, `${product.name} is back in stock! 🎉`, html, {
          resendApiKey: rc.apiKey || undefined,
          resendFrom: rc.from || undefined,
        });
      }
      if (a.phone) {
        await sendTextMessage(
          a.phone,
          `Good news${a.name ? ` ${a.name}` : ""}! ${product.name} is back in stock at Nutriwow. Order now: ${url}`
        ).catch(() => {});
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    await deleteStockAlertsForProduct(productId);
    console.log(`[StockAlert] notified ${alerts.length} subscriber(s) for product ${productId}`);
  } catch (e) {
    console.error("[StockAlert] notifyBackInStock failed:", e);
  }
}

const ADMIN_NOTIFY_EMAIL = "orders@foodondoor.com";
const ADMIN_NOTIFY_PHONE = "9546334633";

async function notifyAdminNewOrder(order: {
  id: string;
  customerName: string;
  phone: string;
  total: number;
  paymentMethod: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  city?: string;
}): Promise<void> {
  const itemLines = order.items.map(i => `• ${i.name} x${i.quantity} — ₹${i.price * i.quantity}`).join("\n");
  const totalFormatted = `₹${order.total.toLocaleString("en-IN")}`;

  // WhatsApp notification (free-form text within 24h window or template)
  const waMsg = `🛒 *New Order — ${order.id}*\n\n` +
    `Customer: ${order.customerName}\n` +
    `Phone: ${order.phone}\n` +
    `City: ${order.city || "N/A"}\n` +
    `Payment: ${order.paymentMethod}\n` +
    `Total: ${totalFormatted}\n\n` +
    `${itemLines}\n\n` +
    `View: https://www.nutriwow.in/admin/orders`;
  sendTextMessage(ADMIN_NOTIFY_PHONE, waMsg).catch((e) =>
    console.error("[AdminNotify] WhatsApp failed:", e)
  );

  // Email notification
  const rc = await getResendConfig();
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#43A047;margin:0 0 12px">🛒 New Order — ${order.id}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#666">Customer</td><td style="padding:6px 0;font-weight:bold">${esc(order.customerName)}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Phone</td><td style="padding:6px 0">${esc(order.phone)}</td></tr>
        <tr><td style="padding:6px 0;color:#666">City</td><td style="padding:6px 0">${esc(order.city || "N/A")}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Payment</td><td style="padding:6px 0">${esc(order.paymentMethod)}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Total</td><td style="padding:6px 0;font-weight:bold;color:#43A047">${totalFormatted}</td></tr>
      </table>
      <h3 style="margin:16px 0 8px;font-size:14px">Items</h3>
      <ul style="margin:0;padding:0 0 0 20px;font-size:13px">
        ${order.items.map(i => `<li>${esc(i.name)} x${i.quantity} — ₹${(i.price * i.quantity).toLocaleString("en-IN")}</li>`).join("")}
      </ul>
      <p style="margin:20px 0 0"><a href="https://www.nutriwow.in/admin/orders" style="display:inline-block;background:#43A047;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold">View in Admin</a></p>
    </div>`;
  sendCampaignEmail(ADMIN_NOTIFY_EMAIL, `New Order ${order.id} — ${totalFormatted} (${order.paymentMethod})`, html, {
    resendApiKey: rc.apiKey || undefined,
    resendFrom: rc.from || undefined,
  }).catch((e) => console.error("[AdminNotify] Email failed:", e));
}

// Resend email config saved from the admin UI (storeSettings), falling back to env.
async function getResendConfig(): Promise<{ apiKey: string; from: string }> {
  let k = await getStoreSetting("resendApiKey");
  if (typeof k === "string") { try { k = JSON.parse(k); } catch { /* keep */ } }
  let f = await getStoreSetting("resendFrom");
  if (typeof f === "string") { try { f = JSON.parse(f); } catch { /* keep */ } }
  return {
    apiKey: (typeof k === "string" ? k.trim() : "") || ENV.resendApiKey,
    from: (typeof f === "string" ? f.trim() : "") || ENV.resendFrom,
  };
}

// ─── GST Invoice Helper ──────────────────────────────────────────────────────
// Dry fruits HSN: 0801 (cashews, almonds, pistachios, etc.) / 0802 (walnuts, etc.)
// GST rate for dried fruits: 5% (2.5% CGST + 2.5% SGST intra-state, or 5% IGST inter-state)
const SELLER_STATE = "Madhya Pradesh";
const GST_RATE = 0.05; // 5% total GST for dry fruits (HSN 0801/0802)

// Default "Also available on" marketplaces (footer). Admin can override via the
// `marketplaces` store setting; these are the fallback when nothing is set.
const DEFAULT_MARKETPLACES: Array<{ name: string; url: string }> = [
  { name: "Amazon", url: "https://www.amazon.in/s?k=nutriwow" },
  { name: "Flipkart", url: "https://www.flipkart.com/search?q=nutriwow" },
  { name: "Blinkit", url: "https://blinkit.com/s/?q=nutriwow" },
  { name: "Instamart", url: "https://www.swiggy.com/instamart/search?custom_back=true&query=nutriwow" },
  { name: "JioMart", url: "https://www.jiomart.com/search/nutriwow" },
  { name: "Snapdeal", url: "https://www.snapdeal.com/search?keyword=nutriwow" },
];

// Sister brands shown in the footer ("Our brands"). `logo` maps to a file in
// client/public (drop-in). Admin can override via the `sisterBrands` setting.
// Sister brands under Foodondoor Private Limited, shown in the footer.
// `logo` defaults to a static asset in client/public; admin uploads
// (brandAssets.kuddleLogo / mrHealthybiteLogo) override when present.
const DEFAULT_SISTER_BRANDS: Array<{ name: string; url: string; logo: string }> = [
  { name: "Kuddle Super Meal", url: "", logo: "/kuddle-logo.png" },
  { name: "Mr Healthybite", url: "", logo: "/mr-healthybite-logo.png" },
  { name: "Nutriday", url: "", logo: "/nutriday-logo.png" },
];

async function buildGSTInvoiceData(order: any) {
  // Fetch store settings for GSTIN and business info
  const allSettings = await getAllStoreSettings();
  const parse = (k: string) => {
    const r = (allSettings as Record<string, unknown>)?.[k];
    if (!r) return {} as Record<string, string>;
    try { return (typeof r === "string" ? JSON.parse(r) : r) as Record<string, string>; }
    catch { return {} as Record<string, string>; }
  };
  const billing = parse("billing");
  const general = parse("general");
  const brandAssets = parse("brandAssets"); // admin-uploaded logo/stamp URLs

  const gstin = billing.gstin || general.storeGST || "23AAECF1312M1ZZ";
  const sellerEmail = general.storeEmail || billing.billingEmail || "orders@nutriwow.in";
  const sellerAddress = billing.billingAddress
    || [general.storeAddress, general.storeCity, general.storeState, general.storePincode].filter(Boolean).join(", ")
    || "Sehore, Madhya Pradesh";

  // Determine intra-state vs inter-state
  const buyerState = (order.state || "").trim();
  const isInterState = buyerState !== "" && buyerState.toLowerCase() !== SELLER_STATE.toLowerCase();

  // Per-product HSN + GST rate (admin: product metafields hsnCode / gstRate).
  // Falls back to HSN 0801 @ 5% when not set on the product.
  const orderItemIds = (Array.isArray(order.items) ? order.items as any[] : [])
    .map((i: any) => Number(i.id)).filter((n: number) => Number.isInteger(n) && n > 0);
  const invProducts = orderItemIds.length ? await getProductsByIds(Array.from(new Set(orderItemIds))) : [];
  const invProdMap = new Map(invProducts.map((p: any) => [p.id, p]));
  const hsnGstFor = (id: number): { hsn: string; rate: number } => {
    const p = invProdMap.get(id);
    const mf = (p && typeof p.metafields === "object" && !Array.isArray(p.metafields)) ? p.metafields as Record<string, any> : {};
    const hsn = (mf.hsnCode && String(mf.hsnCode).trim()) || "0801";
    let ratePct = Number(mf.gstRate);
    if (!Number.isFinite(ratePct) || ratePct < 0) ratePct = GST_RATE * 100;
    return { hsn, rate: ratePct / 100 };
  };

  // Build line items with GST breakdown
  const items = (Array.isArray(order.items) ? order.items as any[] : []).map((item: any, idx: number) => {
    const lineAmount = item.price * item.quantity; // inclusive of GST
    const { hsn, rate } = hsnGstFor(Number(item.id));
    // Reverse-calculate taxable value: price is GST-inclusive at the item's rate.
    const taxableValue = Math.round((lineAmount / (1 + rate)) * 100) / 100;
    const totalTax = Math.round((lineAmount - taxableValue) * 100) / 100;

    let cgst = 0, sgst = 0, igst = 0;
    if (isInterState) {
      igst = totalTax;
    } else {
      cgst = Math.round((totalTax / 2) * 100) / 100;
      sgst = Math.round((totalTax - cgst) * 100) / 100; // avoid rounding drift
    }

    return {
      sno: idx + 1,
      description: `${item.name}${item.weight ? " (" + item.weight + ")" : ""}`,
      hsn,
      qty: item.quantity,
      rate: item.price,
      taxableValue,
      cgst,
      sgst,
      igst,
      lineTotal: taxableValue + cgst + sgst + igst,
    };
  });

  const totalTaxableValue = Math.round(items.reduce((s, it) => s + it.taxableValue, 0) * 100) / 100;
  const totalCGST = Math.round(items.reduce((s, it) => s + it.cgst, 0) * 100) / 100;
  const totalSGST = Math.round(items.reduce((s, it) => s + it.sgst, 0) * 100) / 100;
  const totalIGST = Math.round(items.reduce((s, it) => s + it.igst, 0) * 100) / 100;

  // Compute shipping: total - subtotal + couponDiscount (since total = subtotal - couponDiscount + shipping)
  const subtotal = order.subtotal || order.total;
  const couponDiscount = order.couponDiscount || 0;
  const shipping = Math.max(0, order.total - subtotal + couponDiscount);

  // Invoice number: NW-YYYY-XXXXX based on order ID
  const orderDate = new Date(order.createdAt);
  const year = orderDate.getFullYear();
  // Use numeric portion of order ID or fallback to timestamp-based
  const numericPart = order.id.replace(/\D/g, "").slice(-5).padStart(5, "0");
  const invoiceNumber = `NW-${year}-${numericPart}`;

  return {
    invoiceNumber,
    invoiceDate: orderDate.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
    orderId: order.id,
    orderDate: orderDate.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),

    seller: {
      name: general.storeName || "Nutriwow",
      legalName: billing.businessName || "Foodondoor Private Limited",
      gstin,
      address: sellerAddress,
      state: SELLER_STATE,
      email: sellerEmail,
    },

    buyer: {
      name: order.customerName || "",
      phone: order.phone || "",
      email: order.email || "",
      address: order.address || "",
      city: order.city || "",
      state: buyerState,
      pincode: order.pincode || "",
    },

    items,
    subtotal,
    couponDiscount,
    shipping,
    totalTaxableValue,
    totalCGST,
    totalSGST,
    totalIGST,
    grandTotal: order.total,
    isInterState,
    paymentMethod: order.paymentMethod || "Online",
    status: order.status || "placed",
    // Admin-uploaded logo/stamp URLs for the PDF (invoicePdf falls back to
    // the static client/public files when a URL isn't set).
    brandAssets: {
      nutriwowLogo: brandAssets.nutriwowLogo || "",
      foodondoorLogo: brandAssets.foodondoorLogo || "",
      foodondoorStamp: brandAssets.foodondoorStamp || "",
      kuddleLogo: brandAssets.kuddleLogo || "",
      mrHealthybiteLogo: brandAssets.mrHealthybiteLogo || "",
      nutridayLogo: brandAssets.nutridayLogo || "",
      signature: brandAssets.signature || "",
    },
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Admin panel auth ───────────────────────────────────────────────────────
  admin: router({
    me: publicProcedure.query(({ ctx }) => ({
      isAdmin: ctx.isAdminSession === true || ctx.user?.role === "admin",
    })),

    login: publicProcedure
      .input(z.object({
        email: z.string().email().optional(),
        password: z.string().min(1).max(200),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit("admin-login", getRateLimitKey(ctx.req), 5, 15 * 60 * 1000);
        // Multi-user login: email + password against adminUsers table
        if (input.email) {
          const user = await getAdminUserByEmail(input.email);
          if (!user || !verifyUserPassword(input.password, user.passwordHash)) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
          }
          if (needsRehash(user.passwordHash)) {
            await updateAdminUserPassword(user.id, hashUserPassword(input.password));
          }
          await updateAdminLastLogin(user.id);
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(ADMIN_COOKIE_NAME, createAdminToken(user.email), {
            ...cookieOptions,
            maxAge: ADMIN_SESSION_MS,
          });
          return { success: true, name: user.name } as const;
        }

        // Legacy fallback: single shared password (no email)
        const storedHash = await getStoredAdminPasswordHash();
        if (!verifyAdminLogin(input.password, storedHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect password." });
        }
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(ADMIN_COOKIE_NAME, createAdminToken("admin"), {
          ...cookieOptions,
          maxAge: ADMIN_SESSION_MS,
        });
        return { success: true } as const;
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(ADMIN_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    passwordStatus: adminProcedure.query(async () => ({
      customPasswordSet: !!(await getStoredAdminPasswordHash()),
    })),

    changePassword: adminProcedure
      .input(z.object({
        currentPassword: z.string().min(1).max(200),
        newPassword: z.string().min(6, "Use at least 6 characters").max(200),
      }))
      .mutation(async ({ ctx, input }) => {
        // Per-user password change: requires knowing which admin is logged in
        if (ctx.adminEmail) {
          const user = await getAdminUserByEmail(ctx.adminEmail);
          if (!user) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Admin user not found." });
          }
          if (!verifyUserPassword(input.currentPassword, user.passwordHash)) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
          }
          if (input.newPassword === input.currentPassword) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "New password must be different." });
          }
          await updateAdminUserPassword(user.id, hashUserPassword(input.newPassword));
        } else {
          // Legacy fallback: single shared password
          const storedHash = await getStoredAdminPasswordHash();
          const currentOk = storedHash
            ? (verifyAdminPasswordHash(input.currentPassword, storedHash) || verifyAdminPassword(input.currentPassword))
            : verifyAdminPassword(input.currentPassword);
          if (!currentOk) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
          }
          if (input.newPassword === input.currentPassword) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "New password must be different." });
          }
          await setStoreSetting("adminPasswordHash", hashAdminPassword(input.newPassword));
        }
        return { success: true } as const;
      }),

    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
        method: z.enum(["email", "whatsapp"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit("admin-reset-req", getRateLimitKey(ctx.req), 3, 15 * 60 * 1000);
        const user = await getAdminUserByEmail(input.email);
        if (!user) {
          return { sent: true } as const;
        }

        const code = generateResetCode();
        const expiry = new Date(Date.now() + 15 * 60 * 1000);
        await setAdminResetToken(user.id, code, expiry);

        // Deliver the code via the same proven channels as customer OTP:
        // - WhatsApp uses the approved `nutriwow_otp` AUTHENTICATION template
        //   (no 24-hour-window restriction, unlike free-form text)
        // - Email uses the transactional OTP email (not the marketing sender)
        if (input.method === "email") {
          try {
            await sendOtpEmail({ customerEmail: user.email, otp: code, purpose: "password reset" });
          } catch (err) {
            console.error("[Admin] Failed to send reset email:", err);
          }
        } else if (input.method === "whatsapp" && user.mobile) {
          try {
            await sendOTPviaWhatsApp(user.mobile, code);
          } catch (err) {
            console.error("[Admin] Failed to send reset WhatsApp:", err);
          }
        }

        return { sent: true, hasMobile: !!user.mobile } as const;
      }),

    resetPassword: publicProcedure
      .input(z.object({
        email: z.string().email(),
        code: z.string().length(6),
        newPassword: z.string().min(6).max(200),
      }))
      .mutation(async ({ ctx, input }) => {
        await checkRateLimit("admin-reset-verify", getRateLimitKey(ctx.req), 5, 15 * 60 * 1000);
        const user = await getAdminUserByEmail(input.email);
        if (!user || !user.resetToken || !user.resetTokenExp) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset code." });
        }
        const codeBuf = Buffer.from(input.code);
        const tokenBuf = Buffer.from(user.resetToken);
        if (codeBuf.length !== tokenBuf.length || !crypto.timingSafeEqual(codeBuf, tokenBuf)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid reset code." });
        }
        if (new Date(user.resetTokenExp) < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Reset code has expired. Please request a new one." });
        }
        const newHash = hashUserPassword(input.newPassword);
        await updateAdminUserPassword(user.id, newHash);
        return { success: true } as const;
      }),
  }),

  // ─── OTP ──────────────────────────────────────────────────────────────────
  otp: router({
    send: publicProcedure
      .input(z.object({
        mobile: z.string().regex(/^\d{10}$/, "10-digit number required"),
        email: z.string().email().optional(), // optional email for fallback
      }))
      .mutation(async ({ ctx, input }) => {
        // Test account for app store review — bypass WhatsApp
        if (input.mobile === "9999900000") {
          return { success: true, message: "OTP sent successfully!" };
        }
        // Per-IP cap: the per-phone window below only throttles a single number, so
        // without this an attacker could iterate distinct numbers from one IP to bomb
        // WhatsApp / exhaust the paid messaging quota.
        await checkRateLimit("otp-send-ip", getRateLimitKey(ctx.req), 10, 15 * 60 * 1000);

        const now = Date.now();
        const existing = await getOtpByPhone(input.mobile);

        // Rate limit: minimum gap between sends + cap per rolling window.
        let sendCount = 1;
        let windowStartedAt = new Date(now);
        if (existing) {
          const windowAge = now - existing.windowStartedAt.getTime();
          if (windowAge < OTP_SEND_WINDOW_MS) {
            if (existing.sendCount >= OTP_MAX_SENDS_PER_WINDOW) {
              throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many OTP requests. Please try again later." });
            }
            if (now - existing.updatedAt.getTime() < OTP_RESEND_INTERVAL_MS) {
              throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait a moment before requesting another OTP." });
            }
            sendCount = existing.sendCount + 1;
            windowStartedAt = existing.windowStartedAt;
          }
          // else: window elapsed → reset (sendCount = 1, new window)
        }

        const otp = generateOTP();
        await upsertOtp({
          phone: input.mobile,
          codeHash: hashOTP(otp),
          expiresAt: new Date(now + OTP_TTL_MS),
          sendCount,
          windowStartedAt,
        });

        const result = await sendOTPviaWhatsApp(input.mobile, otp);
        if (!result.success) {
          // Fallback: try email OTP if email is provided
          if (input.email) {
            const emailSent = await sendOtpEmail({ customerEmail: input.email, otp, purpose: "login" });
            if (emailSent) return { success: true, message: "OTP sent to your email!" };
          }
          throw new Error("Failed to send OTP. Please try again.");
        }
        return { success: true, message: "OTP sent successfully!" };
      }),

    verify: publicProcedure
      .input(z.object({ mobile: z.string().regex(/^\d{10}$/), otp: z.string().length(4) }))
      .mutation(async ({ input, ctx }) => {
        // Test account for app store review — fixed OTP bypass
        if (input.mobile === "9999900000" && input.otp === "1234") {
          const profile = await upsertCustomerByPhone(input.mobile, {});
          const token = createCustomerToken(input.mobile, profile.id);
          ctx.res.cookie(CUSTOMER_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: CUSTOMER_SESSION_MS,
            path: "/",
          });
          const addresses = await getAddressesByCustomerId(profile.id);
          return { success: true, verified: true, customerId: profile.id, profile, addresses };
        }

        const record = await getOtpByPhone(input.mobile);
        if (!record) throw new Error("OTP not found. Please request a new OTP.");
        if (Date.now() > record.expiresAt.getTime()) {
          await deleteOtp(input.mobile);
          throw new Error("OTP has expired. Please request a new one.");
        }
        if (record.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
          await deleteOtp(input.mobile);
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many incorrect attempts. Please request a new OTP." });
        }
        if (!otpMatches(input.otp, record.codeHash)) {
          await incrementOtpAttempts(input.mobile);
          throw new Error("Incorrect OTP. Please try again.");
        }
        await deleteOtp(input.mobile);

        const profile = await upsertCustomerByPhone(input.mobile, {});
        const token = createCustomerToken(input.mobile, profile.id);
        ctx.res.cookie(CUSTOMER_COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: CUSTOMER_SESSION_MS,
          path: "/",
        });
        const addresses = await getAddressesByCustomerId(profile.id);
        return { success: true, verified: true, customerId: profile.id, profile, addresses };
      }),
  }),

  // ─── Customer Profile ─────────────────────────────────────────────────────
  customer: router({
    // Lightweight session check — client uses this to detect a stale
    // localStorage login whose server cookie has expired. Valid sessions get
    // a fresh cookie (sliding expiry) so active customers stay logged in.
    session: publicProcedure
      .query(async ({ ctx }) => {
        if (ctx.customer) {
          const token = createCustomerToken(ctx.customer.phone, ctx.customer.customerId);
          ctx.res.cookie(CUSTOMER_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: CUSTOMER_SESSION_MS,
            path: "/",
          });
        }
        return { valid: !!ctx.customer, customerId: ctx.customer?.customerId ?? null };
      }),

    logout: publicProcedure
      .mutation(async ({ ctx }) => {
        ctx.res.clearCookie(CUSTOMER_COOKIE_NAME, {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
        return { success: true };
      }),

    /** Get or create profile by phone — called after OTP verify */
    getOrCreate: customerProcedure
      .input(z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const profile = await upsertCustomerByPhone(ctx.customer.phone, { name: input.name, email: input.email });
        return profile;
      }),

    /** Get profile by phone */
    getByPhone: customerProcedure
      .input(z.object({}).optional())
      .query(async ({ ctx }) => {
        return getCustomerByPhone(ctx.customer.phone);
      }),

    /** Update profile name/email */
    updateProfile: customerProcedure
      .input(z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return upsertCustomerByPhone(ctx.customer.phone, { name: input.name, email: input.email });
      }),

    /** Get all saved addresses for the logged-in customer */
    getAddresses: customerProcedure
      .input(z.object({}).optional())
      .query(async ({ ctx }) => {
        return getAddressesByCustomerId(ctx.customer.customerId);
      }),

    /** Add a new address */
    addAddress: customerProcedure
      .input(z.object({
        name: z.string(),
        phone: z.string(),
        flat: z.string(),
        area: z.string().optional().default(""),
        city: z.string(),
        state: z.string().optional().default(""),
        pincode: z.string(),
        isDefault: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        return addAddressForCustomer({
          customerId: ctx.customer.customerId,
          name: input.name,
          phone: input.phone,
          flat: input.flat,
          area: input.area || null,
          city: input.city,
          state: input.state || "",
          pincode: input.pincode,
          isDefault: input.isDefault,
        });
      }),

    /** Update an existing address */
    updateAddress: customerProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        flat: z.string().optional(),
        area: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        return updateAddressById(id, ctx.customer.customerId, data);
      }),

    /** Delete an address */
    deleteAddress: customerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return deleteAddressById(input.id, ctx.customer.customerId);
      }),

    /** Get orders for the logged-in customer */
    getOrders: customerProcedure
      .input(z.object({}).optional())
      .query(async ({ ctx }) => {
        return getOrdersByCustomerId(ctx.customer.customerId);
      }),

    /** Place a new order */
    placeOrder: customerProcedure
      .input(z.object({
        id: z.string(),
        customerName: z.string(),
        phone: z.string(),
        email: z.string().optional().default(""),
        address: z.string(),
        city: z.string(),
        state: z.string().optional().default(""),
        pincode: z.string(),
        items: z.array(z.object({
          id: z.string(),
          name: z.string(),
          price: z.number(),
          quantity: z.number(),
          image: z.string().optional(),
          weight: z.string().optional(),
        })),
        subtotal: z.number(),
        couponCode: z.string().optional(),
        couponDiscount: z.number().default(0),
        total: z.number(),
        paymentMethod: z.enum(["COD", "UPI", "Card", "Advance", "PhonePe", "Razorpay"]),
        paymentPlan: z.enum(["full", "advance30", "cod", "phonepe_full", "phonepe_advance30", "razorpay_full", "razorpay_advance30"]).default("cod"),
        amountPaid: z.number().default(0),
        paymentId: z.string().optional(),
        status: z.enum(["pending_payment", "placed"]).optional().default("placed"),
        notes: z.string().max(1000).optional(),
        // Gift options from checkout. The ₹49 gift-wrap fee IS charged
        // server-side (computeOrderAmounts adds GIFT_WRAP_FEE when giftWrap is
        // set); the flag + message are also recorded on the order for fulfilment.
        isGiftWrapped: z.boolean().optional(),
        giftMessage: z.string().max(200).optional(),
        // Loyalty points the customer wants to redeem this order. Validated
        // server-side against their real balance + min/max caps; the client
        // number is never trusted for the discount.
        redeemPoints: z.number().int().min(0).optional(),
        utmSource: z.string().max(200).optional(),
        utmMedium: z.string().max(200).optional(),
        utmCampaign: z.string().max(200).optional(),
        utmContent: z.string().max(200).optional(),
        utmTerm: z.string().max(200).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const customerId = ctx.customer.customerId;
        let amounts = await computeOrderAmounts({
          items: input.items,
          couponCode: input.couponCode,
          paymentPlan: input.paymentPlan,
          validatePrices: true,
          giftWrap: input.isGiftWrapped,
        });
        // NW-DATA-02: enforce a per-customer coupon limit. If this customer has
        // already used the coupon perUserLimit times, drop the discount and
        // recompute at full price (the order still goes through). Global maxUses
        // is enforced separately by the atomic incrementCouponUsage. (Best-effort
        // under concurrency — acceptable since prepaid money is captured anyway.)
        if (amounts.couponCode) {
          try {
            const cpn = await getCouponByCode(amounts.couponCode);
            if (cpn && cpn.perUserLimit > 0) {
              const used = await countCustomerCouponUses(customerId, amounts.couponCode);
              if (used >= cpn.perUserLimit) {
                amounts = await computeOrderAmounts({
                  items: input.items,
                  couponCode: null,
                  paymentPlan: input.paymentPlan,
                  validatePrices: true,
                  giftWrap: input.isGiftWrapped,
                });
              }
            }
          } catch (e) { console.error("[coupon] per-user limit check failed", e); }
        }

        // Loyalty redemption: validate the requested points against the real
        // balance + min/max caps, then recompute the order with the discount.
        // Points are debited (below) only after the order is created, and only
        // the amount actually applied (the discount is capped to goods value).
        let pointsToDebit = 0;
        if (input.redeemPoints && input.redeemPoints > 0) {
          try {
            const balance = await getPointsBalance(customerId);
            const pointsWanted = Math.min(
              Math.floor(input.redeemPoints),
              balance,
              LOYALTY_RULES.MAX_REDEMPTION_PER_ORDER,
            );
            if (pointsWanted >= LOYALTY_RULES.MIN_REDEMPTION) {
              const requestedDiscount = Math.floor(pointsWanted / LOYALTY_RULES.POINTS_PER_DISCOUNT);
              amounts = await computeOrderAmounts({
                items: input.items,
                couponCode: amounts.couponCode,
                paymentPlan: input.paymentPlan,
                validatePrices: true,
                giftWrap: input.isGiftWrapped,
                loyaltyDiscount: requestedDiscount,
              });
              pointsToDebit = amounts.loyaltyDiscount * LOYALTY_RULES.POINTS_PER_DISCOUNT;
            }
          } catch (e) { console.error("[loyalty] redemption failed", e); }
        }

        // amountPaid cannot exceed what is actually owed.
        const amountPaid = Math.min(Math.max(0, Math.round(input.amountPaid)), amounts.total);

        // Fold gift-wrap intent into notes so it reaches the order/admin without
        // a schema migration (previously these fields were silently dropped).
        const giftNote = input.isGiftWrapped
          ? `🎁 Gift wrap requested${input.giftMessage?.trim() ? ` — message: "${input.giftMessage.trim()}"` : ""}`
          : "";
        const combinedNotes = [input.notes?.trim(), giftNote].filter(Boolean).join(" | ") || null;

        // NW-DATA-01: order insert + stock decrement run atomically — if any
        // item can't be reserved the whole thing rolls back (no orphan order).
        let order;
        try {
          // Order channel: the Flutter app's HTTP client (Dart/dio) sends a
          // "Dart"/dart:io User-Agent; browsers send a "Mozilla" one. Detected
          // server-side so no app change / new APK is needed.
          const ua = String(ctx.req?.headers?.["user-agent"] || "");
          const orderSource = /dart|dio|flutter|okhttp/i.test(ua)
            ? "app"
            : (/mozilla|chrome|safari|firefox|edg|webkit/i.test(ua) ? "web" : "web");
          order = await createOrderWithStock({
            id: input.id,
            customerId,
            customerName: input.customerName,
            phone: input.phone,
            email: input.email || "",
            address: input.address,
            city: input.city,
            state: input.state || "",
            pincode: input.pincode,
            items: amounts.items,
            subtotal: amounts.subtotal,
            couponCode: amounts.couponCode,
            couponDiscount: amounts.couponDiscount,
            total: amounts.total,
            paymentMethod: input.paymentMethod,
            paymentPlan: input.paymentPlan,
            amountPaid,
            status: input.status || "placed",
            notes: combinedNotes,
            utmSource: input.utmSource || null,
            utmMedium: input.utmMedium || null,
            utmCampaign: input.utmCampaign || null,
            utmContent: input.utmContent || null,
            utmTerm: input.utmTerm || null,
            source: orderSource,
          }, amounts.items);
        } catch (e) {
          if (e instanceof OrderStockError) {
            throw new TRPCError({ code: "CONFLICT", message: "Some items are no longer in stock. Please update your cart." });
          }
          console.error("[order] createOrderWithStock failed", e);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not place your order. Please try again." });
        }
        // Debit redeemed loyalty points now that the order exists (the discount is
        // baked into order.total). If the order is later cancelled, the points are
        // refunded in the cancel path. Best-effort — a failed debit never blocks
        // the order (the customer simply keeps their points).
        if (pointsToDebit > 0) {
          addLoyaltyPoints(customerId, -pointsToDebit, "redeemed", `Redeemed on order #${order.id}`, order.id)
            .catch((e) => console.error("[loyalty] debit failed", e));
        }
        // Persist email/name onto the customer profile so future orders auto-fill
        // and the customer becomes reachable for email campaigns. Best-effort.
        if (input.phone && (input.email || input.customerName)) {
          try {
            await upsertCustomerByPhone(input.phone, {
              name: input.customerName || undefined,
              email: input.email || undefined,
            });
          } catch (e) { console.error("[order] profile email/name save failed", e); }
        }
        // Only send confirmations when order is actually placed (not pending_payment)
        if (input.status !== "pending_payment") {
        // Redeem the coupon atomically now that the order is placed. Best-effort:
        // payment is already captured for prepaid orders by this point, so a coupon
        // that just hit its limit must not fail the order — the atomic conditional
        // simply caps usedCount at maxUses. (Pending orders redeem at confirmOrder.)
        if (input.couponCode) {
          try { await incrementCouponUsage(input.couponCode); } catch (e) { console.error("[coupon] redeem failed", e); }
        }
        // GST tax-invoice PDF → generated once (persisted) + emailed here. The
        // WhatsApp invoice document is sent once on "Order Confirm" tap (webhook),
        // never at placement — avoids duplicate invoices on WhatsApp.
        // Invoice + all notifications run in the BACKGROUND (Vercel waitUntil) so
        // "Placing order…" returns the instant the order is saved instead of
        // waiting on PDF generation, WhatsApp, email, SMS and tracking calls.
        runInBackground(async () => {
        const invoice = await generateOrderInvoice(order);
        await Promise.allSettled([
          sendOrderConfirmationSMS(input.phone, input.id, amounts.total, input.paymentMethod),
          sendOrderConfirmation({
            phone: input.phone,
            customerName: input.customerName,
            orderId: input.id,
            total: amounts.total,
            items: amounts.items.map(i => `${i.name} x${i.quantity}`).join(", "),
            paymentMethod: input.paymentMethod,
            firstProductImage: amounts.items[0]?.image || undefined,
          }),
          input.email ? sendOrderConfirmationEmail({
            orderId: input.id,
            customerName: input.customerName,
            customerEmail: input.email,
            items: amounts.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, image: i.image })),
            subtotal: amounts.subtotal,
            discount: amounts.couponDiscount,
            shipping: 0,
            total: amounts.total,
            address: `${input.address}, ${input.city}, ${input.pincode}`,
            paymentMethod: input.paymentMethod,
            orderDate: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
          }, invoice?.pdf) : Promise.resolve(),
          notifyAdminNewOrder({
            id: input.id,
            customerName: input.customerName,
            phone: input.phone,
            total: amounts.total,
            paymentMethod: input.paymentMethod,
            items: amounts.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
            city: input.city,
          }),
          trackPurchase({
            eventId: `purchase-${input.id}`,
            orderTotal: amounts.total,
            orderId: input.id,
            productIds: amounts.items.map(i => String(i.id)),
            numItems: amounts.items.reduce((sum, i) => sum + i.quantity, 0),
            userData: {
              phone: input.phone,
              email: input.email || undefined,
              firstName: input.customerName.split(" ")[0],
              lastName: input.customerName.split(" ").slice(1).join(" ") || undefined,
              city: input.city,
              state: input.state || undefined,
              zipCode: input.pincode,
              country: "in",
            },
            sourceUrl: "https://www.nutriwow.in/payment-status",
          }),
        ]);
        });
        } // end if (status !== pending_payment)
        return order;
      }),
    /** Confirm a pending_payment order after successful payment */
    confirmOrder: customerProcedure
      .input(z.object({ orderId: z.string(), paymentId: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const order = await getOrderById(input.orderId);
        if (!order) throw new Error("Order not found");
        if (order.customerId !== ctx.customer.customerId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
        }
        if (order.status !== "pending_payment") {
          // Already confirmed (e.g. by verifyRazorpay or the gateway webhook) — idempotent.
          return order;
        }
        // SECURITY: never trust a bare client call to mark an order paid. Verify the
        // payment with the gateway, server-side, before finalizing the order.
        const method = (order.paymentMethod || "").toLowerCase();
        if (method === "phonepe") {
          const client = getPhonePeClient();
          const resp: any = await client.getOrderStatus(order.id);
          const state = String(resp?.state || resp?.data?.state || "").toUpperCase();
          if (state !== "COMPLETED") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Payment not completed yet." });
          }
        } else if (method === "razorpay") {
          // Razorpay orders are finalized by verifyRazorpay (HMAC signature check). If
          // the order is still pending here, payment was never verified — refuse.
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment not verified. Please complete the payment." });
        } else {
          // COD / unknown methods are placed at creation and never reach this path.
          throw new TRPCError({ code: "BAD_REQUEST", message: "This order cannot be confirmed." });
        }
        return finalizePendingOrder(order);
      }),

    /** Generate GST invoice data for a customer's order */
    getGSTInvoice: customerProcedure
      .input(z.object({ orderId: z.string() }))
      .query(async ({ input, ctx }) => {
        const order = await getOrderById(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        if (order.customerId !== ctx.customer.customerId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }
        return buildGSTInvoiceData(order);
      }),

    /**
     * Download-invoice endpoint: (re)generates the GST tax-invoice PDF for a
     * customer's own order, persists it to Blob at a stable path, and returns
     * the public URL. Idempotent — same order always maps to the same URL, so
     * the invoice stays downloadable from order history at any time.
     */
    getInvoiceUrl: customerProcedure
      .input(z.object({ orderId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const order = await getOrderById(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        if (order.customerId !== ctx.customer.customerId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }
        const invoice = await generateOrderInvoice(order);
        if (!invoice?.url) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not generate invoice" });
        }
        return { url: invoice.url };
      }),
  }),
  // ─── Admin Orders ─────────────────────────────────────────────────────────
  adminOrders: router({
    getAll: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).default(200), offset: z.number().int().min(0).default(0) }).optional())
      .query(async ({ input }) => getAllOrders(input)),

    updateStatus: adminProcedure
      .input(z.object({ id: z.string(), status: z.enum(["placed", "processing", "shipped", "delivered", "cancelled"]) }))
      .mutation(async ({ input }) => {
        const prev = await getOrderById(input.id);
        const order = await updateOrderStatus(input.id, input.status);
        if (input.status === "cancelled" && prev && prev.status !== "cancelled") {
          try {
            const items = Array.isArray(prev.items) ? prev.items as { id: string; quantity: number }[] : [];
            await incrementStockForOrder(items);
          } catch (e) { console.error("[order] stock restore failed", e); }
          // Give back any loyalty points the customer redeemed on this order.
          try { await refundRedeemedPoints(input.id); } catch (e) { console.error("[loyalty] refund on cancel failed", e); }
          // Credit note (accounting) + cancellation notice on email & WhatsApp.
          (async () => {
            const target = order || prev;
            const creditNote = await generateOrderCreditNote(target, "Order cancelled");
            const phone = (target.phone || "").replace(/\D/g, "");
            await Promise.allSettled([
              target.email ? sendOrderCancelledEmail({
                orderId: target.id,
                customerName: target.customerName || "Customer",
                customerEmail: target.email,
                total: target.total,
                reason: "Order cancelled",
                paymentMethod: target.paymentMethod,
              }, creditNote?.pdf) : Promise.resolve(),
              phone ? sendTextMessage(phone, [
                `❌ *Order Cancelled*`,
                ``,
                `Hi ${target.customerName || "there"}, your order *#${target.id}* (₹${target.total}) has been cancelled.`,
                ``,
                `A credit note has been generated${target.email ? " and emailed to you" : ""}.`,
                /cod/i.test(target.paymentMethod || "") ? `` : `Any online payment will be refunded to your original method in 5-7 business days.`,
                ``,
                `— Team Nutriwow`,
              ].filter(Boolean).join("\n")).catch(() => {}) : Promise.resolve(),
              (phone && creditNote?.url)
                ? sendDocumentMessage(phone, creditNote.url, `CreditNote-${target.id}.pdf`, `🧾 Credit note for cancelled order #${target.id}`).catch(() => {})
                : Promise.resolve(),
            ]);
          })().catch((e) => console.error("[cancel] notify failed", e));
        }
        // Auto-send WhatsApp notification on status change
        if (order && order.phone) {
          const phone = order.phone.replace(/\D/g, ""); // strip non-digits
          const name = order.customerName || "Customer";
          if (input.status === "placed" || input.status === "processing") {
            const items = Array.isArray(order.items)
              ? (order.items as any[]).map((i: any) => `${i.name} x${i.quantity}`).join(", ")
              : "your items";
            await sendOrderConfirmation({
              phone,
              customerName: name,
              orderId: order.id,
              total: order.total,
              items,
              paymentMethod: order.paymentMethod || "Online",
            }).catch(console.error);
          } else if (input.status === "delivered") {
            await sendOrderDelivered({ phone, customerName: name, orderId: order.id }).catch(console.error);
          }
        }
        // Auto-award loyalty points on delivery. order.total is in RUPEES (see
        // server/pricing.ts) and POINTS_PER_RUPEE = 1, so ₹1 spent = 1 point.
        if (input.status === "delivered" && order && order.customerId > 0) {
          const earnedPoints = Math.floor(order.total); // ₹1 = 1 point
          if (earnedPoints > 0) {
            addLoyaltyPoints(order.customerId, earnedPoints, "earned", `Order #${order.id}`, order.id).catch(console.error);
          }
        }
        return order;
      }),

    updateShipping: adminProcedure
      .input(z.object({
        id: z.string(),
        awbCode: z.string().optional(),
        trackingUrl: z.string().optional(),
        shippingProvider: z.string().optional(),
        status: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const order = await updateOrderShipping(id, data);
        // Auto-send WhatsApp shipped notification when AWB is set
        if (order && order.phone && data.awbCode) {
          const phone = order.phone.replace(/\D/g, "");
          const name = order.customerName || "Customer";
          sendOrderShipped({
            phone,
            customerName: name,
            orderId: order.id,
            awbCode: data.awbCode,
            trackingUrl: data.trackingUrl,
            shippingProvider: data.shippingProvider,
          }).catch(console.error);
          // Also send shipping update email if customer email is available
          if (order.email) {
            sendShippingUpdateEmail({
              orderId: order.id,
              customerName: name,
              customerEmail: order.email,
              awbNumber: data.awbCode,
              courierName: data.shippingProvider || "Courier Partner",
              trackingUrl: data.trackingUrl,
            }).catch(console.error);
          }
        }
        return order;
      }),

    getById: adminProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return getOrderById(input.id);
      }),

    /** Generate GST invoice data for any order (admin) */
    getGSTInvoice: adminProcedure
      .input(z.object({ orderId: z.string() }))
      .query(async ({ input }) => {
        const order = await getOrderById(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        return buildGSTInvoiceData(order);
      }),

    /** Download-invoice (admin): (re)generate + persist the GST tax-invoice PDF
     *  for ANY order and return its public URL. */
    getInvoiceUrl: adminProcedure
      .input(z.object({ orderId: z.string() }))
      .mutation(async ({ input }) => {
        const order = await getOrderById(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        const invoice = await generateOrderInvoice(order);
        if (!invoice?.url) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not generate invoice" });
        }
        return { url: invoice.url };
      }),

    /**
     * NW-PAY-02: admin-initiated Razorpay refund (full or partial). Charges the
     * gateway and records refundedAmount/refundStatus on the order. Only works
     * for Razorpay orders that carry a stored payment id (orders placed after
     * refund support shipped). COD/PhonePe are refunded manually.
     * IMPORTANT: verify in Razorpay TEST mode before using on live orders.
     */
    refund: adminProcedure
      .input(z.object({ orderId: z.string(), amount: z.number().positive().optional() }))
      .mutation(async ({ input }) => {
        const order = await getOrderById(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        if ((order.paymentMethod || "").toLowerCase() !== "razorpay") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Automated refunds support Razorpay orders only. Refund COD/PhonePe manually." });
        }
        if (!order.paymentId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No payment id on this order (may predate refund support). Refund from the Razorpay dashboard." });
        }
        const alreadyRefunded = order.refundedAmount || 0;
        const maxRefundable = (order.amountPaid || 0) - alreadyRefunded;
        if (maxRefundable <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Nothing left to refund on this order." });
        const amount = input.amount ? Math.round(input.amount) : maxRefundable;
        if (amount > maxRefundable) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Refund exceeds refundable amount (₹${maxRefundable}).` });
        }

        // Resolve test/live keys the same way as payment initiation.
        const settings = await getAllStoreSettings() as Record<string, unknown>;
        let keyId = process.env.RAZORPAY_KEY_ID || "";
        let keySecret = process.env.RAZORPAY_KEY_SECRET || "";
        try {
          const raw = settings["payments"];
          const paySettings = typeof raw === "string" ? JSON.parse(raw) : ((raw as Record<string, unknown>) ?? null);
          if (paySettings) {
            const isLive = paySettings.mode === "live";
            keyId = isLive ? (paySettings.liveKeyId || keyId) : (paySettings.testKeyId || keyId);
            keySecret = isLive ? (paySettings.liveKeySecret || keySecret) : (paySettings.testKeySecret || keySecret);
          }
        } catch {}
        if (!keyId || !keySecret) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Razorpay credentials not configured." });

        const client = getRazorpayClient(keyId, keySecret);
        try {
          await client.payments.refund(order.paymentId, { amount: amount * 100 });
        } catch (e: any) {
          console.error("[refund] Razorpay refund failed:", e?.message);
          await recordRefund(order.id, alreadyRefunded, "failed").catch(() => {});
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Refund failed: ${e?.error?.description || e?.message || "gateway error"}` });
        }
        const newRefunded = alreadyRefunded + amount;
        const refundStatus = newRefunded >= (order.amountPaid || 0) ? "full" : "partial";
        const updated = await recordRefund(order.id, newRefunded, refundStatus);
        console.log(`[refund] Order ${order.id} refunded ₹${amount} (total ₹${newRefunded}, ${refundStatus})`);
        // Refund confirmation → email (with credit note) + WhatsApp. Best-effort.
        (async () => {
          const creditNote = await generateOrderCreditNote(order, `Refund of ₹${amount}`);
          const phone = (order.phone || "").replace(/\D/g, "");
          await Promise.allSettled([
            order.email ? sendRefundEmail({
              orderId: order.id,
              customerName: order.customerName || "Customer",
              customerEmail: order.email,
              refundAmount: amount,
              status: refundStatus,
            }, creditNote?.pdf) : Promise.resolve(),
            phone ? sendTextMessage(phone, [
              `💸 *Refund Processed*`,
              ``,
              `Hi ${order.customerName || "there"}, a refund of *₹${amount}* for order *#${order.id}* has been processed.`,
              ``,
              `It will reflect in your original payment method within 5-7 business days.`,
              ``,
              `— Team Nutriwow`,
            ].join("\n")).catch(() => {}) : Promise.resolve(),
            (phone && creditNote?.url)
              ? sendDocumentMessage(phone, creditNote.url, `CreditNote-${order.id}.pdf`, `🧾 Credit note for order #${order.id}`).catch(() => {})
              : Promise.resolve(),
          ]);
        })().catch((e) => console.error("[refund] notify failed", e));
        return { success: true, refundedAmount: newRefunded, refundStatus, order: updated };
      }),
  }),

  // ─── Social Proof (recent purchases) ──────────────────────────────────────
  orders: router({
    recentPurchases: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const rows = await db
        .select({
          city: orders.city,
          items: orders.items,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, sevenDaysAgo),
            inArray(orders.status, ["placed", "processing", "shipped", "delivered"]),
          ),
        )
        .orderBy(desc(orders.createdAt))
        .limit(10);

      return rows.map((row) => {
        const items: any[] = typeof row.items === "string" ? JSON.parse(row.items) : (row.items as any[]) ?? [];
        const first = items[0];
        return {
          productName: first?.name ?? "Premium Dry Fruits",
          productImage: first?.image ?? "",
          city: row.city || "India",
          createdAt: row.createdAt.toISOString(),
        };
      });
    }),
  }),

  // ─── Shipping ─────────────────────────────────────────────────────────────
  shipping: router({
    create: adminProcedure
      .input(z.object({
        provider: z.enum(["shiprocket", "ithink"]),
        orderId: z.string(),
        orderDate: z.string(),
        customerName: z.string(),
        phone: z.string(),
        email: z.string(),
        address: z.string(),
        city: z.string(),
        state: z.string(),
        pincode: z.string(),
        items: z.array(z.object({
          name: z.string(),
          sku: z.string().optional().default(""),
          qty: z.number(),
          price: z.number(),
        })),
        totalAmount: z.number(),
        paymentMethod: z.enum(["COD", "Prepaid"]),
        codAmount: z.number().optional(),
        weight: z.number().optional(),
        length: z.number().optional(),
        breadth: z.number().optional(),
        height: z.number().optional(),
        courierId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await createShipment(input.provider, {
          ...input,
          items: input.items.map(i => ({ ...i, sku: i.sku ?? "" })),
        });
        return result;
      }),

    // List couriers servicing a route so the admin can pick one before shipping
    // (Shiprocket; Delhivery is flagged as recommended). iThink returns [].
    couriers: adminProcedure
      .input(z.object({
        provider: z.enum(["shiprocket", "ithink"]),
        deliveryPin: z.string(),
        weight: z.number().optional(),
        cod: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        return getServiceableCouriers(
          input.provider,
          input.deliveryPin,
          input.weight ?? 0.5,
          input.cod ?? false,
        );
      }),

    // Public pincode serviceability check for product pages
    checkPincode: publicProcedure
      .input(z.object({ pincode: z.string().length(6) }))
      .query(async ({ input }) => {
        // Validate: Indian pincodes are 6 digits starting with 1-8
        if (!/^[1-8]\d{5}$/.test(input.pincode)) {
          return { deliverable: false, estimatedDays: null as string | null, courierName: null as string | null };
        }
        // Verify pincode exists via India Post API
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${input.pincode}`);
          const data = await res.json() as Array<{ Status: string }>;
          if (!data?.[0] || data[0].Status !== "Success") {
            return { deliverable: false, estimatedDays: null as string | null, courierName: null as string | null };
          }
        } catch { /* API down — skip validation, allow through */ }
        // Try Shiprocket if configured
        if (ENV.shiprocketEmail && ENV.shiprocketPassword) {
          try {
            const result = await getServiceableCouriers("shiprocket", input.pincode, 0.5, false);
            if (result.success && result.couriers.length > 0) {
              const best = result.couriers.find(c => c.isRecommended) || result.couriers[0];
              return {
                deliverable: true,
                estimatedDays: best.etd || "5-7",
                courierName: best.courierName || null,
              };
            }
          } catch { /* fall through to default */ }
        }
        return { deliverable: true, estimatedDays: "5-7", courierName: null as string | null };
      }),

    track: publicProcedure
      .input(z.object({ provider: z.enum(["shiprocket", "ithink"]), awb: z.string() }))
      .query(async ({ input }) => {
        return trackShipment(input.provider, input.awb);
      }),
  }),

  // ─── Reviews ─────────────────────────────────────────────────────────────────
  reviews: router({
    getByProduct: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => getReviewsByProductId(input.productId, 'approved')),

    ratingStats: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => getProductRatingStats(input.productId)),

    add: customerProcedure
      .input(z.object({
        productId: z.number(),
        customerName: z.string().min(1),
        rating: z.number().min(1).max(5),
        title: z.string().optional(),
        body: z.string().optional(),
        images: z.array(z.string()).max(3).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // SECURITY: derive identity from the authenticated session, never from the
        // client — a client-supplied customerId allowed identity forgery, dedup &
        // rate-limit bypass, and forged "verified purchase" badges.
        const customerId = ctx.customer.customerId;
        await checkRateLimit("review-add", `${customerId}`, 5, 60 * 60 * 1000);
        const review = await addProductReview({
          ...input,
          customerId,
          images: input.images ?? [],
        });
        // Verified purchase: look for THIS customer's delivered orders containing the product
        if (customerId > 0 && review) {
          try {
            const db = await getDb();
            if (db) {
              const customerOrders = await db.select({ items: orders.items })
                .from(orders)
                .where(and(
                  eq(orders.customerId, customerId),
                  eq(orders.status, "delivered"),
                ));
              const hasPurchased = customerOrders.some((o) => {
                const items = (typeof o.items === "string" ? JSON.parse(o.items) : o.items) as Array<{ id?: number; productId?: number }>;
                return items.some((item) => (item.id ?? item.productId) === input.productId);
              });
              if (hasPurchased) {
                await markReviewVerified(review.id);
                review.verified = true;
              }
            }
          } catch {
            // Non-critical — review is still saved, just not marked verified
          }
        }
        return review;
      }),

    // SECURITY: authenticated + rate-limited + MIME-whitelisted. Previously this
    // was a publicProcedure, allowing anonymous uploads of arbitrary content
    // (storage/cost abuse + content smuggling via a brand blob host) — NW-SEC-02.
    uploadImage: customerProcedure
      .input(z.object({
        base64: z.string(),
        filename: z.string().default("review-image.jpg"),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const customerId = ctx.customer.customerId;
        await checkRateLimit("review-image-upload", `${customerId}`, 20, 60 * 60 * 1000);
        const buffer = Buffer.from(input.base64, "base64");
        if (buffer.length > 5 * 1024 * 1024) {
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Image must be under 5 MB." });
        }
        // Sanitize the client filename to its extension only — never trust it as a path.
        const ext = (input.filename.match(/\.(jpe?g|png|webp|gif)$/i)?.[0] || ".jpg").toLowerCase();
        const suffix = Date.now() + "-" + Math.random().toString(36).slice(2);
        const key = `review-images/${suffix}${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),

    // Admin endpoints
    getAll: adminProcedure
      .query(async () => getAllReviews()),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const productId = await deleteReview(input.id);
        if (!productId) throw new TRPCError({ code: "NOT_FOUND", message: "Review not found" });
        return { success: true, productId };
      }),

    myReviews: customerProcedure
      .query(async ({ ctx }) => getReviewsByCustomerId(ctx.customer.customerId)),

    adminList: adminProcedure
      .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }).optional())
      .query(async ({ input }) => getAdminReviews(input?.status)),

    moderate: adminProcedure
      .input(z.object({
        reviewId: z.number(),
        status: z.enum(["pending", "approved", "rejected"]),
      }))
      .mutation(async ({ input }) => updateReviewStatus(input.reviewId, input.status)),

    helpful: publicProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(async ({ input }) => markReviewHelpful(input.reviewId)),
  }),

  // ─── Order Tracking ─────────────────────────────────────────────────────────────────
  orderTracking: router({
    track: customerProcedure
      .input(z.object({ orderId: z.string().min(1) }))
      .query(async ({ input, ctx }) => {
        const order = await getOrderByIdForTracking(input.orderId);
        if (!order || order.customerId !== ctx.customer.customerId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
        }
        return order;
      }),
  }),

  // ─── Loyalty Points ──────────────────────────────────────────────────────────
  loyalty: router({
    getBalance: customerProcedure
      .query(async ({ ctx }) => {
        const balance = await getPointsBalance(ctx.customer.customerId);
        return { balance, value: Math.floor(balance / LOYALTY_RULES.POINTS_PER_DISCOUNT) };
      }),

    getHistory: customerProcedure
      .query(async ({ ctx }) => {
        return getPointsHistory(ctx.customer.customerId);
      }),

    redeem: customerProcedure
      .input(z.object({ points: z.number().int().positive() }))
      .mutation(async () => {
        // SECURITY/CORRECTNESS: redemption is NOT wired into checkout — neither
        // computeOrderAmounts nor placeOrder apply a points discount, so debiting
        // points here would silently burn the customer's balance for no benefit.
        // Disabled until checkout actually consumes the discount inside the order
        // transaction. (No client currently calls this.)
        throw new TRPCError({ code: "METHOD_NOT_SUPPORTED", message: "Points redemption is coming soon." });
      }),

    getRules: publicProcedure
      .query(() => LOYALTY_RULES),
  }),

  // ─── Newsletter ─────────────────────────────────────────────────────────────────
  newsletter: router({
    // Is this phone/email already subscribed? Used to hide the "subscribe for
    // offers" opt-in from customers who've already joined.
    isSubscribed: publicProcedure
      .input(z.object({ phone: z.string().optional(), email: z.string().optional() }))
      .query(async ({ input }) => {
        if (!input.phone && !input.email) return { subscribed: false };
        return { subscribed: await isNewsletterSubscribed({ phone: input.phone, email: input.email }) };
      }),
    subscribe: publicProcedure
      .input(z.object({ phone: z.string().regex(/^\d{10}$/), name: z.string().optional() }))
      .mutation(async ({ input }) => {
        const sub = await subscribeWhatsapp(input.phone, input.name);
        const greeting = input.name ? `Hi ${input.name}! 👋` : "Hi there! 👋";
        sendTextMessage(input.phone, [
          `${greeting}`,
          ``,
          `🎉 *Welcome to the Nutriwow Family!*`,
          ``,
          `You're now subscribed to receive:`,
          `✅ Exclusive discounts & offers`,
          `✅ Early access to new products`,
          `✅ Seasonal deals on premium dry fruits`,
          `✅ Healthy recipes & nutrition tips`,
          ``,
          `🎁 *Your Welcome Offer:* Use code *WELCOME10* for 10% off your first order!`,
          ``,
          `🛒 Shop now: www.nutriwow.in`,
          ``,
          `Thank you for joining us! 🥜🌰`,
          `— Team Nutriwow`,
        ].join("\n")).catch(() => {});
        return sub;
      }),
    subscribeEmail: publicProcedure
      .input(z.object({ email: z.string().email(), name: z.string().optional() }))
      .mutation(async ({ input }) => {
        const sub = await subscribeEmail(input.email, input.name);
        sendWelcomeEmail(input.email, input.name).catch(() => {});
        return sub;
      }),
  }),

  // ─── Coupons ─────────────────────────────────────────────────────────────────
  coupons: router({
    // ADMIN ONLY: returns every coupon (incl. unadvertised + referral codes). The
    // storefront must use getFeatured for any public coupon display.
    getAll: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).default(200), offset: z.number().int().min(0).default(0) }).optional())
      .query(async ({ input }) => getAllCoupons(input)),

    getFeatured: publicProcedure.query(async () => getFeaturedCoupons()),

    // Public: ALL active, non-expired coupons (featured first) for the app cart
    // display — so customers see every usable coupon without the admin needing
    // to mark each one "featured".
    listActive: publicProcedure.query(async () => getActiveCoupons()),

    validate: publicProcedure
      .input(z.object({ code: z.string().min(1), cartTotal: z.number().positive() }))
      .mutation(async ({ input }) => validateCoupon(input.code, input.cartTotal)),

    create: adminProcedure
      .input(z.object({
        code: z.string().min(2).max(50),
        description: z.string().optional(),
        discountType: z.enum(["percent", "flat"]),
        discountValue: z.number().positive(),
        minOrderAmount: z.number().default(0),
        maxUses: z.number().default(0),
        perUserLimit: z.number().int().min(0).default(0),
        isActive: z.boolean().default(true),
        isFeatured: z.boolean().default(false),
        expiresAt: z.date().optional().nullable(),
      }))
      .mutation(async ({ input }) => createCoupon(input as any)),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        code: z.string().min(2).max(50).optional(),
        description: z.string().optional(),
        discountType: z.enum(["percent", "flat"]).optional(),
        discountValue: z.number().positive().optional(),
        minOrderAmount: z.number().optional(),
        maxUses: z.number().optional(),
        perUserLimit: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
        expiresAt: z.date().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateCoupon(id, data as any);
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => deleteCoupon(input.id)),
  }),

  // ─── Product Stock ─────────────────────────────────────────────────────────────────
  stock: router({
    getAll: publicProcedure.query(async () => getAllProductStock()),

    getBulk: publicProcedure
      .input(z.object({ productIds: z.array(z.number()) }))
      .query(async ({ input }) => bulkGetProductStock(input.productIds)),

    upsert: adminProcedure
      .input(z.object({
        productId: z.number(),
        stock: z.number().min(0),
        lowStockThreshold: z.number().min(0).default(10),
      }))
      .mutation(async ({ input }) => {
        const prev = await getStockByProductId(input.productId);
        const result = await upsertProductStock(input.productId, input.stock, input.lowStockThreshold);
        // Keep the product's In Stock / Out of Stock status in sync with qty.
        await updateProduct(input.productId, { available: input.stock > 0 });
        // Back in stock: 0 (or no row) -> >0 → notify waiting customers (non-blocking)
        if ((prev?.stock ?? 0) === 0 && input.stock > 0) {
          notifyBackInStock(input.productId).catch(() => {});
        }
        return result;
      }),

    // Customer asks to be notified when an out-of-stock product is back.
    subscribe: publicProcedure
      .input(z.object({
        productId: z.number(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        name: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (!input.phone && !input.email) throw new Error("Please provide a phone or email.");
        await addStockAlert(input.productId, input.phone, input.email, input.name);
        return { ok: true };
      }),
  }),

  // ─── Blog ─────────────────────────────────────────────────────────────────
  blog: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().default(10) }).optional())
      .query(async ({ input }) => getBlogPosts(input?.limit)),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => getBlogPostBySlug(input.slug)),

    // ─── Admin Blog CRUD ────────────────────────────────────────────────────
    admin: router({
      listAll: adminProcedure
        .query(async () => getAllBlogPostsAdmin()),

      getById: adminProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => getBlogPostById(input.id)),

      create: adminProcedure
        .input(z.object({
          title: z.string().min(1),
          slug: z.string().optional(),
          excerpt: z.string().optional(),
          content: z.string().optional(),
          coverImage: z.string().optional(),
          category: z.string().optional(),
          tags: z.string().optional(),
          author: z.string().optional(),
          seoTitle: z.string().optional(),
          seoDescription: z.string().optional(),
          status: z.enum(["draft", "published"]).default("draft"),
        }))
        .mutation(async ({ input }) => {
          const slug = input.slug || input.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim();
          return createBlogPost({ ...input, slug });
        }),

      update: adminProcedure
        .input(z.object({
          id: z.number(),
          title: z.string().min(1).optional(),
          slug: z.string().optional(),
          excerpt: z.string().optional(),
          content: z.string().optional(),
          coverImage: z.string().optional(),
          category: z.string().optional(),
          tags: z.string().optional(),
          author: z.string().optional(),
          seoTitle: z.string().optional(),
          seoDescription: z.string().optional(),
          status: z.enum(["draft", "published"]).optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return updateBlogPost(id, data);
        }),

      publish: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) =>
          updateBlogPost(input.id, { status: "published", published: true, publishedAt: new Date() })
        ),

      unpublish: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) =>
          updateBlogPost(input.id, { status: "draft", published: false, publishedAt: null })
        ),

      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => deleteBlogPost(input.id)),

      uploadImage: adminProcedure
        .input(z.object({
          base64: z.string(),
          filename: z.string().default("blog-image.jpg"),
          mimeType: z.string().default("image/jpeg"),
        }))
        .mutation(async ({ input }) => {
          const buffer = Buffer.from(input.base64, "base64");
          const suffix = Date.now() + "-" + Math.random().toString(36).slice(2);
          const key = `blog-images/${suffix}-${input.filename}`;
          const { url } = await storagePut(key, buffer, input.mimeType);
          return { url };
        }),

      getUploadToken: adminProcedure
        .input(z.object({
          filename: z.string(),
          contentType: z.string().default("image/jpeg"),
        }))
        .mutation(async ({ input }) => {
          if (!process.env.BLOB_READ_WRITE_TOKEN) {
            throw new Error("Storage not configured: BLOB_READ_WRITE_TOKEN is not set.");
          }
          const { generateClientTokenFromReadWriteToken } = await import("@vercel/blob/client");
          const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
          const ext = input.filename.split(".").pop()?.toLowerCase() || "jpg";
          const safeName = input.filename.replace(/[^a-z0-9._-]/gi, "_").slice(0, 60);
          const pathname = `blog-images/${suffix}-${safeName}`;
          const token = await generateClientTokenFromReadWriteToken({
            pathname,
            maximumSizeInBytes: 20 * 1024 * 1024,
            allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
            addRandomSuffix: false,
          });
          return { token, pathname };
        }),

      aiWrite: adminProcedure
        .input(z.object({
          title: z.string(),
          keywords: z.string().optional(),
          tone: z.string().default("informative"),
        }))
        .mutation(async ({ input }) => {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are an expert SEO content writer for Nutriwow, a premium Indian healthy snacks brand. Your job is to write a focused, detailed blog article STRICTLY about the topic given by the user — do NOT switch to a different topic, do NOT write about unrelated products. Use HTML format with <h2>, <h3>, <p>, <ul>, <li>, <strong> tags. Write for an Indian audience. Keep the entire article tightly focused on the exact title provided.`,
              },
              {
                role: "user",
                content: `Write a comprehensive 800-1200 word blog article with EXACTLY this title: "${input.title}". The ENTIRE article must be about "${input.title}" only — do not drift to other topics.${input.keywords ? ` Focus on these keywords: ${input.keywords}.` : ""} Tone: ${input.tone}. Return only the HTML content body (no <html>, <body>, or <head> tags).`,
              },
            ],
          });
          const content = (response as any)?.choices?.[0]?.message?.content || "";
          return { content };
        }),

      aiSuggestTopics: adminProcedure
        .input(z.object({
          category: z.string().optional(),
          count: z.number().default(10),
        }))
        .mutation(async ({ input }) => {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are an SEO content strategist for Nutriwow, an Indian premium dry fruits and healthy snacks brand. Suggest blog topic ideas that will rank well on Google India.",
              },
              {
                role: "user",
                content: `Suggest ${input.count} SEO-optimized blog topic ideas${input.category ? ` for the category: ${input.category}` : " for a dry fruits and healthy snacks brand"}. Return as JSON array of objects with fields: title (string), category (string), keywords (string).`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "blog_topics",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    topics: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          category: { type: "string" },
                          keywords: { type: "string" },
                        },
                        required: ["title", "category", "keywords"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["topics"],
                  additionalProperties: false,
                },
              },
            },
          });
          const raw = (response as any)?.choices?.[0]?.message?.content || "{}";
          try {
            const parsed = JSON.parse(raw);
            return { topics: parsed.topics || [] };
          } catch {
            return { topics: [] };
          }
        }),

      aiGenerateImage: adminProcedure
        .input(z.object({
          prompt: z.string(),
        }))
        .mutation(async ({ input }) => {
          const { url } = await generateImage({ prompt: input.prompt });
          return { url };
        }),
    }),
  }),

  // ─── Payment ─────────────────────────────────────────────────────────────────
  payment: router({
    // Returns which gateways are enabled (reads from DB settings)
    getActiveGateways: publicProcedure
      .query(async () => {
        const settings = await getAllStoreSettings() as Record<string, unknown>;
        let phonePeEnabled = true;
        let razorpayEnabled = false;
        let razorpayKeyId = "";
        let razorpayMode = "test";
        try {
          const raw = settings["payments"];
          const paySettings = typeof raw === "string" ? JSON.parse(raw) : ((raw as Record<string, unknown>) ?? null);
          if (paySettings) {
            phonePeEnabled = paySettings.phonePeEnabled !== false;
            razorpayEnabled = !!paySettings.rzEnabled;
            razorpayKeyId = paySettings.mode === "live"
              ? (paySettings.liveKeyId || "")
              : (paySettings.testKeyId || "");
            razorpayMode = paySettings.mode || "test";
          }
        } catch {}
        return { phonepe: phonePeEnabled, razorpay: razorpayEnabled, razorpayKeyId: razorpayEnabled ? razorpayKeyId : "", razorpayMode };
      }),

    // Create Razorpay order — returns order_id + publishable key_id for frontend checkout
    initiateRazorpay: customerProcedure
      // SECURITY: the charge amount is computed server-side from cart items +
      // coupon, NOT taken from the client — otherwise a tampered request could
      // pay ₹1 for any order.
      .input(z.object({
        orderId: z.string(),
        items: z.array(z.object({
          id: z.string(),
          quantity: z.number(),
          weight: z.string().optional(),
        })).optional(),
        couponCode: z.string().optional(),
        paymentPlan: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const settings = await getAllStoreSettings() as Record<string, unknown>;
        let keyId = process.env.RAZORPAY_KEY_ID || "";
        let keySecret = process.env.RAZORPAY_KEY_SECRET || "";
        try {
          const raw = settings["payments"];
          const paySettings = typeof raw === "string" ? JSON.parse(raw) : ((raw as Record<string, unknown>) ?? null);
          if (paySettings) {
            const isLive = paySettings.mode === "live";
            keyId = isLive ? (paySettings.liveKeyId || keyId) : (paySettings.testKeyId || keyId);
            keySecret = isLive ? (paySettings.liveKeySecret || keySecret) : (paySettings.testKeySecret || keySecret);
          }
        } catch {}
        if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured. Please add them in Admin → Settings → Payments.");
        const pendingOrder = await getOrderById(input.orderId);
        if (!pendingOrder || pendingOrder.customerId !== ctx.customer.customerId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found. Please retry checkout." });
        }
        if (pendingOrder.status !== "pending_payment") {
          throw new TRPCError({ code: "CONFLICT", message: "This order is not pending payment." });
        }
        const client = getRazorpayClient(keyId, keySecret);
        const payNow = pendingOrder.paymentPlan.endsWith("advance30")
          ? Math.round(pendingOrder.total * 0.3)
          : pendingOrder.total;
        const amountInPaise = Math.round(payNow * 100);
        const order = await client.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt: input.orderId,
          // Auto-capture: capture the payment the moment it's authorized, so it
          // never gets stuck in "created/authorized" (which would leave the
          // order pending_payment and send the customer back to "Pay Now",
          // then auto-refund after ~5 days). The payment.captured webhook then
          // finalizes the order even if the app success callback is missed.
          payment_capture: true,
          notes: { orderId: input.orderId },
        });
        console.log("[Razorpay] Order created:", order.id, "for nutriwow order:", input.orderId);
        return { success: true, razorpayOrderId: order.id, keyId, amount: amountInPaise, orderId: input.orderId };
      }),

    // Verify Razorpay payment signature after checkout popup success
    verifyRazorpay: customerProcedure
      .input(z.object({
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
        orderId: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const pendingOrder = await getOrderById(input.orderId);
        if (!pendingOrder || pendingOrder.customerId !== ctx.customer.customerId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
        }
        if (pendingOrder.status !== "pending_payment") {
          return { success: true, orderId: input.orderId, paymentId: input.razorpayPaymentId };
        }
        const settings = await getAllStoreSettings() as Record<string, unknown>;
        let keyId = process.env.RAZORPAY_KEY_ID || "";
        let keySecret = process.env.RAZORPAY_KEY_SECRET || "";
        try {
          const raw = settings["payments"];
          const paySettings = typeof raw === "string" ? JSON.parse(raw) : ((raw as Record<string, unknown>) ?? null);
          if (paySettings) {
            const isLive = paySettings.mode === "live";
            keyId = isLive ? (paySettings.liveKeyId || keyId) : (paySettings.testKeyId || keyId);
            keySecret = isLive ? (paySettings.liveKeySecret || keySecret) : (paySettings.testKeySecret || keySecret);
          }
        } catch {}
        const body = input.razorpayOrderId + "|" + input.razorpayPaymentId;
        const expectedSig = crypto.createHmac("sha256", keySecret).update(body).digest("hex");
        const sigBuf = Buffer.from(input.razorpaySignature);
        const expBuf = Buffer.from(expectedSig);
        const isValid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
        console.log("[Razorpay] Signature verification:", isValid ? "VALID" : "INVALID", "| Order:", input.orderId);
        if (!isValid) throw new Error("Payment verification failed. Please contact support.");
        // Explicitly capture the payment so it can never get stuck in
        // "authorized/created" (which auto-refunds after ~5 days and leaves the
        // order unpaid). Best-effort + idempotent: if the payment is already
        // captured (e.g. by auto-capture or the webhook), Razorpay errors with
        // "already captured" — we ignore that and proceed to finalize.
        if (keyId && keySecret) {
          try {
            const payNow = pendingOrder.paymentPlan.endsWith("advance30")
              ? Math.round(pendingOrder.total * 0.3)
              : pendingOrder.total;
            const client = getRazorpayClient(keyId, keySecret);
            await client.payments.capture(input.razorpayPaymentId, Math.round(payNow * 100), "INR");
            console.log("[Razorpay] Payment captured on verify:", input.razorpayPaymentId, "| Order:", input.orderId);
          } catch (e: any) {
            const msg = String(e?.error?.description || e?.message || e);
            if (/already been captured|already captured/i.test(msg)) {
              console.log("[Razorpay] Payment already captured:", input.razorpayPaymentId);
            } else {
              console.error("[Razorpay] Capture on verify failed:", msg, "| Order:", input.orderId);
            }
          }
        }
        // Signature verified server-side — THIS is the authoritative point that
        // finalizes a Razorpay order (place + redeem coupon + notify). confirmOrder
        // will then no-op (order already "placed"). Capture the payment id for refunds.
        await finalizePendingOrder(pendingOrder, input.razorpayPaymentId);
        return { success: true, orderId: input.orderId, paymentId: input.razorpayPaymentId };
      }),

    initiate: customerProcedure
      .input(z.object({
        orderId: z.string(),
        // Accepted for backwards compatibility but IGNORED — the charge is derived
        // from the stored order (created with pending_payment before this call).
        amount: z.number().positive().optional(),
        mobile: z.string().optional(),
        redirectUrl: z.string().url(),
      }))
      .mutation(async ({ input, ctx }) => {
        // SECURITY: derive the charge from the authoritative stored order, not the
        // client. The order was persisted (with server-recomputed total) by
        // placeOrder before PhonePe initiation.
        const order = await getOrderById(input.orderId);
        if (!order) throw new Error("Order not found. Please retry checkout.");
        if (order.customerId !== ctx.customer.customerId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found. Please retry checkout." });
        }
        if (order.status !== "pending_payment") {
          throw new TRPCError({ code: "CONFLICT", message: "This order is not pending payment." });
        }
        const payNow = order.paymentPlan.endsWith("advance30")
          ? Math.round(order.total * 0.3)
          : order.total;
        const client = getPhonePeClient();
        const amountInPaise = Math.round(payNow * 100);
        const request = StandardCheckoutPayRequest.builder()
          .merchantOrderId(input.orderId)
          .amount(amountInPaise)
          .redirectUrl(input.redirectUrl)
          .build();
        const response = await client.pay(request);
        console.log("[PhonePe] Payment initiation response:", JSON.stringify(response));
        const checkoutUrl = response?.redirectUrl || (response as any)?.data?.instrumentResponse?.redirectInfo?.url;
        if (!checkoutUrl) throw new Error("Failed to get PhonePe checkout URL. Please try again.");
        return { success: true, checkoutUrl, orderId: input.orderId };
      }),

    status: customerProcedure
      .input(z.object({ orderId: z.string() }))
      .query(async ({ input, ctx }) => {
        const order = await getOrderById(input.orderId);
        if (!order || order.customerId !== ctx.customer.customerId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
        }
        const client = getPhonePeClient();
        const response = await client.getOrderStatus(input.orderId);
        console.log("[PhonePe] Order status response:", JSON.stringify(response));
        return {
          orderId: input.orderId,
          state: (response as any)?.state || (response as any)?.data?.state || "UNKNOWN",
          amount: (response as any)?.amount || (response as any)?.data?.amount,
          paymentDetails: (response as any)?.paymentDetails || (response as any)?.data?.paymentDetails || [],
        };
      }),
  }),
  // ─── Store Settings ────────────────────────────────────────────────────────────
  settings: router({
    // PUBLIC: returns ONLY a whitelisted projection of non-sensitive settings the
    // storefront needs (SEO meta + analytics/pixel IDs that are client-side public
    // anyway). It must never expose the full settings blob — `payments` contains the
    // Razorpay key secret + webhook secret, which `getAll` would otherwise leak to
    // anyone. Add new public fields here deliberately, never whole objects.
    getPublic: publicProcedure.query(async () => {
      const all = (await getAllStoreSettings()) as Record<string, unknown>;
      const parse = (key: string): Record<string, unknown> => {
        const raw = all[key];
        if (raw == null) return {};
        try {
          const v = typeof raw === "string" ? JSON.parse(raw) : raw;
          return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
        } catch {
          return {};
        }
      };
      const integrations = parse("integrations");
      const events = parse("events");
      const general = parse("general");
      const policies = parse("policies");
      const language = parse("language");
      const privacy = parse("privacy");
      const checkout = parse("checkout");
      // App-only display flags (Flutter app reads these). vegMark toggles the
      // green veg indicator on product cards; default OFF (clean image).
      const appConfigRaw = parse("appConfig");
      const appConfig = { vegMark: appConfigRaw["vegMark"] === true };
      const shippingRaw = parse("shipping");
      const shippingZone = (Array.isArray((shippingRaw as { zones?: unknown }).zones)
        ? ((shippingRaw as { zones: { rate?: string | number; freeAbove?: string | number }[] }).zones[0])
        : undefined);
      const shipping = shippingZone
        ? { fee: Number(shippingZone.rate) || 0, freeAbove: Number(shippingZone.freeAbove) || 0 }
        : { fee: 49, freeAbove: 499 };
      // Metafield definitions are stored as an array, not an object.
      const rawMetafields = (() => {
        const raw = all["metafields"];
        if (raw == null) return [];
        try {
          const v = typeof raw === "string" ? JSON.parse(raw) : raw;
          return Array.isArray(v) ? v : [];
        } catch { return []; }
      })() as Array<{ name?: string; key?: string; appliesTo?: string }>;
      const productMetafields = rawMetafields
        .filter(f => (f.appliesTo ?? "Product") === "Product" && f.key && f.name)
        .map(f => ({ key: String(f.key), name: String(f.name) }));
      const pick = (obj: Record<string, unknown>, keys: string[]) =>
        Object.fromEntries(keys.filter(k => obj[k] !== undefined).map(k => [k, obj[k]]));
      return {
        integrations: pick(integrations, [
          "pinterest_tag_id",
          "microsoft_uet_id",
          "snapchat_pixel_id",
          "facebook_pixel_id",
        ]),
        events: pick(events, ["fbpixel", "gtm", "hotjar"]),
        general: pick(general, ["storeName", "storeEmail", "gscVerification"]),
        policies: pick(policies, ["refund", "return", "shipping", "privacy", "terms"]),
        language: pick(language, ["default", "enabled"]),
        privacy: pick(privacy, ["cookieBanner", "cookieMessage"]),
        checkout: pick(checkout, ["minOrderValue", "orderNotes", "termsRequired", "prepaidDiscountPercent", "deliveryDaysMin", "deliveryDaysMax"]),
        shipping,
        appConfig,
        metafields: productMetafields,
        // "Also available on" marketplace links (footer). Set via the
        // `marketplaces` store setting: [{name, url}]. Admin can override;
        // when unset we fall back to the default marketplace list below.
        marketplaces: (() => {
          const raw = all["marketplaces"];
          try {
            const v = typeof raw === "string" ? JSON.parse(raw) : raw;
            const list = Array.isArray(v)
              ? v.filter((m: any) => m && m.name && m.url).map((m: any) => ({ name: String(m.name), url: String(m.url) }))
              : [];
            return list.length > 0 ? list : DEFAULT_MARKETPLACES;
          } catch { return DEFAULT_MARKETPLACES; }
        })() as Array<{ name: string; url: string }>,
        // Sister brands shown in the footer ("Our brands"). Admin can override
        // via the `sisterBrands` store setting: [{name, url, logo}]. When unset,
        // the default Kuddle entry uses the admin-uploaded kuddleLogo if present.
        sisterBrands: (() => {
          const brand = (() => {
            const r = all["brandAssets"];
            try { return (typeof r === "string" ? JSON.parse(r) : r) as Record<string, string>; }
            catch { return {} as Record<string, string>; }
          })();
          // Map each default brand to its admin-uploaded logo when available,
          // else keep the static client/public fallback.
          const assetFor: Record<string, string | undefined> = {
            "Kuddle Super Meal": brand?.kuddleLogo,
            "Mr Healthybite": brand?.mrHealthybiteLogo,
            "Nutriday": brand?.nutridayLogo,
          };
          const defaults = DEFAULT_SISTER_BRANDS.map((b) =>
            assetFor[b.name] ? { ...b, logo: String(assetFor[b.name]) } : b,
          );
          const raw = all["sisterBrands"];
          try {
            const v = typeof raw === "string" ? JSON.parse(raw) : raw;
            const list = Array.isArray(v)
              ? v.filter((b: any) => b && b.name).map((b: any) => ({
                  name: String(b.name),
                  url: b.url ? String(b.url) : "",
                  logo: b.logo ? String(b.logo) : "",
                }))
              : [];
            return list.length > 0 ? list : defaults;
          } catch { return defaults; }
        })() as Array<{ name: string; url: string; logo: string }>,
        // Admin-uploaded brand logos/stamps (invoice + storefront).
        brandAssets: (() => {
          const r = all["brandAssets"];
          try {
            const v = (typeof r === "string" ? JSON.parse(r) : r) as Record<string, string>;
            return {
              nutriwowLogo: v?.nutriwowLogo || "",
              foodondoorLogo: v?.foodondoorLogo || "",
              foodondoorStamp: v?.foodondoorStamp || "",
              kuddleLogo: v?.kuddleLogo || "",
              mrHealthybiteLogo: v?.mrHealthybiteLogo || "",
              nutridayLogo: v?.nutridayLogo || "",
              signature: v?.signature || "",
            };
          } catch {
            return { nutriwowLogo: "", foodondoorLogo: "", foodondoorStamp: "", kuddleLogo: "", mrHealthybiteLogo: "", nutridayLogo: "", signature: "" };
          }
        })(),
      };
    }),
    // ADMIN-ONLY: full settings (includes payment secrets) and all writes.
    getAll: adminProcedure
      .query(async () => getAllStoreSettings()),
    set: adminProcedure
      .input(z.object({ key: z.string(), value: z.unknown() }))
      .mutation(async ({ input }) => setStoreSetting(input.key, input.value)),
    bulkSet: adminProcedure
      .input(z.object({ settings: z.record(z.string(), z.unknown()) }))
      .mutation(async ({ input }) => bulkSetStoreSettings(input.settings)),
  }),
  // ─── Abandoned Carts ──────────────────────────────────────────────────────────
  abandonedCarts: router({
    getAll: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).default(200), offset: z.number().int().min(0).default(0) }).optional())
      .query(async ({ input }) => getAllAbandonedCarts(input)),
    upsert: publicProcedure
      .input(z.object({
        phone: z.string().regex(/^\d{10}$/).optional(),
        name: z.string().max(200).optional(),
        items: z.array(z.unknown()).max(50),
        total: z.number().min(0),
        // Anonymous browser/device id (guest dedup) + channel.
        sessionId: z.string().max(64).optional(),
        source: z.enum(["app", "web"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // IP-derived location from Vercel's edge geo headers — no user prompt,
        // no permission needed. Header values are URL-encoded (e.g. "New%20Delhi").
        const h = (k: string) => {
          const v = ctx.req?.headers?.[k];
          const s = Array.isArray(v) ? v[0] : v;
          try { return s ? decodeURIComponent(s) : ""; } catch { return s || ""; }
        };
        const location = [h("x-vercel-ip-city"), h("x-vercel-ip-country-region"), h("x-vercel-ip-country")]
          .filter(Boolean)
          .join(", ") || undefined;
        return upsertAbandonedCart({
          items: input.items,
          total: input.total,
          name: input.name,
          customerId: ctx.customer?.customerId,
          phone: ctx.customer?.phone ?? input.phone,
          sessionId: input.sessionId,
          source: input.source ?? "web",
          location,
        } as Parameters<typeof upsertAbandonedCart>[0]);
      }),
    markRecovered: adminProcedure
      .input(z.object({ phone: z.string() }))
      .mutation(async ({ input }) => markAbandonedCartRecovered(input.phone)),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => deleteAbandonedCart(input.id)),
    // One-click recovery: nudge the customer via WhatsApp + email with their cart.
    sendReminder: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const carts = await getAllAbandonedCarts();
        const cart = carts.find((c) => c.id === input.id);
        if (!cart) throw new Error("Cart not found.");
        const items = ((cart.items as Array<{ name?: string }>) || []).map((i) => i?.name).filter(Boolean) as string[];
        const itemsText = items.slice(0, 3).join(", ") + (items.length > 3 ? `, +${items.length - 3} more` : "");
        const url = "https://nutriwow.in";
        let whatsapp = false, email = false;
        if (cart.phone) {
          const r = await sendTextMessage(
            cart.phone,
            `Hi${cart.name ? ` ${cart.name}` : ""}! You left ${itemsText || "items"} in your Nutriwow cart 🛒. Complete your order before it's gone: ${url}`
          ).catch(() => ({ success: false }));
          whatsapp = !!(r as { success?: boolean }).success;
        }
        if (cart.email) {
          const rc = await getResendConfig();
          const html =
            `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px">` +
            `<h2 style="color:#43A047;margin:0 0 8px">Forgot something? 🛒</h2>` +
            `<p style="font-size:15px;color:#333">Hi${cart.name ? ` ${cart.name}` : ""}, you left <strong>${itemsText || "items"}</strong> in your cart (₹${cart.total}).</p>` +
            `<p style="margin:20px 0"><a href="${url}" style="display:inline-block;background:#43A047;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Complete your order</a></p>` +
            `<p style="color:#999;font-size:12px">Fresh dry fruits, delivered across India.</p></div>`;
          const r = await sendCampaignEmail(cart.email, "You left items in your cart 🛒 — Nutriwow", html, {
            resendApiKey: rc.apiKey || undefined,
            resendFrom: rc.from || undefined,
          });
          email = r.ok;
        }
        if (!whatsapp && !email) throw new Error("No reachable contact (phone/email) for this cart.");
        return { ok: true, whatsapp, email };
      }),
  }),
  // ─── Customers ──────────────────────────────────────────────────────────────────────
  customers: router({
    getAll: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).default(200), offset: z.number().int().min(0).default(0) }).optional())
      .query(async ({ input }) => getAllCustomers(input)),
    bulkImport: adminProcedure
      .input(z.object({
        customers: z.array(z.object({
          phone: z.string(),
          name: z.string().optional(),
          email: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        let created = 0, updated = 0, skipped = 0;
        for (const c of input.customers) {
          const phone = c.phone.replace(/[^0-9]/g, "").slice(-10);
          if (phone.length !== 10) { skipped++; continue; }
          try {
            const existing = await getCustomerByPhone(phone);
            await upsertCustomerByPhone(phone, {
              name: c.name || undefined,
              email: c.email || undefined,
            });
            if (existing) updated++; else created++;
          } catch { skipped++; }
        }
        return { created, updated, skipped, total: input.customers.length };
      }),
  }),
  // ─── Admin Users (roles & access) ──────────────────────────────────────────────────
  adminUsers: router({
    getAll: adminProcedure.query(async () => {
      const rows = await getAllAdminUsers();
      // Never expose password hashes or reset tokens to the client.
      return rows.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        mobile: u.mobile,
        role: u.role,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      }));
    }),
    // NW-AUTHZ-01: admin-user management is owner/admin-only (managers blocked).
    create: ownerProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().max(200).optional(),
        mobile: z.string().max(15).optional(),
        password: z.string().min(6, "Use at least 6 characters").max(200),
        role: z.enum(["owner", "admin", "manager"]).default("admin"),
      }))
      .mutation(async ({ input }) => {
        const user = await createAdminUser({
          email: input.email,
          name: input.name,
          mobile: input.mobile,
          passwordHash: hashUserPassword(input.password),
          role: input.role,
        });
        return { id: user?.id, email: user?.email };
      }),
    setRole: ownerProcedure
      .input(z.object({ id: z.number(), role: z.enum(["owner", "admin", "manager"]) }))
      .mutation(async ({ input }) => {
        const user = await updateAdminUserRole(input.id, input.role);
        return { id: user?.id, role: user?.role };
      }),
    setPassword: ownerProcedure
      .input(z.object({ id: z.number(), newPassword: z.string().min(6).max(200) }))
      .mutation(async ({ input }) => {
        await updateAdminUserPassword(input.id, hashUserPassword(input.newPassword));
        return { success: true };
      }),
    remove: ownerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => deleteAdminUser(input.id)),
  }),
  // ─── Subscribe & Save ──────────────────────────────────────────────────────
  subscription: router({
    create: customerProcedure
      .input(z.object({
        productId: z.number(),
        variantIdx: z.number().default(0),
        quantity: z.number().min(1).default(1),
        frequencyDays: z.number().refine(v => [15, 30, 60, 90].includes(v), "Invalid frequency"),
      }))
      .mutation(async ({ input, ctx }) => {
        return createSubscription(ctx.customer.customerId, input.productId, input.variantIdx, input.quantity, input.frequencyDays);
      }),

    list: customerProcedure
      .query(async ({ ctx }) => {
        return getUserSubscriptions(ctx.customer.customerId);
      }),

    update: customerProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["active", "paused"]).optional(),
        frequencyDays: z.number().refine(v => [15, 30, 60, 90].includes(v), "Invalid frequency").optional(),
        quantity: z.number().min(1).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        return updateSubscription(id, ctx.customer.customerId, updates);
      }),

    cancel: customerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return updateSubscription(input.id, ctx.customer.customerId, { status: "cancelled" });
      }),

    adminList: adminProcedure
      .query(async () => {
        return getAdminSubscriptions();
      }),
  }),

  // ─── Dashboard ─────────────────────────────────────────────────────────────────────
  dashboard: router({
    stats: adminProcedure
      .query(async () => getDashboardStats()),
  }),
  // ─── WhatsApp ─────────────────────────────────────────────────────────────────────
  whatsapp: router({
    getDailyStats: adminProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) return { sentToday: 0, deliveredToday: 0, dailyLimit: 10000, remaining: 10000, tier: 'TIER_10K' };
        const { whatsappLogs } = await import("../drizzle/schema");
        const { sql } = await import("drizzle-orm");
        
        // Count messages sent today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const [sentResult] = await db.select({
          count: sql<number>`COUNT(*)`
        }).from(whatsappLogs).where(
          sql`${whatsappLogs.sentAt} >= ${todayStart}`
        );
        const sentToday = sentResult?.count || 0;
        
        // Count delivered today (includes 'delivered' + 'read' since read means it was delivered)
        const [deliveredResult] = await db.select({
          count: sql<number>`COUNT(*)`
        }).from(whatsappLogs).where(
          sql`${whatsappLogs.sentAt} >= ${todayStart} AND (${whatsappLogs.status} = 'delivered' OR ${whatsappLogs.status} = 'read')`
        );
        const deliveredToday = deliveredResult?.count || 0;
        
        // Get messaging limit from Meta API. Fall back to the current approved
        // Nutriwow limit so the admin UI stays correct if Meta is temporarily slow.
        let dailyLimit = 10000;
        let tier = 'TIER_10K';
        try {
          const token = process.env.WHATSAPP_TOKEN;
          const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
          if (token && phoneId) {
            const res = await fetch(
              `https://graph.facebook.com/v25.0/${phoneId}?fields=messaging_limit_tier`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await res.json();
            if (data.messaging_limit_tier) {
              tier = data.messaging_limit_tier;
              // Parse tier to get numeric limit
              if (tier === 'TIER_250') dailyLimit = 250;
              else if (tier === 'TIER_1K') dailyLimit = 1000;
              else if (tier === 'TIER_2K') dailyLimit = 2000;
              else if (tier === 'TIER_10K') dailyLimit = 10000;
              else if (tier === 'TIER_100K') dailyLimit = 100000;
              else if (tier === 'UNLIMITED') dailyLimit = 999999;
            }
          }
        } catch (err) {
          console.log('[WhatsApp] Failed to fetch messaging limit tier:', err);
        }
        
        const remaining = Math.max(0, dailyLimit - sentToday);
        return { sentToday, deliveredToday, dailyLimit, remaining, tier };
      }),
    getLogs: adminProcedure
      .input(z.object({ 
        limit: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return getWhatsAppLogsWithStats(input.limit || 500, input.startDate, input.endDate);
      }),
    getCampaigns: adminProcedure
      .query(async () => {
        const campaigns = await getWhatsAppCampaigns();
        const db = await getDb();
        if (!db || campaigns.length === 0) return campaigns;
        
        // For each campaign, calculate actual delivered/failed from whatsappLogs
        const { whatsappLogs } = await import("../drizzle/schema");
        const { sql } = await import("drizzle-orm");
        
        const enriched = await Promise.all(campaigns.map(async (campaign: any) => {
          if (!campaign.id || campaign.totalSent === 0) return campaign;
          
          // Count actual delivered (delivered + read) from logs
          const [deliveredResult] = await db.select({
            count: sql<number>`COUNT(*)`
          }).from(whatsappLogs).where(
            sql`${whatsappLogs.campaignId} = ${campaign.id} AND (${whatsappLogs.status} = 'delivered' OR ${whatsappLogs.status} = 'read')`
          );
          
          // Count actual failed from logs
          const [failedResult] = await db.select({
            count: sql<number>`COUNT(*)`
          }).from(whatsappLogs).where(
            sql`${whatsappLogs.campaignId} = ${campaign.id} AND ${whatsappLogs.status} = 'failed'`
          );
          
          const actualDelivered = deliveredResult?.count || 0;
          const actualFailed = failedResult?.count || 0;
          const productPayload = parseProductCampaignPayload(campaign.message);
          
          return {
            ...campaign,
            rawMessage: campaign.message,
            message: productPayload
              ? `${productPayload.headline} - ${productPayload.products.length} product${productPayload.products.length === 1 ? "" : "s"}`
              : campaign.message,
            productCampaign: productPayload,
            totalDelivered: actualDelivered,
            totalFailed: actualFailed,
          };
        }));
        
        return enriched;
      }),
    createCampaign: adminProcedure
      .input(z.object({
        name: z.string(),
        message: z.string(),
        targetSegment: z.enum(["all", "recent", "inactive"]).default("all"),
      }))
      .mutation(async ({ input }) => createCampaign(input)),
    sendCampaign: adminProcedure
      .input(z.object({
        campaignName: z.string(),
        templateId: z.number(),
        phones: z.array(z.object({
          phone: z.string(),
          name: z.string().optional(),
        })),
        message: z.string(),
        imageUrl: z.string().optional(),
        targetSegment: z.string().default("all"),
        productIds: z.array(z.number()).max(10).optional(),
        productHeadline: z.string().optional(),
        productBody: z.string().optional(),
        productFormat: z.enum(["hero", "carousel", "catalog"]).optional(),
      }))
      .mutation(async ({ input }) => {
        // 1) Look up the template from DB
        const template = await getWhatsappTemplate(input.templateId);
        if (!template) throw new Error("Template not found");

        // 2) If imageUrl is base64, upload to S3 first
        let imageUrl = input.imageUrl;
        if (imageUrl && imageUrl.startsWith('data:')) {
          try {
            const { storagePut } = await import('./storage');
            const base64Data = imageUrl.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const result = await storagePut(
              `whatsapp-campaigns/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
              buffer,
              'image/jpeg'
            );
            imageUrl = result.url;
          } catch (err) {
            console.error('Failed to upload campaign image to S3:', err);
            imageUrl = undefined;
          }
        }
        // Use template image if no campaign-specific image provided
        let finalImageUrl = imageUrl || template.imageUrl || undefined;

        // 2.5) Compress image if over 5MB (WhatsApp limit)
        if (finalImageUrl) {
          try {
            const { ensureImageUnder5MB } = await import('./whatsapp');
            finalImageUrl = await ensureImageUnder5MB(finalImageUrl);
          } catch (err) {
            console.log('[Campaign] Image compression check skipped:', err);
          }
        }

        const selectedProducts = input.productIds?.length
          ? await getProductsByIds(input.productIds)
          : [];
        if (input.productIds?.length && selectedProducts.length === 0) {
          throw new Error("Selected products were not found");
        }
        const productCampaignMessage = selectedProducts.length > 0
          ? JSON.stringify({
              kind: "product_campaign",
              headline: input.productHeadline || input.campaignName,
              body: input.productBody || input.message || template.title,
              format: input.productFormat === "carousel" || input.productFormat === "catalog" ? input.productFormat : "hero",
              products: selectedProducts.slice(0, 10).map((product: any) => ({
                id: product.id,
                name: product.name,
                handle: product.handle,
                imageUrl: (Array.isArray(product.images) && product.images[0]) || product.image,
                price: product.price,
                originalPrice: product.mrp,
                weight: product.weight || undefined,
              })),
            })
          : null;

        // 3) Create campaign row in DB FIRST (so we have a real campaignId)
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { whatsappCampaigns } = await import("../drizzle/schema");
        const campaignInsert = await db.insert(whatsappCampaigns).values({
          name: input.campaignName,
          message: productCampaignMessage || template.title,
          templateId: template.id,
          imageUrl: finalImageUrl || selectedProducts[0]?.image || null,
          buttonText: template.buttonText || null,
          buttonUrl: template.buttonUrl || null,
          targetSegment: input.targetSegment,
          totalSent: 0,
          totalFailed: 0,
          status: "queued",
        });
        const campaignId = Number(campaignInsert[0].insertId);
        if (input.phones.length > 0) {
          await uploadWhatsappContacts(campaignId, input.phones.map((p) => ({
            phone: p.phone,
            name: p.name || "Customer",
          })));
        }

        return { sent: 0, failed: 0, campaignId, status: "queued", total: input.phones.length };
      }),
    processCampaignBatch: adminProcedure
      .input(z.object({ campaignId: z.number().optional() }).optional())
      .mutation(async ({ input }) => processWhatsAppCampaignBatch(20, input?.campaignId)),
    sendOrderConfirmation: adminProcedure
      .input(z.object({
        phone: z.string(),
        customerName: z.string(),
        orderId: z.string(),
        total: z.number(),
        items: z.string(),
        paymentMethod: z.string(),
      }))
      .mutation(async ({ input }) => sendOrderConfirmation(input)),
    testNotifications: adminProcedure
      .input(z.object({ phone: z.string(), email: z.string().optional() }))
      .mutation(async ({ input }) => {
        const results: Record<string, any> = {};
        try {
          const waResult = await sendOrderConfirmation({
            phone: input.phone,
            customerName: "Test User",
            orderId: "TEST-001",
            total: 999,
            items: "Premium Almonds x1",
            paymentMethod: "COD",
          });
          results.whatsapp = waResult;
        } catch (e: any) {
          results.whatsapp = { success: false, error: e.message };
        }
        if (input.email) {
          try {
            const emailOk = await sendOrderConfirmationEmail({
              orderId: "TEST-001",
              customerName: "Test User",
              customerEmail: input.email,
              items: [{ name: "Premium Almonds", quantity: 1, price: 999 }],
              subtotal: 999, discount: 0, shipping: 0, total: 999,
              address: "Test Address, Indore, 452001",
              paymentMethod: "COD",
              orderDate: new Date().toLocaleDateString("en-IN"),
            });
            results.email = { success: emailOk };
          } catch (e: any) {
            results.email = { success: false, error: e.message };
          }
        }
        return results;
      }),
    sendOrderShipped: adminProcedure
      .input(z.object({
        phone: z.string(),
        customerName: z.string(),
        orderId: z.string(),
        awbCode: z.string(),
        trackingUrl: z.string().optional(),
        shippingProvider: z.string().optional(),
      }))
      .mutation(async ({ input }) => sendOrderShipped(input)),
    sendOrderDelivered: adminProcedure
      .input(z.object({
        phone: z.string(),
        customerName: z.string(),
        orderId: z.string(),
      }))
      .mutation(async ({ input }) => sendOrderDelivered(input)),
    sendAbandonedCartRecovery: adminProcedure
      .input(z.object({
        phone: z.string(),
        customerName: z.string(),
        cartItems: z.string(),
        cartTotal: z.number(),
        cartId: z.number(),
      }))
      .mutation(async ({ input }) => sendAbandonedCartRecovery(input)),
    getTemplateStatus: adminProcedure
      .query(async () => {
        const { getTemplateStatus } = await import("./whatsapp");
        return getTemplateStatus();
      }),
    checkTemplateApproval: adminProcedure
      .input(z.object({ templateNames: z.array(z.string()) }))
      .query(async ({ input }) => {
        const { checkTemplateApproval } = await import("./whatsapp");
        return checkTemplateApproval(input.templateNames);
      }),
    refreshTemplateStatuses: adminProcedure
      .mutation(async () => {
        const { getTemplateStatus } = await import("./whatsapp");
        const result = await getTemplateStatus();
        if (!result.success || !result.templates) {
          throw new Error(result.error || "Failed to fetch from Meta");
        }
        // Update local DB with Meta statuses
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const localTemplates = await db.select().from(whatsappTemplates);
        const localByName = new Map(localTemplates.map((t) => [t.name, t]));
        let updated = 0;
        let imported = 0;

        // Helpers to pull display fields out of a Meta template's component tree.
        // Works for both single banner templates and carousel templates (whose
        // buttons live inside cards) so they can be listed + selected in the admin.
        const extractFields = (meta: any) => {
          const comps: any[] = Array.isArray(meta.components) ? meta.components : [];
          const isCarousel = comps.some((c) => (c.type || "").toUpperCase() === "CAROUSEL");
          const body = comps.find((c) => (c.type || "").toUpperCase() === "BODY");
          let title = body?.text || (isCarousel ? "Product carousel campaign" : meta.name);
          // First URL button (top-level for banners; inside first card for carousels)
          let urlBtn: any = null;
          const btnComp = comps.find((c) => (c.type || "").toUpperCase() === "BUTTONS");
          urlBtn = btnComp?.buttons?.find((b: any) => (b.type || "").toUpperCase() === "URL");
          if (!urlBtn && isCarousel) {
            const card0 = comps.find((c) => (c.type || "").toUpperCase() === "CAROUSEL")?.cards?.[0];
            const cardBtns = card0?.components?.find((c: any) => (c.type || "").toUpperCase() === "BUTTONS");
            urlBtn = cardBtns?.buttons?.find((b: any) => (b.type || "").toUpperCase() === "URL");
          }
          return {
            title: String(title).slice(0, 1000),
            buttonText: urlBtn?.text || "Shop now",
            buttonUrl: (urlBtn?.url || "https://www.nutriwow.in").replace(/\{\{\d+\}\}/g, ""),
          };
        };

        for (const meta of result.templates as any[]) {
          if (!meta?.name || !meta?.status) continue;
          const status = String(meta.status).toLowerCase();
          const local = localByName.get(meta.name);
          if (local) {
            if (status !== local.approvalStatus) {
              await db.update(whatsappTemplates)
                .set({ approvalStatus: status, approvalMessage: `Meta status: ${meta.status}` })
                .where(eq(whatsappTemplates.id, local.id));
              updated++;
            }
          } else {
            // New Meta template not yet in our DB — import it so it shows in the
            // admin Templates list and is selectable for campaigns.
            const f = extractFields(meta);
            await createWhatsappTemplate({
              name: meta.name,
              title: f.title,
              buttonText: f.buttonText,
              buttonUrl: f.buttonUrl,
              imageUrl: null,
              metaTemplateId: meta.id ? String(meta.id) : null,
              approvalStatus: status,
              approvalMessage: `Imported from Meta (${meta.status})`,
            });
            imported++;
          }
        }
        return { updated, imported, total: localTemplates.length + imported, metaTemplates: result.templates.length };
      }),
    // ─── Live Chat ──────────────────────────────────────────────────────────
    getConversations: adminProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) return [];
        const convos = await db.select().from(whatsappConversations).orderBy(desc(whatsappConversations.lastMessageAt)).limit(100);
        return convos;
      }),

    getConversationMessages: adminProcedure
      .input(z.object({ conversationId: z.number(), phone: z.string().optional(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        // Fetch by phone if provided (covers old messages with wrong conversationId)
        if (input.phone) {
          const msgs = await db.select().from(whatsappMessages)
            .where(eq(whatsappMessages.phone, input.phone))
            .orderBy(whatsappMessages.sentAt)
            .limit(input.limit || 100);
          return msgs;
        }
        const msgs = await db.select().from(whatsappMessages)
          .where(eq(whatsappMessages.conversationId, input.conversationId))
          .orderBy(whatsappMessages.sentAt)
          .limit(input.limit || 100);
        return msgs;
      }),

    sendReply: adminProcedure
      .input(z.object({
        conversationId: z.number(),
        phone: z.string(),
        message: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const result = await sendTextMessage(input.phone, input.message);
        // Save outgoing message to DB
        await db.insert(whatsappMessages).values({
          conversationId: input.conversationId,
          phone: input.phone,
          direction: "outgoing",
          messageType: "text",
          content: input.message,
          status: result.success ? "sent" : "failed",
          metaMessageId: result.messageId || null,
        });
        // Update conversation last message
        await db.update(whatsappConversations)
          .set({ lastMessage: input.message, lastMessageAt: new Date(), status: "active" })
          .where(eq(whatsappConversations.id, input.conversationId));
        return result;
      }),

    markConversationRead: adminProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.update(whatsappConversations)
          .set({ unreadCount: 0 })
          .where(eq(whatsappConversations.id, input.conversationId));
        return { success: true };
      }),

    runCartRecovery: adminProcedure
      .mutation(async () => {
        // Get all unrecovered carts older than 45 minutes
        const allCarts = await getAllAbandonedCarts();
        const cutoff = Date.now() - 45 * 60 * 1000; // 45 minutes ago
        const eligibleCarts = allCarts.filter((cart: any) => {
          if (cart.recovered) return false;
          if (!cart.phone) return false;
          const cartTime = new Date(cart.updatedAt).getTime();
          return cartTime < cutoff;
        });
        // Get already-messaged phones today to avoid duplicate messages
        const todayLogs = await getWhatsAppLogs(500);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const alreadyMessagedToday = new Set(
          todayLogs
            .filter((log: any) => log.messageType === "abandoned_cart" && new Date(log.sentAt) >= todayStart)
            .map((log: any) => log.phone)
        );
        let sent = 0, failed = 0, skipped = 0;
        for (const cart of eligibleCarts) {
          const phone = (cart.phone as string).replace(/\D/g, "");
          // Skip if already sent today
          if (alreadyMessagedToday.has(phone)) { skipped++; continue; }
          const items = Array.isArray(cart.items)
            ? (cart.items as any[]).map((i: any) => `${i.name || i.productName} x${i.qty || i.quantity}`).join(", ")
            : "your items";
          const result = await sendAbandonedCartRecovery({
            phone,
            customerName: cart.name || "Customer",
            cartItems: items,
            cartTotal: cart.total,
            cartId: cart.id,
          });
          if (result.success) sent++; else { failed++; }
          alreadyMessagedToday.add(phone); // prevent double-send in same run
          await new Promise(r => setTimeout(r, 300)); // rate limit
        }
        return { processed: eligibleCarts.length, sent, failed, skipped };
      }),
    // ─── Template Management ──────────────────────────────────────────────────────────
    getTemplates: adminProcedure
      .query(async () => getWhatsappTemplates()),
    createTemplate: adminProcedure
      .input(z.object({
        name: z.string(),
        title: z.string(),
        buttonText: z.string(),
        buttonUrl: z.string(),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // If imageUrl is a base64 string, upload it to S3 first
        let finalImageUrl: string | null = input.imageUrl || null;

        if (finalImageUrl && finalImageUrl.startsWith("data:")) {
          try {
            const matches = finalImageUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              const mimeType = matches[1];
              const base64Data = matches[2];
              const extension = mimeType.split("/")[1] || 'png';
              const buffer = Buffer.from(base64Data, "base64");
              const suffix = Date.now() + "-" + Math.random().toString(36).slice(2);
              const key = `whatsapp-templates/${suffix}.${extension}`;
              const { url } = await storagePut(key, buffer, mimeType);
              finalImageUrl = url;
            }
          } catch (error) {
            console.error("Failed to upload WhatsApp template image to S3:", error);
            finalImageUrl = null;
          }
        }

        return createWhatsappTemplate({
          name: input.name,
          title: input.title,
          buttonText: input.buttonText,
          buttonUrl: input.buttonUrl,
          imageUrl: finalImageUrl,
          metaTemplateId: null,
          approvalStatus: "pending",
          approvalMessage: null,
        });
      }),
    deleteTemplate: adminProcedure
      .input(z.number())
      .mutation(async ({ input: templateId }) => deleteWhatsappTemplate(templateId)),
    submitTemplateToMeta: adminProcedure
      .input(z.number())
      .mutation(async ({ input: templateId }) => {
        const template = await getWhatsappTemplate(templateId);
        if (!template) throw new Error("Template not found");
        
        // Import Meta API function
        const { submitTemplateToMeta: submitToMeta } = await import("./whatsapp");
        
        // Submit to Meta
        const result = await submitToMeta({
          name: template.name,
          title: template.title,
          buttonText: template.buttonText,
          buttonUrl: template.buttonUrl,
          imageUrl: template.imageUrl || undefined,
        });
        
        if (!result.success) {
          throw new Error(result.error || "Failed to submit template to Meta");
        }
        
        // Update template with Meta template ID and pending status
        return updateWhatsappTemplate(templateId, {
          approvalStatus: "pending",
          metaTemplateId: result.metaTemplateId,
          approvalMessage: "Submitted to Meta for review",
        });
      }),
    submitUtilityTemplate: adminProcedure
      .input(z.object({
        name: z.string(),
        bodyText: z.string(),
        category: z.string().optional(),
        footerText: z.string().optional(),
        buttons: z.array(z.object({
          type: z.string(),
          text: z.string(),
          url: z.string().optional(),
          phone_number: z.string().optional(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { submitUtilityTemplate: submit } = await import("./whatsapp");
        return submit(input);
      }),
    // ─── Contact Upload ──────────────────────────────────────────────────────────────
    uploadContacts: adminProcedure
      .input(z.object({
        campaignId: z.number(),
        contacts: z.array(z.object({
          name: z.string(),
          phone: z.string(),
        })),
      }))
      .mutation(async ({ input }) => uploadWhatsappContacts(input.campaignId, input.contacts)),
    getContacts: adminProcedure
      .input(z.number())
      .query(async ({ input: campaignId }) => getWhatsappContacts(campaignId)),
  }),
  // ─── Products ──────────────────────────────────────────────────────────────
  products: router({
    // Public: list all products with optional filters (only published)
    list: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        available: z.boolean().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => getAllProducts(input ?? {})),

    // Admin: list all products including drafts
    adminList: adminProcedure
      .input(z.object({
        category: z.string().optional(),
        available: z.boolean().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => getAllProducts({ ...(input ?? {}), adminMode: true })),

    // Public: get by numeric ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => getProductById(input.id)),

    // Public: get by URL handle (slug)
    getByHandle: publicProcedure
      .input(z.object({ handle: z.string() }))
      .query(async ({ input }) => getProductByHandle(input.handle)),

    // Public: bestsellers
    bestsellers: publicProcedure
      .input(z.object({ limit: z.number().default(20) }).optional())
      .query(async ({ input }) => getBestsellers(input?.limit)),

    // Public: trending
    trending: publicProcedure
      .input(z.object({ limit: z.number().default(20) }).optional())
      .query(async ({ input }) => getTrendingProducts(input?.limit)),

    // Public: by category
    byCategory: publicProcedure
      .input(z.object({ category: z.string(), limit: z.number().default(50) }))
      .query(async ({ input }) => getProductsByCategory(input.category, input.limit)),

    // Public: bulk get by IDs (for cart/checkout)
    bulkByIds: publicProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .query(async ({ input }) => getProductsByIds(input.ids)),

    // Public: product recommendations based on cart contents
    recommendations: publicProcedure
      .input(z.object({
        productIds: z.array(z.number()),
        limit: z.number().min(1).max(10).default(4),
      }))
      .query(async ({ input }) => getRecommendedProducts(input.productIds, input.limit)),

    // Public: get total product count
    count: publicProcedure
      .query(async () => getProductCount()),

    // Public: frequently bought together (co-purchase analysis)
    frequentlyBoughtTogether: publicProcedure
      .input(z.object({ productId: z.number(), limit: z.number().default(4) }))
      .query(async ({ input }) => getFrequentlyBoughtTogether(input.productId, input.limit)),

    // Admin: create product
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        handle: z.string().min(1),
        category: z.string().default("Nuts"),
        price: z.number().int().positive(),
        mrp: z.number().int().positive(),
        discount: z.number().int().min(0).max(100).default(0),
        weight: z.string().optional(),
        description: z.string().optional(),
        image: z.string().min(1),
        images: z.array(z.string()).optional(),
        isBestseller: z.boolean().default(false),
        isTrending: z.boolean().default(false),
        isNew: z.boolean().default(false),
        available: z.boolean().default(true),
        status: z.enum(["draft", "published"]).default("published"),
        rating: z.number().int().min(0).max(50).default(45),
        reviewCount: z.number().int().min(0).default(0),
        sortOrder: z.number().int().default(0),
        // Metafields
        dietaryPreferences: z.array(z.string()).optional(),
        allergenInfo: z.string().optional(),
        nutType: z.string().optional(),
        processingMethod: z.string().optional(),
        foodProductForm: z.string().optional(),
        metafields: z.record(z.string(), z.string()).optional(),
        // Product details
        ingredients: z.string().optional(),
        nutritionalInfo: z.string().optional(),
        shelfLife: z.string().optional(),
        storageInfo: z.string().optional(),
      }))
      .mutation(async ({ input }) => createProduct({
        ...input,
        images: input.images ?? [],
      })),

    // Admin: update product
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        handle: z.string().optional(),
        category: z.string().optional(),
        price: z.number().int().positive().optional(),
        mrp: z.number().int().positive().optional(),
        discount: z.number().int().min(0).max(100).optional(),
        weight: z.string().optional(),
        description: z.string().optional(),
        image: z.string().optional(),
        images: z.array(z.string()).optional(),
        isBestseller: z.boolean().optional(),
        isTrending: z.boolean().optional(),
        isNew: z.boolean().optional(),
        available: z.boolean().optional(),
        status: z.enum(["draft", "published"]).optional(),
        rating: z.number().int().min(0).max(50).optional(),
        reviewCount: z.number().int().min(0).optional(),
        sortOrder: z.number().int().optional(),
        // Metafields
        dietaryPreferences: z.array(z.string()).optional(),
        allergenInfo: z.string().optional(),
        nutType: z.string().optional(),
        processingMethod: z.string().optional(),
        foodProductForm: z.string().optional(),
        metafields: z.record(z.string(), z.string()).optional(),
        // Product details
        ingredients: z.string().optional(),
        nutritionalInfo: z.string().optional(),
        shelfLife: z.string().optional(),
        storageInfo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateProduct(id, data);
      }),

    // Admin: delete product
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => deleteProduct(input.id)),

    // Admin: upload product image to S3
    uploadImage: adminProcedure
      .input(z.object({
        base64: z.string(),
        filename: z.string().default("product-image.jpg"),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const suffix = Date.now() + "-" + Math.random().toString(36).slice(2);
        const key = `products/${suffix}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),

    // Admin: get client token for direct browser→Vercel Blob upload (bypasses 4.5MB serverless limit)
    getUploadToken: adminProcedure
      .input(z.object({
        filename: z.string(),
        contentType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ input }) => {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          throw new Error("Storage not configured: BLOB_READ_WRITE_TOKEN is not set.");
        }
        const { generateClientTokenFromReadWriteToken } = await import("@vercel/blob/client");
        const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        const safeName = input.filename.replace(/[^a-z0-9._-]/gi, "_").slice(0, 60);
        const pathname = `products/${suffix}-${safeName}`;
        const token = await generateClientTokenFromReadWriteToken({
          pathname,
          maximumSizeInBytes: 20 * 1024 * 1024,
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
          addRandomSuffix: false,
        });
        return { token, pathname };
      }),
    // Admin: get all images for a product
    getImages: adminProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => getProductImages(input.productId)),
    // Admin: upload and add an image to a product (max 8)
    addImage: adminProcedure
      .input(z.object({
        productId: z.number(),
        base64: z.string(),
        filename: z.string().default("product-image.jpg"),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const suffix = Date.now() + "-" + Math.random().toString(36).slice(2);
        const key = `products/${input.productId}/${suffix}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return addProductImage({ productId: input.productId, url, fileKey: key, isHero: false, sortOrder: 0 });
      }),
    // Admin: set a specific image as hero/primary
    setHeroImage: adminProcedure
      .input(z.object({ imageId: z.number(), productId: z.number() }))
      .mutation(async ({ input }) => setHeroProductImage(input.imageId, input.productId)),
    // Admin: delete a product image
    deleteImage: adminProcedure
      .input(z.object({ imageId: z.number(), productId: z.number() }))
      .mutation(async ({ input }) => deleteProductImage(input.imageId, input.productId)),
    // Admin: reorder product images
    reorderImages: adminProcedure
      .input(z.object({ productId: z.number(), orderedIds: z.array(z.number()) }))
      .mutation(async ({ input }) => reorderProductImages(input.productId, input.orderedIds)),

    fixProductImages: adminProcedure
      .mutation(async () => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const result = await db.execute(sql`
          SELECT p.id, pi.url FROM products p
          LEFT JOIN productImages pi ON p.id = pi.productId
          WHERE pi.id = (SELECT MIN(id) FROM productImages WHERE productId = p.id)
          AND (p.image IS NULL OR p.image = '' OR p.image LIKE '%screenshot%')
        `);
        
        const rows = result[0] as unknown as any[];
        let updated = 0;
        for (const row of rows || []) {
          if (row.url) {
            await db.update(products).set({ image: row.url }).where(eq(products.id, row.id));
            updated++;
          }
        }
        return { success: true, fixed: updated };
      }),
  }),

  // ─── Analytics (Page Views) ───────────────────────────────────────────────
  analytics: router({
    // Public: log a page view (called from frontend on route change)
    logView: publicProcedure
      .input(z.object({
        path: z.string(),
        referrer: z.string().optional(),
        device: z.string().optional(),
        browser: z.string().optional(),
        os: z.string().optional(),
        sessionId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Vercel injects geo headers on the edge/serverless request
        const headers = ctx.req.headers;
        const hdr = (k: string) => {
          const v = headers[k];
          return Array.isArray(v) ? v[0] : v;
        };
        const country = hdr("x-vercel-ip-country") || null;
        const cityRaw = hdr("x-vercel-ip-city");
        const city = cityRaw ? decodeURIComponent(cityRaw) : null;
        await logPageView({
          path: input.path,
          referrer: input.referrer || null,
          device: input.device || null,
          browser: input.browser || null,
          os: input.os || null,
          sessionId: input.sessionId || null,
          country,
          city,
          customerId: null,
        });
        return { success: true };
      }),

    // Admin: get page view stats for a date range
    getStats: adminProcedure
      .input(z.object({ days: z.number().default(7) }))
      .query(async ({ input }) => {
        const since = new Date();
        since.setDate(since.getDate() - input.days);
        return getPageViewStats(since);
      }),

    // Admin: get daily page views for chart
    getDailyViews: adminProcedure
      .input(z.object({ days: z.number().default(7) }))
      .query(async ({ input }) => {
        const since = new Date();
        since.setDate(since.getDate() - input.days);
        return getDailyPageViews(since);
      }),

    // Public: log a cart funnel event (fire-and-forget from frontend)
    logCartEvent: publicProcedure
      .input(z.object({
        sessionId: z.string().min(1),
        event: z.enum(['add_to_cart', 'view_cart', 'start_checkout', 'enter_address', 'select_payment', 'order_placed']),
        customerId: z.number().optional(),
        productId: z.number().optional(),
        cartValue: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await logCartEvent({
          sessionId: input.sessionId,
          customerId: input.customerId,
          event: input.event,
          productId: input.productId,
          cartValue: input.cartValue,
        });
        return { success: true };
      }),

    // Admin: get cart funnel stats for date range
    cartFunnel: adminProcedure
      .input(z.object({ days: z.number().default(7) }))
      .query(async ({ input }) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - input.days);
        return getCartFunnelStats(start, end);
      }),

    // Admin: get recently abandoned cart sessions
    abandonedCarts: adminProcedure
      .input(z.object({ limit: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        return getAbandonedCartSessions(input?.limit ?? 50);
      }),

    // CEO Revenue Dashboard — aggregated metrics for the business owner
    ceoDashboard: adminProcedure
      .query(async () => getCEODashboard()),

    // Admin: full segmented customer list
    customerSegments: adminProcedure
      .query(async () => {
        return getCustomerSegments();
      }),

    // Admin: segment counts and revenue summary
    segmentSummary: adminProcedure
      .query(async () => {
        return getSegmentSummary();
      }),
  }),

  // Facebook Conversions API - server-side event tracking
  capi: router({
    trackEvent: publicProcedure
      .input(z.object({
        eventName: z.enum(["AddToCart", "ViewContent", "InitiateCheckout", "Search", "Lead"]),
        eventId: z.string(),
        value: z.number().optional(),
        contentIds: z.array(z.string()).optional(),
        contentName: z.string().optional(),
        contentCategory: z.string().optional(),
        numItems: z.number().optional(),
        searchQuery: z.string().optional(),
        leadType: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        sourceUrl: z.string().optional(),
        fbp: z.string().optional(),
        fbc: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const userData = {
          phone: input.phone,
          email: input.email,
          clientIpAddress: (ctx as any).req?.ip || (ctx as any).req?.headers?.["x-forwarded-for"] || undefined,
          clientUserAgent: (ctx as any).req?.headers?.["user-agent"] || undefined,
          fbp: input.fbp,
          fbc: input.fbc,
          country: "in",
        };
        const customData = {
          value: input.value,
          currency: "INR" as const,
          contentIds: input.contentIds,
          contentType: "product" as const,
          contentName: input.contentName,
          contentCategory: input.contentCategory,
          numItems: input.numItems,
        };
        if (input.eventName === "AddToCart") {
          return trackAddToCart({
            eventId: input.eventId,
            productId: input.contentIds?.[0] || "",
            productName: input.contentName || "",
            productCategory: input.contentCategory,
            value: input.value || 0,
            userData,
            sourceUrl: input.sourceUrl,
          });
        } else if (input.eventName === "ViewContent") {
          return trackViewContent({
            eventId: input.eventId,
            productId: input.contentIds?.[0] || "",
            productName: input.contentName || "",
            productCategory: input.contentCategory,
            value: input.value || 0,
            userData,
            sourceUrl: input.sourceUrl,
          });
        } else if (input.eventName === "Search") {
          return sendCAPIEvent(
            "Search",
            input.eventId,
            userData,
            {
              value: input.value,
              currency: "INR",
              contentName: input.searchQuery || input.contentName,
            },
            input.sourceUrl,
          );
        } else if (input.eventName === "Lead") {
          return sendCAPIEvent(
            "Lead",
            input.eventId,
            userData,
            {
              value: input.value,
              currency: "INR",
              contentName: input.leadType || "general",
            },
            input.sourceUrl,
          );
        } else {
          return trackInitiateCheckout({
            eventId: input.eventId,
            cartTotal: input.value || 0,
            productIds: input.contentIds || [],
            numItems: input.numItems || 0,
            userData,
            sourceUrl: input.sourceUrl,
          });
        }
      }),
  }),
  // Feed management - generate and upload to S3 for Meta Commerce Manager
  homepage: router({
    // Public: get ALL homepage data in one call (avoids rate limiting from multiple parallel requests)
    getAll: publicProcedure
      .query(async () => getHomepageAllData()),

    // Public: hero carousel slides (stored in storeSettings key "heroCarousel")
    getCarousel: publicProcedure
      .query(async () => {
        let v = await getStoreSetting("heroCarousel");
        if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = null; } }
        return Array.isArray(v) ? v : [];
      }),

    // Admin: save hero carousel slides
    setCarousel: adminProcedure
      .input(z.object({
        slides: z.array(z.object({
          id: z.string(),
          desktopImage: z.string(),
          mobileImage: z.string().optional().default(""),
          // App banner (2:1, 1200×600) — used by the Flutter mobile app
          appImage: z.string().optional().default(""),
          link: z.string().optional().default(""),
          alt: z.string().optional().default(""),
        })),
      }))
      .mutation(async ({ input }) => setStoreSetting("heroCarousel", input.slides)),

    // Admin: upload a hero banner image to S3 (base64) -> returns CDN url
    uploadBanner: adminProcedure
      .input(z.object({
        base64: z.string(),
        filename: z.string().default("banner.jpg"),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const suffix = Date.now() + "-" + Math.random().toString(36).slice(2);
        const key = `hero-carousel/${suffix}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),

    // Public: get products for a section (legacy - kept for admin page)
    getSection: publicProcedure
      .input(z.object({ sectionType: z.string() }))
      .query(async ({ input }) => getHomepageSectionProducts(input.sectionType)),

    // Admin: get all sections config
    getAllSections: adminProcedure
      .query(async () => getAllHomepageSections()),

    // Admin: add product to section
    addProduct: adminProcedure
      .input(z.object({ sectionType: z.string(), productId: z.number() }))
      .mutation(async ({ input }) => addProductToHomepageSection(input.sectionType, input.productId)),

    // Admin: remove product from section
    removeProduct: adminProcedure
      .input(z.object({ sectionType: z.string(), productId: z.number() }))
      .mutation(async ({ input }) => removeProductFromHomepageSection(input.sectionType, input.productId)),

    // Admin: reorder products in section
    reorder: adminProcedure
      .input(z.object({ sectionType: z.string(), productIds: z.array(z.number()) }))
      .mutation(async ({ input }) => reorderHomepageSection(input.sectionType, input.productIds)),

    // Admin: clear all products from a section
    clearSection: adminProcedure
      .input(z.object({ sectionType: z.string() }))
      .mutation(async ({ input }) => clearHomepageSection(input.sectionType)),
  }),

  feed: router({
    refresh: adminProcedure.mutation(async () => {
      const BASE = "https://www.nutriwow.in";
      const products = await getAllProducts();
      if (!products || products.length === 0) {
        throw new Error("No products found");
      }

      const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&amp;amp;/g, '&amp;');
      const escCsv = (s: string) => '"' + String(s).replace(/"/g, '""').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') + '"';

      // Generate Facebook CSV
      const header = 'id,title,description,availability,condition,price,link,image_link,brand,product_type';
      const rows = products.map(p => [
        escCsv(String(p.id)),
        escCsv(p.name),
        escCsv((p.description || p.name).substring(0, 5000)),
        escCsv(p.available !== false ? 'in stock' : 'out of stock'),
        escCsv('new'),
        escCsv(p.price + ' INR'),
        escCsv(BASE + '/products/' + p.handle),
        escCsv(p.image),
        escCsv('Nutriwow'),
        escCsv(p.category),
      ].join(','));
      const csvContent = [header, ...rows].join('\n');

      // Generate Facebook XML
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<feed>\n${products.map(p => `  <entry>\n    <id>${p.id}</id>\n    <title>${esc(p.name)}</title>\n    <description>${esc((p.description || p.name).substring(0, 5000))}</description>\n    <availability>${p.available !== false ? 'in stock' : 'out of stock'}</availability>\n    <condition>new</condition>\n    <price>${p.price}.00 INR</price>\n    <link>${BASE}/products/${p.handle}</link>\n    <image_link>${p.image}</image_link>\n    <brand>Nutriwow</brand>\n    <product_type>${esc(p.category)}</product_type>\n  </entry>`).join('\n')}\n</feed>`;

      // Generate Google Shopping XML
      const googleXml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>Nutriwow India - Premium Dry Fruits &amp; Nuts</title>\n    <link>${BASE}</link>\n    <description>Premium quality dry fruits, nuts, seeds and healthy snacks</description>\n${products.map(p => `    <item>\n      <g:id>${p.id}</g:id>\n      <g:title>${esc(p.name)}</g:title>\n      <g:description>${esc((p.description || p.name).substring(0, 5000))}</g:description>\n      <g:link>${BASE}/products/${p.handle}</g:link>\n      <g:image_link>${p.image}</g:image_link>\n      <g:price>${p.price}.00 INR</g:price>\n      <g:availability>${p.available !== false ? 'in stock' : 'out of stock'}</g:availability>\n      <g:brand>Nutriwow</g:brand>\n      <g:condition>new</g:condition>\n      <g:product_type>${esc(p.category)}</g:product_type>\n      <g:identifier_exists>no</g:identifier_exists>\n      <g:shipping>\n        <g:country>IN</g:country>\n        <g:price>0 INR</g:price>\n      </g:shipping>\n    </item>`).join('\n')}\n  </channel>\n</rss>`;

      // Upload all to S3
      const timestamp = Date.now();
      const [csvResult, xmlResult, googleResult] = await Promise.all([
        storagePut(`feeds/facebook-catalog.csv`, csvContent, 'text/csv'),
        storagePut(`feeds/facebook-catalog.xml`, xmlContent, 'application/xml'),
        storagePut(`feeds/google-shopping.xml`, googleXml, 'application/xml'),
      ]);

      return {
        success: true,
        productCount: products.length,
        urls: {
          facebookCsv: csvResult.url,
          facebookXml: xmlResult.url,
          googleShopping: googleResult.url,
        },
        updatedAt: new Date().toISOString(),
      };
    }),
  }),
  // ─── Product Categories (admin-managed) ─────────────────────────────────────
  categories: router({
    list: publicProcedure.query(async () => {
      const DEFAULTS = ["Nuts", "Seeds", "Berries", "Snacks", "Healthy Mix", "Exotic Dried Fruits", "Combos", "Dates", "Makhana"];
      let v = await getStoreSetting("productCategories");
      if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = null; } }
      if (!Array.isArray(v) || v.length === 0) return DEFAULTS;
      return (v as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    }),

    // Category → subcategories tree for the navigation mega-menu.
    getTree: publicProcedure.query(async () => {
      const DEFAULT_TREE = [
        { category: "Nuts", subcategories: ["Almonds", "Cashews", "Pistachios", "Walnuts"] },
        { category: "Seeds", subcategories: ["Chia", "Flax", "Pumpkin", "Sunflower", "Watermelon"] },
        { category: "Berries", subcategories: ["Raisins", "Cranberries"] },
        { category: "Dates", subcategories: ["Omani", "Khajur"] },
        { category: "Combos", subcategories: [] },
        { category: "Snacks", subcategories: ["Soya Chaap"] },
        { category: "Makhana", subcategories: [] },
        { category: "Healthy Mix", subcategories: [] },
        { category: "Exotic Dried Fruits", subcategories: [] },
      ];
      let v = await getStoreSetting("categoryTree");
      if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = null; } }
      if (!Array.isArray(v) || v.length === 0) return DEFAULT_TREE;
      return (v as Array<{ category?: string; subcategories?: string[] }>)
        .filter((x) => x && typeof x.category === "string" && x.category.trim())
        .map((x) => ({
          category: x.category!.trim(),
          subcategories: Array.isArray(x.subcategories) ? x.subcategories.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()) : [],
        }));
    }),
    setTree: adminProcedure
      .input(z.object({
        tree: z.array(z.object({ category: z.string(), subcategories: z.array(z.string()) })),
      }))
      .mutation(async ({ input }) => {
        const clean = input.tree
          .map((t) => ({ category: t.category.trim(), subcategories: Array.from(new Set(t.subcategories.map((s) => s.trim()).filter(Boolean))) }))
          .filter((t) => t.category);
        await setStoreSetting("categoryTree", clean);
        return { ok: true, tree: clean };
      }),
    set: adminProcedure
      .input(z.object({ categories: z.array(z.string()) }))
      .mutation(async ({ input }) => {
        const clean = Array.from(new Set(input.categories.map((c) => c.trim()).filter(Boolean)));
        await setStoreSetting("productCategories", clean);
        return { ok: true, categories: clean };
      }),
    // Rename a category everywhere: the managed list + every product in it.
    rename: adminProcedure
      .input(z.object({ oldName: z.string(), newName: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const oldName = input.oldName.trim();
        const newName = input.newName.trim();
        if (!newName) throw new Error("New name is required.");
        const DEFAULTS = ["Nuts", "Seeds", "Berries", "Snacks", "Healthy Mix", "Exotic Dried Fruits", "Combos", "Dates", "Makhana"];
        let v = await getStoreSetting("productCategories");
        if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = null; } }
        let list: string[] = Array.isArray(v) && v.length
          ? (v as unknown[]).filter((x): x is string => typeof x === "string")
          : DEFAULTS;
        list = Array.from(new Set(list.map((c) => (c === oldName ? newName : c))));
        await setStoreSetting("productCategories", list);
        await renameProductCategory(oldName, newName);
        return { ok: true, categories: list };
      }),
  }),

  // ─── Email Campaigns ────────────────────────────────────────────────────────
  emailCampaigns: router({
    // AI availability + audience sizes (for the admin UI)
    info: adminProcedure.query(async () => {
      const storedKey = await getStoredAnthropicKey();
      const rc = await getResendConfig();
      const [all, buyers, subscribers] = await Promise.all([
        getMarketableEmails("all"),
        getMarketableEmails("buyers"),
        getMarketableEmails("subscribers"),
      ]);
      return {
        aiConfigured: !!storedKey || isAiConfigured(),
        keySource: storedKey ? "admin" : (isAiConfigured() ? "env" : "none"),
        audiences: { all: all.length, buyers: buyers.length, subscribers: subscribers.length },
        emailProvider: rc.apiKey ? "resend" : "smtp",
        resendConfigured: !!rc.apiKey,
        resendFrom: rc.from || "",
      };
    }),

    subscribers: adminProcedure.query(async () => getEmailSubscribersList()),

    setApiKey: adminProcedure
      .input(z.object({ key: z.string() }))
      .mutation(async ({ input }) => {
        await setStoreSetting("anthropicApiKey", input.key.trim());
        return { ok: true, configured: !!input.key.trim() };
      }),

    // Save the Resend API key + sender (from). Stored in storeSettings; the key
    // is never returned to the browser.
    setResendKey: adminProcedure
      .input(z.object({ key: z.string(), from: z.string().optional() }))
      .mutation(async ({ input }) => {
        await setStoreSetting("resendApiKey", input.key.trim());
        if (input.from !== undefined) await setStoreSetting("resendFrom", input.from.trim());
        return { ok: true, configured: !!input.key.trim() };
      }),

    list: adminProcedure.query(async () => {
      let v = await getStoreSetting("emailCampaigns");
      if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = null; } }
      return Array.isArray(v) ? v : [];
    }),

    // AI-generate subject + preview + HTML from a brief (optionally featuring
    // specific products so the AI embeds their real images/prices).
    generate: adminProcedure
      .input(z.object({
        brief: z.string().min(3),
        products: z.array(z.object({
          name: z.string(),
          price: z.number().optional(),
          url: z.string().optional(),
          image: z.string().optional(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const storedKey = await getStoredAnthropicKey();
        let general = await getStoreSetting("general");
        if (typeof general === "string") { try { general = JSON.parse(general); } catch { general = null; } }
        const g = (general || {}) as { storeName?: string };
        return generateEmailCampaign({
          brief: input.brief,
          storeName: g.storeName || "Nutriwow",
          storeUrl: "https://nutriwow.in",
          products: input.products,
        }, storedKey || undefined);
      }),

    // Create or update a draft campaign
    save: adminProcedure
      .input(z.object({
        id: z.string().optional(),
        name: z.string(),
        subject: z.string(),
        previewText: z.string().optional().default(""),
        html: z.string(),
        audience: z.enum(["all", "buyers", "subscribers"]).default("all"),
      }))
      .mutation(async ({ input }) => {
        let v = await getStoreSetting("emailCampaigns");
        if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = null; } }
        const list: any[] = Array.isArray(v) ? v : [];
        const now = new Date().toISOString();
        if (input.id) {
          const idx = list.findIndex((c) => c.id === input.id);
          if (idx >= 0) list[idx] = { ...list[idx], ...input, updatedAt: now };
        } else {
          const id = "camp_" + Date.now().toString(36);
          list.unshift({
            id, name: input.name, subject: input.subject, previewText: input.previewText,
            html: input.html, audience: input.audience, status: "draft",
            recipientCount: 0, sentCount: 0, createdAt: now, sentAt: null,
          });
        }
        await setStoreSetting("emailCampaigns", list);
        return { ok: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        let v = await getStoreSetting("emailCampaigns");
        if (typeof v === "string") { try { v = JSON.parse(v); } catch { v = null; } }
        const list: any[] = Array.isArray(v) ? v : [];
        await setStoreSetting("emailCampaigns", list.filter((c) => c.id !== input.id));
        return { ok: true };
      }),

    // Send a single test email to verify rendering before a real send.
    // Surfaces the SMTP server's verdict so we can diagnose silent non-delivery.
    testSend: adminProcedure
      .input(z.object({ to: z.string().email(), subject: z.string(), html: z.string() }))
      .mutation(async ({ input }) => {
        const rc = await getResendConfig();
        const r = await sendCampaignEmail(input.to, `[TEST] ${input.subject}`, input.html, {
          resendApiKey: rc.apiKey || undefined,
          resendFrom: rc.from || undefined,
        });
        if (!r.ok) {
          throw new Error(
            r.error
              ? `Test send failed: ${r.error}`
              : `Provider rejected the email (rejected: ${JSON.stringify(r.rejected)}). Check that the sender ${r.from} is a verified sender/domain in your email provider.`
          );
        }
        return { ok: true, response: r.response, messageId: r.messageId, from: r.from, accepted: r.accepted, provider: rc.apiKey ? "resend" : "smtp" };
      }),

    // Queue the campaign for background cron processing (batched sends).
    send: adminProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        return queueEmailCampaign(input.id);
      }),

    // Process next batch of a queued/sending campaign (called by admin UI polling).
    processBatch: adminProcedure
      .mutation(async () => {
        return processEmailCampaignBatch();
      }),

    // Campaign delivery stats
    getStats: adminProcedure
      .input(z.object({ campaignId: z.string() }))
      .query(async ({ input }) => getCampaignEmailStats(input.campaignId)),

    // Detailed per-recipient logs
    getLogs: adminProcedure
      .input(z.object({ campaignId: z.string() }))
      .query(async ({ input }) => getCampaignEmailLogs(input.campaignId)),

    getTransactionalLogs: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(500).default(200) }))
      .query(async ({ input }) => getTransactionalEmailLogs(input.limit)),
  }),

  wishlist: router({
    list: customerProcedure
      .query(async ({ ctx }) => {
        return getWishlistByCustomer(ctx.customer.customerId);
      }),

    toggle: customerProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const exists = await isInWishlist(ctx.customer.customerId, input.productId);
        if (exists) {
          await removeFromWishlist(ctx.customer.customerId, input.productId);
          return { added: false };
        } else {
          await addToWishlist(ctx.customer.customerId, input.productId);
          return { added: true };
        }
      }),

    remove: customerProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await removeFromWishlist(ctx.customer.customerId, input.productId);
        return { success: true };
      }),

    merge: customerProcedure
      .input(z.object({ productIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        await bulkAddToWishlist(ctx.customer.customerId, input.productIds);
        return { success: true };
      }),
  }),

  // ─── Referral Program ──────────────────────────────────────────────────────
  referral: router({
    getMyCode: customerProcedure.query(async ({ ctx }) => {
      const code = await getReferralCode(ctx.customer.customerId);
      return {
        code,
        shareLink: `https://www.nutriwow.in?ref=${code}`,
      };
    }),

    getStats: customerProcedure.query(async ({ ctx }) => {
      return getReferralStats(ctx.customer.customerId);
    }),

    validate: publicProcedure
      .input(z.object({ code: z.string().min(1).max(20) }))
      .query(async ({ input }) => {
        return validateReferralCode(input.code);
      }),

    redeem: customerProcedure
      .input(z.object({ code: z.string().min(1).max(20) }))
      .mutation(async ({ input, ctx }) => {
        const success = await applyReferral(input.code, ctx.customer.customerId);
        return { success };
      }),
  }),
});
export type AppRouter = typeof appRouter;
