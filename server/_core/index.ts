import "dotenv/config";
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://c8eb0481a7fa23003e69f498d2078667@o4511551507529728.ingest.us.sentry.io/4511551511068672",
  // Tag by deploy environment so preview/dev errors don't pollute production
  // (NW-CFG-02). Vercel sets VERCEL_ENV to production/preview/development.
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  tracesSampleRate: 0.1,
});

import express from "express";
import { createServer } from "http";
import net from "net";
import crypto from "crypto";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter, finalizePendingOrder, generateOrderInvoice, fetchRazorpayPaymentStatus } from "../routers";
import { createContext } from "./context";
import { fileURLToPath } from "url";
import path from "path";
import { serveStatic } from "./serveStatic";
// Re-export so the bundled server entry exposes serveStatic to the Vercel
// function (api/index.ts) without a second cross-directory import.
export { serveStatic } from "./serveStatic";
import { StandardCheckoutClient, Env } from "@phonepe-pg/pg-sdk-node";
import { getDb, getAllProducts, getOrderById, getOrderByPaymentId, recordRefund, getStoreSetting, getOrdersByPhone, updateOrderStatus } from "../db";
import { orders, whatsappConversations, whatsappMessages } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { sendChatbotMenu, handleChatbotReply, sendDocumentMessage, sendTextMessage } from "../whatsapp";
import { extractCourierEvents, reconcileCourierStatus, ithinkGetPickupAddresses } from "../shipping";
import { processCronJobs } from "../jobs";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// Builds the fully-configured Express app (all routes, middleware, tRPC) WITHOUT
// serving the client or binding a port. Local dev/prod call this then add client
// serving + listen; the Vercel serverless entry calls this and exports the app.
export async function buildApp() {
  const app = express();

  // Razorpay webhook needs raw body for signature verification — register BEFORE json middleware
  app.post("/api/razorpay/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error("[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET not configured");
        return res.status(500).json({ success: false });
      }
      const signature = req.headers["x-razorpay-signature"] as string | undefined;
      // Normalise the raw body to a string for HMAC. On some runtimes req.body
      // arrives as a Buffer (express.raw), on others as a string, and if an
      // upstream parser already ran, as an object. Recover the raw text in each
      // case so the signature check has the best chance of matching.
      const rawBody = req.body;
      const bodyStr = Buffer.isBuffer(rawBody)
        ? rawBody.toString("utf8")
        : (typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody ?? {}));

      let sigValid = false;
      if (signature) {
        try {
          const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(bodyStr).digest("hex");
          const sigBuf = Buffer.from(signature);
          const expBuf = Buffer.from(expectedSignature);
          sigValid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
        } catch { sigValid = false; }
      }

      const event = (rawBody && typeof rawBody === "object" && !Buffer.isBuffer(rawBody))
        ? rawBody
        : JSON.parse(bodyStr);
      const rzOrderId = event?.payload?.payment?.entity?.notes?.orderId;
      const rzPaymentId = event?.payload?.payment?.entity?.id;
      console.log(`[Razorpay Webhook] Event: ${event?.event} | Order: ${rzOrderId} | sigValid: ${sigValid}`);

      // If the signature can't be verified (wrong secret / mangled raw body on
      // this host), fall back to confirming the payment straight from Razorpay's
      // API with our own secret key. This is still secure — an attacker can't
      // make Razorpay report a fake payment as captured — and it stops a single
      // signature/secret mismatch from silently dropping every paid order.
      if (!sigValid) {
        if (!rzPaymentId) {
          console.error("[Razorpay Webhook] Signature invalid and no payment id to verify — rejecting");
          return res.status(400).json({ success: false, error: "Invalid signature" });
        }
        const live = await fetchRazorpayPaymentStatus(rzPaymentId);
        const ok = !!live && (live.status === "captured" || live.status === "authorized");
        if (!ok) {
          console.error(`[Razorpay Webhook] Signature invalid AND API says not paid (status: ${live?.status}) — rejecting`);
          return res.status(400).json({ success: false, error: "Unverified event" });
        }
        console.warn(`[Razorpay Webhook] Signature invalid but Razorpay API confirms payment ${rzPaymentId} is ${live?.status} — proceeding via API fallback`);
      }

      if (event.event === "payment.captured" && rzOrderId) {
        console.log(`[Razorpay Webhook] Payment captured for order: ${rzOrderId}`);
        try {
          const existing = await getOrderById(rzOrderId);
          if (existing && existing.status === "pending_payment") {
            // Full finalize (idempotent): redeems coupon, sends confirmations,
            // notifies admin, and fires purchase conversion — matching the client
            // callback path so a webhook-only confirmation isn't a silent no-notify.
            // Capture the Razorpay payment id for refunds (NW-PAY-02).
            await finalizePendingOrder(existing, event?.payload?.payment?.entity?.id);
            console.log(`[Razorpay Webhook] Order ${rzOrderId} confirmed: pending_payment → placed`);
          } else if (existing) {
            console.log(`[Razorpay Webhook] Order ${rzOrderId} already confirmed (status: ${existing.status})`);
          } else {
            console.warn(`[Razorpay Webhook] Order ${rzOrderId} NOT in DB`);
          }
        } catch (dbErr: any) {
          console.error("[Razorpay Webhook] DB error:", dbErr?.message);
        }
      } else if (event.event === "payment.failed") {
        console.warn(`[Razorpay Webhook] Payment failed for order: ${rzOrderId}`);
      } else if (event.event === "refund.processed" || event.event === "refund.created") {
        // Reconcile refunds (incl. dashboard-initiated) — NW-PAY-02. Best-effort:
        // uses max() with any already-recorded amount so it never double-counts an
        // admin-initiated refund or lowers the recorded total.
        const refund = event?.payload?.refund?.entity;
        const paymentId = refund?.payment_id;
        const refundPaise = Number(refund?.amount) || 0;
        if (paymentId && refundPaise > 0) {
          try {
            const order = await getOrderByPaymentId(paymentId);
            if (order) {
              const newRefunded = Math.max(order.refundedAmount || 0, Math.round(refundPaise / 100));
              const status = newRefunded >= (order.amountPaid || 0) ? "full" : "partial";
              await recordRefund(order.id, newRefunded, status);
              console.log(`[Razorpay Webhook] Refund reconciled for order ${order.id}: ₹${newRefunded} (${status})`);
            }
          } catch (e: any) { console.error("[Razorpay Webhook] refund reconcile error:", e?.message); }
        }
      }
      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("[Razorpay Webhook] Error:", err?.message);
      return res.status(400).json({ success: false, error: err?.message });
    }
  });

  // WhatsApp Meta Cloud API webhook — GET: verify challenge, POST: receive messages
  app.get("/api/whatsapp/webhook", (req, res) => {
    // NW-SEC-06: require an explicit verify token. In production we do NOT fall
    // back to a guessable literal — if WHATSAPP_VERIFY_TOKEN is unset, the
    // subscription handshake is refused. (Only affects re-subscription; live
    // inbound delivery on an already-subscribed webhook is unaffected.)
    const isProd = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || (isProd ? "" : "nutriwow_wa_verify");
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (!VERIFY_TOKEN) {
      console.error("[WhatsApp Webhook] WHATSAPP_VERIFY_TOKEN not set — refusing verification handshake.");
      return res.status(403).send("Forbidden");
    }
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[WhatsApp Webhook] Verified");
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  });

  // Raw body required to verify Meta's X-Hub-Signature-256 — register BEFORE json middleware.
  app.post("/api/whatsapp/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const rawBody = req.body as Buffer;
      // Verify the payload signature (HMAC-SHA256 of the raw body with the Meta app
      // secret). Without this, anyone could POST forged webhooks — fake inbound
      // messages, chatbot triggers, log poisoning. If WHATSAPP_APP_SECRET is not yet
      // configured we log and skip (so inbound WhatsApp keeps working on deploy);
      // verification activates the moment the secret is set.
      const appSecret = process.env.WHATSAPP_APP_SECRET;
      if (appSecret) {
        const signature = (req.headers["x-hub-signature-256"] as string) || "";
        const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
          console.error("[WhatsApp Webhook] Invalid signature — rejecting");
          return res.status(403).json({ error: "Invalid signature" });
        }
      } else if (process.env.NODE_ENV === "production") {
        // SECURITY: never accept unverifiable webhooks in production — fail closed.
        console.error("[WhatsApp Webhook] WHATSAPP_APP_SECRET not set in production — rejecting");
        return res.status(503).json({ error: "Webhook verification not configured" });
      } else {
        console.warn("[WhatsApp Webhook] WHATSAPP_APP_SECRET not set — skipping signature verification (dev only)");
      }
      const body = JSON.parse(rawBody.toString("utf8"));
      if (body?.object !== "whatsapp_business_account") return res.status(404).send("Not Found");
      const db = await getDb();
      if (!db) return res.sendStatus(200);
      for (const entry of body?.entry || []) {
        for (const change of entry?.changes || []) {
          const value = change?.value;
          // Incoming messages
          for (const msg of value?.messages || []) {
            // Normalize phone: always use 91XXXXXXXXXX format (Meta sends without country code sometimes)
            const rawPhone = msg.from?.replace(/\D/g, "") || "";
            const phone = rawPhone.startsWith("91") ? rawPhone : `91${rawPhone}`;
            // Extract text and media based on message type
            let text: string;
            let mediaUrl: string | null = null;
            const { downloadWhatsAppMedia } = await import("../whatsapp");
            if (msg.type === "text") {
              text = msg?.text?.body || "";
            } else if (msg.type === "interactive") {
              const btnReply = msg?.interactive?.button_reply;
              const listReply = msg?.interactive?.list_reply;
              if (btnReply) {
                text = btnReply.title || btnReply.id || "[button reply]";
              } else if (listReply) {
                text = listReply.title || listReply.id || "[list reply]";
              } else {
                text = "[interactive]";
              }
            } else if (msg.type === "button") {
              text = msg?.button?.text || msg?.button?.payload || "[button]";
            } else if (msg.type === "image") {
              text = msg?.image?.caption || "📷 Image";
              const imgId = msg?.image?.id;
              if (imgId) mediaUrl = await downloadWhatsAppMedia(imgId, msg?.image?.mime_type).catch(() => null);
            } else if (msg.type === "video") {
              text = msg?.video?.caption || "🎥 Video";
              const vidId = msg?.video?.id;
              if (vidId) mediaUrl = await downloadWhatsAppMedia(vidId, msg?.video?.mime_type).catch(() => null);
            } else if (msg.type === "audio") {
              text = "🎵 Audio";
              const audId = msg?.audio?.id;
              if (audId) mediaUrl = await downloadWhatsAppMedia(audId, msg?.audio?.mime_type).catch(() => null);
            } else if (msg.type === "document") {
              text = `📄 ${msg?.document?.filename || "Document"}`;
              const docId = msg?.document?.id;
              if (docId) mediaUrl = await downloadWhatsAppMedia(docId, msg?.document?.mime_type).catch(() => null);
            } else if (msg.type === "sticker") {
              text = "🎭 Sticker";
              const stId = msg?.sticker?.id;
              if (stId) mediaUrl = await downloadWhatsAppMedia(stId, msg?.sticker?.mime_type).catch(() => null);
            } else if (msg.type === "location") {
              text = `📍 Location: ${msg?.location?.name || `${msg?.location?.latitude}, ${msg?.location?.longitude}`}`;
            } else if (msg.type === "contacts") {
              text = "👤 Contact shared";
            } else if (msg.type === "reaction") {
              text = `${msg?.reaction?.emoji || "👍"} Reaction`;
            } else if (msg.type === "unsupported") {
              text = "⚠️ Unsupported message type";
            } else {
              text = `[${msg.type}]`;
            }
            const metaMessageId = msg.id;
            const contactName = value?.contacts?.find((c: any) => c.wa_id === phone)?.profile?.name || null;
            const existing = await db.select().from(whatsappConversations)
              .where(eq(whatsappConversations.phone, phone)).limit(1);
            let conversationId: number;
            if (existing.length > 0) {
              conversationId = existing[0].id;
              await db.update(whatsappConversations).set({
                lastMessage: text,
                lastMessageAt: new Date(),
                unreadCount: existing[0].unreadCount + 1,
                customerName: contactName || existing[0].customerName,
              }).where(eq(whatsappConversations.id, conversationId));
            } else {
              await db.insert(whatsappConversations).values({
                phone, customerName: contactName, lastMessage: text,
                lastMessageAt: new Date(), unreadCount: 1, status: "open",
              });
              // Re-fetch to get correct ID (TiDB insertId can be unreliable)
              const inserted = await db.select().from(whatsappConversations)
                .where(eq(whatsappConversations.phone, phone)).limit(1);
              conversationId = inserted[0].id;
            }
            await db.insert(whatsappMessages).values({
              conversationId, phone, direction: "inbound",
              messageType: msg.type || "text", content: text,
              mediaUrl,
              metaMessageId, status: "delivered",
            });
            console.log(`[WhatsApp] Inbound from ${phone}: ${text.slice(0, 60)}`);

            // ─── Chatbot Auto-Reply ───────────────────────────────────────
            // Check if this is a button reply from the chatbot menu
            // Handles both: interactive quick reply (id=bot_*) AND template QUICK_REPLY buttons (payload = button text)
            const buttonId = msg?.interactive?.button_reply?.id || msg?.button?.payload || "";
            const buttonText = (msg?.interactive?.button_reply?.title || msg?.button?.text || "").toLowerCase().trim();

            // Map template button text to bot IDs
            const templateButtonMap: Record<string, string> = {
              "track order": "bot_track",
              "talk to support": "bot_support",
              "offers and deals": "bot_offers",
              "offers & deals": "bot_offers",
            };
            const mappedBotId = templateButtonMap[buttonText] || "";
            const effectiveBotId = buttonId.startsWith("bot_") ? buttonId : mappedBotId;

            const isOrderConfirmBtn = buttonText === "order confirm" || buttonId.toLowerCase() === "order confirm";
            if (isOrderConfirmBtn) {
              // "Order Confirm" quick-reply from the order-confirmation template:
              // the customer just tapped it, so the 24h window is open — (re)send
              // the GST tax-invoice PDF on WhatsApp for their latest live order.
              (async () => {
                try {
                  const custOrders = await getOrdersByPhone(phone);
                  const ord = (custOrders as any[]).find(o => o.status !== "cancelled" && o.status !== "pending_payment") || (custOrders as any[])[0];
                  if (ord) {
                    // Idempotency: the invoice is sent EXACTLY ONCE, on the first
                    // confirmation (the placed → processing transition). If the
                    // customer taps "Order Confirm" again the order is already
                    // "processing" (or beyond), so we only send a short ack — no
                    // duplicate invoice.
                    const isFirstConfirm = ord.status === "placed";
                    if (isFirstConfirm) {
                      try { await updateOrderStatus(ord.id, "processing"); ord.status = "processing"; }
                      catch (e) { console.error("[WA order-confirm] status update failed", e); }
                      const inv = await generateOrderInvoice(ord);
                      if (inv?.url) {
                        await sendDocumentMessage(phone, inv.url, `Invoice-${ord.id}.pdf`, `🧾 Tax invoice for your order #${ord.id}. Thank you for shopping with Nutriwow! 🌿`);
                      } else {
                        await sendTextMessage(phone, `Thank you for confirming order #${ord.id}! We're preparing it now. 🌿`);
                      }
                    } else {
                      // Already confirmed earlier — acknowledge without re-sending.
                      await sendTextMessage(phone, `Order #${ord.id} is already confirmed and being prepared. 🌿`);
                    }
                  }
                } catch (e) { console.error("[WA order-confirm] invoice send failed", e); }
              })();
            } else if (effectiveBotId) {
              // This is a chatbot menu button reply — handle it directly
              handleChatbotReply({ phone, buttonId: effectiveBotId, customerName: contactName || undefined }).catch(() => {});
            } else {
              // Keyword-based auto-reply for free-text messages
              const lowerText = text.toLowerCase().trim();
              // Skip auto-reply for OTP-related messages (avoid noise)
              const isOtpRelated = /(otp|verify|verification|code|login|sign in)/.test(lowerText);
              if (isOtpRelated) {
                // No auto-reply for OTP messages
              } else {
                const isSupportKeyword = /^(help|support|agent|talk|call|connect|madad|sahayata|baat karo|team)$/.test(lowerText) || /(need help|help me|support team|connect me|agent se|baat karni|call karo|help chahiye|madad chahiye)/.test(lowerText);
                const isGreeting = /^(hi|hello|hey|hii|helo|namaste|namaskar|hy|hlo|start|menu|\?|info|kya|kaise|bhai|ji|ok|okay)$/.test(lowerText);
                const isTrackKeyword = /(track|order|status|kahan|tracking|awb|shipment|parcel|delivery|deliver|shipped|mera order|mera parcel)/.test(lowerText);
                const isReturnKeyword = /(return|refund|wapas|cancel|exchange|damaged|broken|wrong|quality|complaint|problem|issue)/.test(lowerText);
                const isOfferKeyword = /(offer|coupon|discount|deal|sale|promo|code|free|cashback|sasta|cheap|price|rate)/.test(lowerText);
                const isProductKeyword = /(product|kya milta|kya hai|items|list|catalog|nuts|dry fruit|snack|badam|kaju|pista|akhrot|seeds|makhana|dates|khajoor)/.test(lowerText);

                if (isSupportKeyword) {
                  handleChatbotReply({ phone, buttonId: "bot_support", customerName: contactName || undefined }).catch(() => {});
                } else if (isGreeting) {
                  sendChatbotMenu({ phone }).catch(() => {});
                } else if (isTrackKeyword) {
                  handleChatbotReply({ phone, buttonId: "bot_track", customerName: contactName || undefined }).catch(() => {});
                } else if (isReturnKeyword) {
                  sendChatbotMenu({
                    phone,
                    greeting: `↩️ *Return / Refund*\n\nHamari return policy ke liye:\n👉 www.nutriwow.in/return-policy\n\nHamari team se baat karne ke liye neeche option choose karein:`,
                  }).catch(() => {});
                } else if (isOfferKeyword) {
                  handleChatbotReply({ phone, buttonId: "bot_offers", customerName: contactName || undefined }).catch(() => {});
                } else if (isProductKeyword) {
                  sendChatbotMenu({
                    phone,
                    greeting: `🌰 *Nutriwow Products*\n\nHum premium quality dry fruits, nuts, seeds aur healthy snacks offer karte hain!\n\n👉 Shop: www.nutriwow.in\n\nKisi specific product ke baare mein jaanna chahte hain?`,
                  }).catch(() => {});
                }
                // If none of the keywords match, no auto-reply (admin will reply manually)
              }
            }
          }
          // Status updates (delivered/read)
          for (const status of value?.statuses || []) {
            if (status.id) {
              const errInfo = status.errors?.length ? ` errors: ${JSON.stringify(status.errors)}` : "";
              console.log(`[WhatsApp Webhook] Status update: ${status.status} for msgId: ${status.id}${errInfo}`);
              await db.update(whatsappMessages)
                .set({ status: status.status })
                .where(eq(whatsappMessages.metaMessageId, status.id));
              
              // Also update whatsappLogs status and campaign delivered count
              try {
                const { whatsappLogs, whatsappCampaigns } = await import("../../drizzle/schema");
                const { sql } = await import("drizzle-orm");
                
                // Update log status
                const updateResult = await db.update(whatsappLogs)
                  .set({ status: status.status })
                  .where(eq(whatsappLogs.metaMessageId, status.id));
                console.log(`[WhatsApp Webhook] Log status updated for ${status.id}: ${status.status}`);
                
                // If delivered, increment campaign totalDelivered
                if (status.status === 'delivered') {
                  // Find the log entry to get campaignId
                  const [logEntry] = await db.select({ campaignId: whatsappLogs.campaignId })
                    .from(whatsappLogs)
                    .where(eq(whatsappLogs.metaMessageId, status.id))
                    .limit(1);
                  
                  if (logEntry?.campaignId) {
                    await db.update(whatsappCampaigns)
                      .set({ totalDelivered: sql`${whatsappCampaigns.totalDelivered} + 1` })
                      .where(eq(whatsappCampaigns.id, logEntry.campaignId));
                    console.log(`[WhatsApp Webhook] Campaign ${logEntry.campaignId} delivered count incremented`);
                  }
                }
                

              } catch (logErr) {
                // Non-critical: don't fail webhook if log update fails
                console.log('[WhatsApp Webhook] Log/campaign update error:', logErr);
              }
            }
          }
        }
      }
      return res.sendStatus(200);
    } catch (err: any) {
      console.error("[WhatsApp Webhook] Error:", err?.message);
      return res.sendStatus(200);
    }
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    // HSTS: force HTTPS for 2 years incl. subdomains (NW-SEC-04). Vercel already
    // serves the site over HTTPS, so this is safe to enforce.
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    // CSP in REPORT-ONLY mode (NW-SEC-04): observes violations without blocking
    // anything, so it's safe to ship. Review browser-console/report violations,
    // tighten the allow-lists, then switch the header name to
    // "Content-Security-Policy" (enforcing). Covers the known third parties:
    // GA/GTM, Meta Pixel, Razorpay, PhonePe, Google Fonts, Vercel Blob/Image,
    // Sentry, Firebase.
    res.setHeader("Content-Security-Policy-Report-Only", [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://checkout.razorpay.com https://*.razorpay.com https://*.phonepe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://region1.google-analytics.com https://connect.facebook.net https://*.facebook.com https://*.razorpay.com https://*.phonepe.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://firebaseinstallations.googleapis.com https://*.googleapis.com",
      "frame-src 'self' https://*.razorpay.com https://*.phonepe.com https://api.razorpay.com https://www.youtube.com https://www.youtube-nocookie.com",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join("; "));
    next();
  });

  app.get("/api/health", async (_req, res) => {
    const url = process.env.DATABASE_URL;
    if (!url) return res.json({ ok: false, error: "DATABASE_URL not set" });
    try {
      const parsed = new URL(url);
      const mysql2 = await import("mysql2/promise");
      const conn = await mysql2.default.createConnection({
        host: parsed.hostname,
        port: Number(parsed.port) || 4000,
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.slice(1),
        ssl: { rejectUnauthorized: true },
        connectTimeout: 10000,
      });
      await conn.execute("SELECT 1");
      await conn.end();
      return res.json({ ok: true, host: parsed.hostname, user: parsed.username, db: parsed.pathname.slice(1) });
    } catch (err: any) {
      return res.json({ ok: false, error: err?.message, code: err?.code, errno: err?.errno });
    }
  });

  // PhonePe webhook endpoint — PhonePe POSTs payment status here
  app.post("/api/phonepe/webhook", async (req, res) => {
    try {
      const clientId = process.env.PHONEPE_CLIENT_ID;
      const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        console.error("[PhonePe Webhook] Credentials not configured");
        return res.status(500).json({ success: false });
      }

      const client = StandardCheckoutClient.getInstance(clientId, clientSecret, 1, Env.PRODUCTION);
      const authorization = req.headers["authorization"] as string || "";
      const responseBody = JSON.stringify(req.body);

      // Validate callback authenticity using SDK
      const callbackResponse = client.validateCallback(
        clientId,
        clientSecret,
        authorization,
        responseBody
      );

      console.log("[PhonePe Webhook] Validated callback:", JSON.stringify(callbackResponse));

      // Update order payment status if payment completed
      const cbState = (callbackResponse as any)?.state?.toUpperCase() || (callbackResponse as any)?.data?.state?.toUpperCase();
      const merchantOrderId = (callbackResponse as any)?.merchantOrderId || (callbackResponse as any)?.data?.merchantOrderId;
      if (cbState === "COMPLETED" && merchantOrderId) {
        try {
          const existing = await getOrderById(merchantOrderId);
          if (existing && existing.status === "pending_payment") {
            // Full finalize (idempotent): redeems coupon, sends confirmations,
            // notifies admin, and fires purchase conversion — matching the client
            // callback path so a webhook-only confirmation isn't a silent no-notify.
            await finalizePendingOrder(existing);
            console.log(`[PhonePe Webhook] Order ${merchantOrderId} confirmed: pending_payment → placed`);
          } else if (existing) {
            console.log(`[PhonePe Webhook] Order ${merchantOrderId} already confirmed (status: ${existing.status})`);
          } else {
            console.warn(`[PhonePe Webhook] Order ${merchantOrderId} NOT in DB — this should not happen with new flow`);
          }
        } catch (dbErr: any) {
          console.error("[PhonePe Webhook] DB error:", dbErr?.message);
        }
      }
      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("[PhonePe Webhook] Validation failed:", err?.message);
      return res.status(400).json({ success: false, error: err?.message });
    }
  });

  // Courier tracking webhook — Shiprocket / iThink POST shipment status updates here.
  // Configure in the courier panel with URL https://www.nutriwow.in/api/shipping/webhook
  // (Shiprocket sends the panel's token in the `x-api-key` header; iThink can append
  // ?token=... ). This auto-advances the matching order (e.g. shipped → delivered) and
  // fires the customer WhatsApp + email notifications, so status no longer needs a
  // manual admin click. Set SHIPPING_WEBHOOK_TOKEN to enable auth.
  app.post("/api/shipping/webhook", async (req, res) => {
    try {
      const expectedToken = process.env.SHIPPING_WEBHOOK_TOKEN;
      if (expectedToken) {
        const provided =
          (req.headers["x-api-key"] as string) ||
          (req.query.token as string) ||
          (req.body?.token as string) ||
          "";
        const pBuf = Buffer.from(provided);
        const eBuf = Buffer.from(expectedToken);
        if (pBuf.length !== eBuf.length || !crypto.timingSafeEqual(pBuf, eBuf)) {
          console.error("[Shipping Webhook] Invalid token — rejecting");
          return res.status(401).json({ success: false, error: "Unauthorized" });
        }
      } else if (process.env.NODE_ENV === "production") {
        // SECURITY: a forged shipping webhook can advance order state + fire customer
        // notifications — never accept it unauthenticated in production.
        console.error("[Shipping Webhook] SHIPPING_WEBHOOK_TOKEN not set in production — rejecting");
        return res.status(503).json({ success: false, error: "Webhook auth not configured" });
      } else {
        console.warn("[Shipping Webhook] SHIPPING_WEBHOOK_TOKEN not set — skipping auth (dev only)");
      }

      const events = extractCourierEvents(req.body);
      if (events.length === 0) {
        console.warn("[Shipping Webhook] No AWB/status found in payload");
        return res.status(200).json({ success: true, processed: 0, changed: 0 });
      }

      let changed = 0;
      for (const evt of events) {
        try {
          const r = await reconcileCourierStatus(evt);
          if (r.changed) {
            changed++;
            console.log(
              `[Shipping Webhook] Order ${r.orderId}: ${r.previousStatus} → ${r.newStatus} (AWB ${evt.awb}, courier "${evt.rawStatus}")`
            );
          } else {
            console.log(`[Shipping Webhook] AWB ${evt.awb} "${evt.rawStatus}" — no change (${r.reason})`);
          }
        } catch (e: any) {
          console.error(`[Shipping Webhook] Failed for AWB ${evt.awb}:`, e?.message);
        }
      }
      return res.status(200).json({ success: true, processed: events.length, changed });
    } catch (err: any) {
      console.error("[Shipping Webhook] Error:", err?.message);
      // Return 200 so couriers don't retry-storm on a malformed payload.
      return res.status(200).json({ success: false, error: err?.message });
    }
  });

  // Diagnostic: list the iThink pickup/warehouse addresses (with their ids) so the
  // owner can find the correct ITHINK_PICKUP_ID after setting up a fresh iThink
  // account. Open in a browser:
  //   https://www.nutriwow.in/api/shipping/ithink-pickups?token=<SHIPPING_WEBHOOK_TOKEN>
  app.get("/api/shipping/ithink-pickups", async (req, res) => {
    const expectedToken = process.env.SHIPPING_WEBHOOK_TOKEN;
    const provided = (req.query.token as string) || (req.headers["x-api-key"] as string) || "";
    if (expectedToken) {
      const pBuf = Buffer.from(provided);
      const eBuf = Buffer.from(expectedToken);
      if (pBuf.length !== eBuf.length || !crypto.timingSafeEqual(pBuf, eBuf)) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }
    const result = await ithinkGetPickupAddresses();
    return res.status(200).json(result);
  });

  // ─── Android App Links: assetlinks.json ────────────────────────────────────
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    res.type("application/json");
    res.send(JSON.stringify([
      {
        relation: [
          "delegate_permission/common.handle_all_urls",
          "delegate_permission/common.get_login_creds",
        ],
        target: {
          namespace: "android_app",
          package_name: "in.nutriwow.app",
          sha256_cert_fingerprints: [
            "3C:C7:AE:F8:6D:DE:88:35:65:12:9D:64:C4:30:E9:5A:C5:50:D1:4B:51:71:4D:17:18:69:23:8C:9B:83:21:28",
          ],
        },
      },
    ]));
  });

  // ─── SEO: robots.txt ───────────────────────────────────────────────────────
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain");
    res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /profile
Disallow: /track-order
Disallow: /wishlist
Disallow: /search
Disallow: /cart
Disallow: /checkout
Disallow: /order-confirmation
Disallow: /payment-status

Sitemap: https://www.nutriwow.in/sitemap.xml
`);
  });

  // ─── SEO: 301 redirects for legacy Shopify /pages/* URLs ─────────────────────
  // The old Shopify storefront used /pages/<slug>. Those URLs now render the SPA
  // 404 (soft-404 in Search Console). Map the ones with a current equivalent to a
  // real 301 so they stop being soft-404s; unknown /pages/* fall through to the
  // SPA (which serves the noindex NotFound page).
  const LEGACY_PAGE_REDIRECTS: Record<string, string> = {
    "order-status": "/track-order",
    "track-order": "/track-order",
    "track-your-order": "/track-order",
    "contact": "/contact",
    "contact-us": "/contact",
    "about": "/about",
    "about-us": "/about",
    "faq": "/faq",
    "faqs": "/faq",
    "shipping-policy": "/shipping-policy",
    "refund-policy": "/refund-policy",
    "returns": "/return-policy",
    "return-policy": "/return-policy",
    "privacy-policy": "/privacy-policy",
    "terms-and-conditions": "/terms-and-conditions",
    "terms-of-service": "/terms-and-conditions",
  };
  app.get("/pages/:slug", (req, res, next) => {
    const target = LEGACY_PAGE_REDIRECTS[(req.params.slug || "").toLowerCase()];
    if (target) return res.redirect(301, target);
    next(); // unknown /pages/* → SPA renders the noindex 404 page
  });

  // ─── SEO: 301 redirects for legacy /<name>/catalogue/<id>/<id> product URLs ──
  // The old storefront exposed products at /<product-name>/catalogue/<id>/<id>.
  // Redirect the known ones to their current /products/<handle> equivalent so the
  // old URLs stop being soft-404s and keep any link equity; unknown ones fall
  // through to the SPA (noindex 404).
  const LEGACY_CATALOGUE_REDIRECTS: Record<string, string> = {
    "edible-seeds-combo-premium-chia-seed-and-flax": "/products/nutriwow-edible-seeds-combo-500g-premium-chia-seed-250g-and-premium-flax-seeds-alsi-250g",
    "premium-classic-roasted-salted-cashew-kaju": "/products/nutriwow-classic-salted-cashew",
    "premium-omani-dates-khajur-400g": "/products/nutriwow-omani-dates",
    "premium-classic-roasted-salted-almonds-badam-200g": "/products/nutriwow-classic-salted-almonds",
  };
  app.get("/:name/catalogue/:a/:b", (req, res, next) => {
    const key = decodeURIComponent(req.params.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const target = LEGACY_CATALOGUE_REDIRECTS[key];
    if (target) return res.redirect(301, target);
    next(); // unknown legacy catalogue URL → SPA noindex 404
  });

  // ─── SEO: sitemap.xml ───────────────────────────────────────────────────────
  app.get("/sitemap.xml", async (_req, res) => {
    const BASE = "https://www.nutriwow.in";
    const now = new Date().toISOString().split("T")[0];
    const staticPages = [
      { url: "/", priority: "1.0", changefreq: "daily" },
      { url: "/gifting", priority: "0.8", changefreq: "weekly" },
      { url: "/blog", priority: "0.8", changefreq: "weekly" },
      { url: "/about", priority: "0.5", changefreq: "monthly" },
      { url: "/contact", priority: "0.5", changefreq: "monthly" },
      { url: "/faq", priority: "0.6", changefreq: "monthly" },
      { url: "/shipping-policy", priority: "0.3", changefreq: "yearly" },
      { url: "/return-policy", priority: "0.3", changefreq: "yearly" },
      { url: "/refund-policy", priority: "0.3", changefreq: "yearly" },
      { url: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
      { url: "/terms-and-conditions", priority: "0.3", changefreq: "yearly" },
    ];
    // Categories — sourced from the same admin-managed list the app uses
    // ("productCategories" store setting), so the sitemap never drifts.
    const DEFAULT_CATEGORIES = ["Nuts","Seeds","Berries","Snacks","Healthy Mix","Exotic Dried Fruits","Combos","Dates","Makhana"];
    let categories = DEFAULT_CATEGORIES;
    try {
      let cv = await getStoreSetting("productCategories");
      if (typeof cv === "string") { try { cv = JSON.parse(cv); } catch { cv = null; } }
      if (Array.isArray(cv) && cv.length > 0) {
        categories = (cv as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      }
    } catch {}
    // Shopify-style collection URLs
    const categoryUrls = categories.map(c => ({ url: `/collections/${encodeURIComponent(c)}`, priority: "0.8", changefreq: "weekly" }));
    // Shopify-style product URLs — fetch handles + lastmod from DB
    let productUrls: { url: string; priority: string; changefreq: string; lastmod?: string }[] = [];
    try {
      const db = await getDb();
      if (db) {
        const { products: productsTable } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbProds = await db.select({ handle: productsTable.handle, updatedAt: productsTable.updatedAt }).from(productsTable).where(eq(productsTable.available, true));
        productUrls = dbProds.map(p => ({ url: `/products/${p.handle}`, priority: "0.7", changefreq: "weekly", lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().split("T")[0] : undefined }));
      }
    } catch {}
    if (productUrls.length === 0) {
      const { products: staticProds } = await import("../../client/src/lib/products");
      productUrls = (staticProds as any[]).map(p => ({ url: `/products/${p.handle}`, priority: "0.7", changefreq: "weekly" }));
    }
    // Blog URLs — DB published posts are the source of truth (with real lastmod).
    // The hardcoded slug list is only a fallback when the DB is unavailable, so
    // the sitemap never lists blog URLs that would 404.
    const FALLBACK_BLOG_SLUGS = ["benefits-of-almonds","cashews-for-heart-health","makhana-superfood","black-raisins-benefits","walnuts-brain-food","dry-fruits-for-weight-loss","top-10-health-benefits-of-almonds","cashews-vs-almonds-which-is-better","pumpkin-seeds-benefits-for-health","how-to-eat-dates-for-health-benefits","makhana-for-weight-loss","best-dry-fruits-for-diabetics","pistachios-benefits-why-eat-pista-daily","raisins-kishmish-health-benefits","dry-fruits-during-pregnancy","how-to-store-dry-fruits-fresh"];
    let blogUrls: { url: string; priority: string; changefreq: string; lastmod?: string }[] = [];
    try {
      const db = await getDb();
      if (db) {
        const { blogPosts } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbPosts = await db.select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt }).from(blogPosts).where(eq(blogPosts.status, "published"));
        blogUrls = dbPosts
          .filter(p => !!p.slug)
          .map(p => ({ url: `/blogs/news/${p.slug}`, priority: "0.7", changefreq: "monthly", lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().split("T")[0] : undefined }));
      }
    } catch {}
    if (blogUrls.length === 0) {
      blogUrls = FALLBACK_BLOG_SLUGS.map(s => ({ url: `/blogs/news/${s}`, priority: "0.7", changefreq: "monthly" }));
    }
    const allUrls: { url: string; priority: string; changefreq: string; lastmod?: string }[] = [...staticPages, ...categoryUrls, ...productUrls, ...blogUrls];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${BASE}${u.url}</loc>
    <lastmod>${u.lastmod || now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
    res.type("application/xml");
    res.send(xml);
  });

  // ─── Product Feeds ────────────────────────────────────────────────────────────
  // Helper: get products from DB for feeds
  async function getFeedProducts(): Promise<any[]> {
    try {
      const dbProducts = await getAllProducts();
      if (dbProducts && dbProducts.length > 0) return dbProducts;
    } catch (e) {
      console.error("[Feed] getAllProducts failed:", e);
    }
    // Fallback: direct DB query
    try {
      const db = await getDb();
      if (db) {
        const { products } = await import("../../drizzle/schema");
        const rows = await db.select().from(products);
        if (rows.length > 0) return rows;
      }
    } catch (e2) {
      console.error("[Feed] Direct DB query also failed:", e2);
    }
    return [];
  }

  // Google Shopping XML feed (also compatible with Microsoft Bing Shopping)
  app.get("/feed/google-shopping.xml", async (_req, res) => {
    try {
      const BASE = "https://www.nutriwow.in";
      const products = await getFeedProducts();
      const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&amp;amp;/g, '&amp;');
      // Return the LARGEST version of an image for Merchant Center (high-resolution).
      // Google Drive links serve a tiny thumbnail by default — force a large size.
      const hiResUrl = (src: string): string => {
        if (!src) return src;
        const g = src.match(/lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]+)/);
        if (g) return `https://lh3.googleusercontent.com/d/${g[1]}=s1600`;
        const d = src.match(/drive\.google\.com\/(?:file\/d\/|[^?]*[?&]id=)([A-Za-z0-9_-]+)/);
        if (d) return `https://lh3.googleusercontent.com/d/${d[1]}=s1600`;
        return src;
      };
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Nutriwow India - Premium Dry Fruits &amp; Nuts</title>
    <link>${BASE}</link>
    <description>Premium quality dry fruits, nuts, seeds and healthy snacks</description>
${products.map(p => {
  const imgs = Array.from(new Set(((Array.isArray(p.images) && p.images.length ? p.images : [p.image]) as string[]).filter(Boolean).map(hiResUrl)));
  const primary = imgs[0] || hiResUrl(p.image);
  const extra = imgs.slice(1, 11);
  const hasSale = p.mrp && Number(p.mrp) > Number(p.price);
  const listPrice = hasSale ? p.mrp : p.price;
  return `    <item>
      <g:id>${p.id}</g:id>
      <g:title>${esc(p.name)}</g:title>
      <g:description>${esc((p.description || p.name).substring(0, 5000))}</g:description>
      <g:link>${BASE}/products/${p.handle}</g:link>
      <g:image_link>${esc(primary)}</g:image_link>
${extra.map(u => `      <g:additional_image_link>${esc(u)}</g:additional_image_link>`).join('\n')}
      <g:price>${listPrice}.00 INR</g:price>
${hasSale ? `      <g:sale_price>${p.price}.00 INR</g:sale_price>` : ''}
      <g:availability>${p.available !== false ? 'in stock' : 'out of stock'}</g:availability>
      <g:brand>Nutriwow</g:brand>
      <g:mpn>${p.id}</g:mpn>
      <g:condition>new</g:condition>
      <g:product_type>${esc(p.category)}</g:product_type>
      <g:identifier_exists>no</g:identifier_exists>
      <g:shipping>
        <g:country>IN</g:country>
        <g:price>0 INR</g:price>
      </g:shipping>
    </item>`;
}).join('\n')}
  </channel>
</rss>`;
      res.type("application/xml");
      res.send(xml);
    } catch (err) {
      console.error("[Feed] google-shopping.xml error:", err);
      res.status(500).send("Feed generation error");
    }
  });

  // Facebook / Meta Product Catalog feed (CSV format — most compatible)
  app.get("/feed/facebook-catalog.csv", async (_req, res) => {
    try {
      const BASE = "https://www.nutriwow.in";
      const products = await getFeedProducts();
      const escCsv = (s: string) => '"' + String(s).replace(/"/g, '""').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;amp;/g, '&') + '"';
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
      res.type('text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="facebook-catalog.csv"');
      res.send([header, ...rows].join('\n'));
    } catch (err) {
      console.error("[Feed] facebook-catalog.csv error:", err);
      res.status(500).send("Feed generation error");
    }
  });

  // Facebook / Meta Product Catalog feed (XML format)
  app.get("/feed/facebook-catalog.xml", async (_req, res) => {
    try {
      const BASE = "https://www.nutriwow.in";
      const products = await getFeedProducts();
      const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&amp;amp;/g, '&amp;');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed>
${products.map(p => `  <entry>
    <id>${p.id}</id>
    <title>${esc(p.name)}</title>
    <description>${esc((p.description || p.name).substring(0, 5000))}</description>
    <availability>${p.available !== false ? 'in stock' : 'out of stock'}</availability>
    <condition>new</condition>
    <price>${p.price}.00 INR</price>
    <link>${BASE}/products/${p.handle}</link>
    <image_link>${p.image}</image_link>
    <brand>Nutriwow</brand>
    <product_type>${esc(p.category)}</product_type>
  </entry>`).join('\n')}
</feed>`;
      res.type('application/xml');
      res.send(xml);
    } catch (err) {
      console.error("[Feed] facebook-catalog.xml error:", err);
      res.status(500).send("Feed generation error");
    }
  });

  // ─── SEO: 301 Redirects ─────────────────────────────────────────────────────
  // NOTE: /products/, /collections/, /blogs/news/ are now the PRIMARY URLs.
  // Old /product/, /category/, /blog/ URLs redirect to the new Shopify-style ones.

  // Old product URLs: /product/:id → /products/:id (numeric)
  app.get("/product/:id", (req, res) => {
    return res.redirect(301, `/products/${req.params.id}`);
  });
  // Numeric product IDs: /products/2 → /products/:handle (SEO slug)
  // Only redirect if the param looks like a pure integer
  app.get("/products/:id", async (req, res, next) => {
    const numId = parseInt(req.params.id, 10);
    if (isNaN(numId) || String(numId) !== req.params.id) return next(); // not numeric → pass to SPA
    try {
      const db = await getDb();
      if (db) {
        const { products: productsTable } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await db.select({ handle: productsTable.handle }).from(productsTable).where(eq(productsTable.id, numId)).limit(1);
        if (rows[0]?.handle) return res.redirect(301, `/products/${rows[0].handle}`);
      }
    } catch {}
    return next(); // product not found → let SPA handle 404
  });
  // Old category URLs: /category/:name → /collections/:name
  app.get("/category/:name", (req, res) => {
    return res.redirect(301, `/collections/${req.params.name}`);
  });
  // Old blog URLs: /blog/:slug → /blogs/news/:slug
  app.get("/blog/:slug", (req, res) => {
    return res.redirect(301, `/blogs/news/${req.params.slug}`);
  });
  // Old Shopify-style blog: /blogs/:blog/:slug → /blogs/news/:slug (canonical)
  // Only redirect if blog segment is NOT 'news' (to avoid infinite redirect loop)
  app.get("/blogs/:blog/:slug", (req, res, next) => {
    if (req.params.blog === "news") return next(); // pass through to SPA
    return res.redirect(301, `/blogs/news/${req.params.slug}`);
  });
  // Shopify pages: /pages/about → /about, /pages/contact → /contact
  app.get("/pages/:slug", (req, res) => {
    return res.redirect(301, `/${req.params.slug}`);
  });

  // ─── Email Tracking & Unsubscribe ────────────────────────────────────────────
  const PIXEL_GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

  app.get("/api/track/open/:logId", async (req, res) => {
    try {
      const logId = parseInt(req.params.logId, 10);
      if (!isNaN(logId)) {
        const { recordEmailOpen } = await import("../db");
        await recordEmailOpen(logId);
      }
    } catch (e) { console.error("[EmailTrack] open error:", e); }
    res.set({ "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache" });
    res.send(PIXEL_GIF);
  });

  app.get("/api/track/click/:logId", async (req, res) => {
    const url = req.query.url as string;
    try {
      const logId = parseInt(req.params.logId, 10);
      if (!isNaN(logId)) {
        const { recordEmailClick } = await import("../db");
        await recordEmailClick(logId);
      }
    } catch (e) { console.error("[EmailTrack] click error:", e); }
    // SECURITY: only redirect to our own domains. Redirecting to an arbitrary
    // attacker-supplied `url` is an open redirect usable to phish off the trusted
    // nutriwow.in domain. Off-domain / malformed targets fall back to the homepage.
    let dest = "https://www.nutriwow.in";
    try {
      if (url) {
        const u = new URL(url);
        const host = u.hostname.toLowerCase();
        const ownDomain = host === "nutriwow.in" || host.endsWith(".nutriwow.in")
          || host === "nutriwowindia.com" || host.endsWith(".nutriwowindia.com");
        if (u.protocol === "https:" && ownDomain) dest = u.toString();
      }
    } catch { /* malformed URL → homepage */ }
    res.redirect(302, dest);
  });

  app.get("/api/unsubscribe", async (req, res) => {
    const email = (req.query.email as string || "").toLowerCase().trim();
    const token = req.query.token as string || "";
    // Verify HMAC token to prevent abuse
    const { ENV } = await import("./env");
    const secret = ENV.cookieSecret || "nutriwow-unsub-fallback";
    if (!ENV.cookieSecret) console.warn("[Security] JWT_SECRET not set — unsubscribe HMAC using fallback");
    const expected = crypto.createHmac("sha256", secret).update(email).digest("hex").slice(0, 16);
    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expected);
    if (!email || tokenBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
      res.status(400).send(unsubPage("Invalid or expired unsubscribe link.", false));
      return;
    }
    const { addEmailUnsubscribe, isEmailUnsubscribed } = await import("../db");
    const already = await isEmailUnsubscribed(email);
    if (already) {
      res.send(unsubPage("You are already unsubscribed.", true));
      return;
    }
    await addEmailUnsubscribe(email, "one-click");
    res.send(unsubPage("You have been unsubscribed from Nutriwow marketing emails.", true));
  });

  function escHtml(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function unsubPage(msg: string, success: boolean) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Unsubscribe - Nutriwow</title>
    <style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f9fafb}
    .card{background:#fff;border-radius:16px;padding:40px;max-width:400px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    .icon{font-size:48px;margin-bottom:16px}h1{font-size:20px;color:#1a1a1a;margin:0 0 8px}p{color:#666;font-size:14px;line-height:1.5}
    a{color:#43A047;text-decoration:none;font-weight:600}</style></head>
    <body><div class="card"><div class="icon">${success ? "✓" : "⚠"}</div><h1>${success ? "Unsubscribed" : "Error"}</h1>
    <p>${escHtml(msg)}</p><p style="margin-top:20px"><a href="https://www.nutriwow.in">Visit Nutriwow</a></p></div></body></html>`;
  }

  // ─── tRPC API ────────────────────────────────────────────────────────────────
  app.get("/api/cron/jobs", async (req, res) => {
    const configuredSecret = process.env.CRON_SECRET;
    const auth = req.headers.authorization || "";
    if (!configuredSecret) {
      return res.status(503).json({ ok: false, error: "CRON_SECRET is not configured" });
    }
    const expected = `Bearer ${configuredSecret}`;
    const aBuf = Buffer.from(auth);
    const eBuf = Buffer.from(expected);
    if (aBuf.length !== eBuf.length || !crypto.timingSafeEqual(aBuf, eBuf)) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    try {
      const result = await processCronJobs();
      return res.status(200).json(result);
    } catch (err: any) {
      console.error("[Cron] job processing failed:", err);
      Sentry.captureException(err);
      return res.status(500).json({ ok: false, error: err?.message || "Cron failed" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  Sentry.setupExpressErrorHandler(app);

  return app;
}

async function startServer() {
  const app = await buildApp();
  const server = createServer(app);

  // development mode uses Vite, production mode uses static files.
  // Vite is imported dynamically so it is never pulled into a production/
  // serverless bundle.
  if (process.env.NODE_ENV === "development") {
    // Use a variable specifier so bundlers (esbuild for the Vercel bundle) do
    // NOT statically follow this and pull the entire Vite/Tailwind toolchain
    // (incl. lightningcss's native binary) into the production server bundle.
    const viteEntry = "./vite";
    const { setupVite } = await import(/* @vite-ignore */ viteEntry);
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

// Only auto-start a listening server when this file is the process entry point
// (local `tsx` dev or `node dist/index.js`). When imported by the Vercel
// serverless function, do nothing here — that entry builds the app itself.
//
// This detection is wrapped defensively: in a bundled/serverless context
// `import.meta.url` may be undefined, and `fileURLToPath(undefined)` throws.
// A throw here would happen at module-import time (before any request handler
// runs), crashing the serverless function with an opaque FUNCTION_INVOCATION_FAILED.
// On any uncertainty we default to NOT auto-starting, which is correct for serverless.
function shouldAutoStart(): boolean {
  try {
    const entry = process.argv[1];
    const self = import.meta.url;
    if (!entry || !self) return false;
    return path.resolve(entry) === fileURLToPath(self);
  } catch {
    return false;
  }
}

if (shouldAutoStart()) {
  startServer().catch(console.error);
}
