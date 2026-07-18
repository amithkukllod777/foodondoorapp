/**
 * WhatsApp Meta Cloud API Service
 * Handles sending messages via Meta WhatsApp Business API
 * Phone Number: +91 99938 83710 (Foodondoor Business Number)
 * Phone Number ID: 1110962362096644
 * WABA ID: 718666704638313
 * Account Mode: LIVE
 *
 * IMPORTANT: Meta Cloud API requires pre-approved message templates for
 * business-initiated messages. The hello_world template is pre-approved.
 * Custom templates (order_confirmed, abandoned_cart, etc.) need approval
 * from Meta before they can be used in production.
 */

import { getDb, getOrdersByPhone, isNotificationEnabled } from "./db";
import { whatsappLogs, whatsappCampaigns, whatsappConversations, whatsappMessages } from "../drizzle/schema";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";
import { storagePut } from "./storage";

const WHATSAPP_API_BASE = "https://graph.facebook.com/v25.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "1110962362096644";
const WHATSAPP_CATALOG_ID = process.env.WHATSAPP_CATALOG_ID || "3914290288874560";
// ACCESS_TOKEN is read dynamically on each call so token updates take effect without restart
const getAccessToken = () => process.env.WHATSAPP_TOKEN || "";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WhatsAppTextMessage {
  phone: string;
  text: string;
}

export interface WhatsAppTemplateMessage {
  phone: string;
  templateName: string;
  languageCode?: string;
  components?: object[];
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppCampaignProduct {
  id: number;
  name: string;
  handle: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  weight?: string;
}

export interface WhatsAppProductCampaignPayload {
  kind: "product_campaign";
  headline: string;
  body: string;
  products: WhatsAppCampaignProduct[];
  format?: "hero" | "carousel" | "catalog"; // "catalog" = Meta catalog product_list with live price/View/cart inside 24h window
}

const BASE_URL = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.foodondoor.com";

export function parseProductCampaignPayload(message: string | null | undefined): WhatsAppProductCampaignPayload | null {
  if (!message) return null;
  try {
    const parsed = JSON.parse(message) as WhatsAppProductCampaignPayload;
    if (parsed?.kind !== "product_campaign" || !Array.isArray(parsed.products)) return null;
    return {
      kind: "product_campaign",
      headline: String(parsed.headline || "Foodondoor Products"),
      body: String(parsed.body || ""),
      format: parsed.format === "carousel" || parsed.format === "catalog" ? parsed.format : "hero",
      products: parsed.products
        .filter((p) => p && p.id && p.name && p.handle)
        .slice(0, 10)
        .map((p) => ({
          id: Number(p.id),
          name: String(p.name),
          handle: String(p.handle),
          imageUrl: String(p.imageUrl || ""),
          price: Number(p.price || 0),
          originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
          weight: p.weight ? String(p.weight) : undefined,
        })),
    };
  } catch {
    return null;
  }
}

function productUrl(product: WhatsAppCampaignProduct) {
  return `${BASE_URL}/products/${product.handle}`;
}

function productCampaignText(payload: WhatsAppProductCampaignPayload) {
  const lines = payload.products.map((product, index) => {
    const mrp = product.originalPrice && product.originalPrice > product.price
      ? ` (MRP ₹${product.originalPrice.toLocaleString("en-IN")})`
      : "";
    const weight = product.weight ? ` | ${product.weight}` : "";
    return `${index + 1}. *${product.name}*${weight}\n₹${product.price.toLocaleString("en-IN")}${mrp}\n${productUrl(product)}`;
  });
  return `*${payload.headline}*\n${payload.body}\n\n${lines.join("\n\n")}\n\nShop now: ${BASE_URL}`;
}

// ─── Media Download (incoming) ───────────────────────────────────────────────

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "video/mp4": "mp4", "video/3gpp": "3gp",
  "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/aac": "aac",
  "application/pdf": "pdf", "image/gif": "gif",
};

export async function downloadWhatsAppMedia(mediaId: string, mimeType?: string): Promise<string | null> {
  try {
    const token = getAccessToken();
    const metaRes = await fetch(`${WHATSAPP_API_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) { console.error("[WA Media] meta URL fetch failed:", metaRes.status); return null; }
    const metaData = await metaRes.json() as any;
    const downloadUrl = metaData.url;
    if (!downloadUrl) return null;

    const dlRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!dlRes.ok) { console.error("[WA Media] download failed:", dlRes.status); return null; }

    const buf = Buffer.from(await dlRes.arrayBuffer());
    const ext = MIME_EXT[mimeType || ""] || "bin";
    const key = `whatsapp-media/${mediaId}.${ext}`;
    const ct = mimeType || "application/octet-stream";

    const { url } = await storagePut(key, buf, ct);
    console.log(`[WA Media] Saved ${mediaId} → ${url} (${(buf.length / 1024).toFixed(1)}KB)`);
    return url;
  } catch (err) {
    console.error("[WA Media] download error:", err);
    return null;
  }
}

// ─── Core Send Functions ──────────────────────────────────────────────────────

/**
 * Send a free-form text message (only works within 24h customer service window)
 */
/** Send a hosted document (e.g. an invoice PDF at a public URL) via WhatsApp. */
export async function sendDocumentMessage(
  phone: string,
  link: string,
  filename: string,
  caption?: string,
): Promise<SendResult> {
  const cleanPhone = phone.replace(/\D/g, "");
  const phoneWithCountry = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
  try {
    const response = await fetch(`${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneWithCountry,
        type: "document",
        document: {
          link,
          filename,
          ...(caption ? { caption } : {}),
        },
      }),
    });
    const data = await response.json() as any;
    if (!response.ok) {
      return { success: false, error: data?.error?.message || "Unknown error" };
    }
    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error" };
  }
}

export async function sendTextMessage(phone: string, text: string): Promise<SendResult> {
  const cleanPhone = phone.replace(/\D/g, "");
  const phoneWithCountry = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

  try {
    const response = await fetch(`${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneWithCountry,
        type: "text",
        text: { body: text },
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      return { success: false, error: data?.error?.message || "Unknown error" };
    }

    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error" };
  }
}

/**
 * Send a pre-approved template message
 */
export async function sendTemplateMessage(params: WhatsAppTemplateMessage): Promise<SendResult> {
  const cleanPhone = params.phone.replace(/\D/g, "");
  const phoneWithCountry = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

  try {
    const response = await fetch(`${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phoneWithCountry,
        type: "template",
        template: {
          name: params.templateName,
          language: { code: params.languageCode || "en" },
          components: params.components || [],
        },
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      return { success: false, error: data?.error?.message || "Unknown error" };
    }

    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error" };
  }
}

// ─── Business Message Functions ───────────────────────────────────────────────

/**
 * Send order confirmation message.
 * Strategy: Template first (works outside 24h window) → Interactive fallback → Plain text fallback
 */
export async function sendOrderConfirmation(params: {
  phone: string;
  customerName: string;
  orderId: string;
  total: number;
  items: string;
  paymentMethod: string;
  firstProductImage?: string;
}): Promise<SendResult> {
  if (!(await isNotificationEnabled("newOrder"))) return { success: false };
  const cleanPhone = params.phone.replace(/\D/g, "");
  const phoneWithCountry = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
  const bodyText = `🎉 *Order Confirmed!*\n\nHi ${params.customerName}!\n\nYour Foodondoor order *#${params.orderId}* has been confirmed.\n\n📦 *Items:* ${params.items}\n💰 *Total:* ₹${params.total}\n💳 *Payment:* ${params.paymentMethod}\n\nWe'll notify you when your order is shipped. Thank you for shopping with Foodondoor! 🌿`;

  let result: SendResult = { success: false };

  // 1) Try order_confirm_v2 template (IMAGE header + "Order Confirm" quick reply button + "Track Order" URL button)
  // Upload image as JPEG media first — WhatsApp rejects WebP in template headers.
  if (params.firstProductImage) {
    const mediaId = await uploadHeroImage(params.firstProductImage);
    const imageParam = mediaId
      ? { type: "image" as const, image: { id: mediaId } }
      : { type: "image" as const, image: { link: getWhatsAppSafeImageUrl(params.firstProductImage) } };
    try {
      const templateResult = await sendTemplateMessage({
        phone: params.phone,
        templateName: "order_confirm_v2",
        languageCode: "en",
        components: [
          {
            type: "header",
            parameters: [imageParam],
          },
          {
            type: "body",
            parameters: [
              { type: "text", text: params.customerName },
              { type: "text", text: params.orderId },
              { type: "text", text: params.items },
              { type: "text", text: String(params.total) },
              { type: "text", text: params.paymentMethod },
            ],
          },
        ],
      });
      if (templateResult.success) {
        result = templateResult;
        console.log(`[WhatsApp] order_confirm_v2 template sent (mediaId=${mediaId || 'link-fallback'})`);
      }
    } catch (err: any) {
      console.log(`[WhatsApp] order_confirm_v2 template failed: ${err?.message || 'unknown'}`);
    }
  }

  // 1b) Fallback: order_confirmation_img template (IMAGE header + Track Order URL button, no quick reply)
  if (!result.success && params.firstProductImage) {
    const fallbackMediaId = await uploadHeroImage(params.firstProductImage);
    const fallbackImageParam = fallbackMediaId
      ? { type: "image" as const, image: { id: fallbackMediaId } }
      : { type: "image" as const, image: { link: getWhatsAppSafeImageUrl(params.firstProductImage) } };
    try {
      const templateResult = await sendTemplateMessage({
        phone: params.phone,
        templateName: "order_confirmation_img",
        languageCode: "en",
        components: [
          {
            type: "header",
            parameters: [fallbackImageParam],
          },
          {
            type: "body",
            parameters: [
              { type: "text", text: params.customerName },
              { type: "text", text: params.orderId },
              { type: "text", text: params.items },
              { type: "text", text: String(params.total) },
              { type: "text", text: params.paymentMethod },
            ],
          },
        ],
      });
      if (templateResult.success) {
        result = templateResult;
        console.log(`[WhatsApp] order_confirmation_img template sent (fallback, mediaId=${fallbackMediaId || 'link'})`);
      }
    } catch (err: any) {
      console.log(`[WhatsApp] order_confirmation_img template failed: ${err?.message || 'unknown'}`);
    }
  }

  // 2) Fallback: text-only template (no image header)
  if (!result.success) {
    try {
      const templateResult = await sendTemplateMessage({
        phone: params.phone,
        templateName: "order_confirmed",
        languageCode: "en",
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: params.customerName },
              { type: "text", text: params.orderId },
              { type: "text", text: params.items },
              { type: "text", text: String(params.total) },
              { type: "text", text: params.paymentMethod },
            ],
          },
        ],
      });
      if (templateResult.success) result = templateResult;
    } catch {
      // Template not approved or deleted, continue to fallback
    }
  }

  // 3) Fallback: Interactive message (only works within 24h window)
  if (!result.success) {
    // Send product image first (best-effort)
    if (params.firstProductImage) {
      try {
        const imgResult = await sendImageMessage({
          phone: params.phone,
          imageUrl: params.firstProductImage,
          caption: `🛍️ Your order #${params.orderId} is confirmed! 🌿`,
        });
        console.log(`[WhatsApp] Image send (interactive fallback): ${imgResult.success ? 'OK' : 'FAIL'} ${imgResult.error || ''} URL: ${getWhatsAppSafeImageUrl(params.firstProductImage)}`);
      } catch (imgErr: any) {
        console.error(`[WhatsApp] Image send error:`, imgErr?.message);
      }
      await new Promise(r => setTimeout(r, 800));
    }
    try {
      const response = await fetch(`${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${getAccessToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phoneWithCountry,
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: bodyText },
            action: {
              buttons: [
                {
                  type: "reply",
                  reply: {
                    id: `confirm_${params.orderId}`,
                    title: "Order Confirm ✅",
                  },
                },
              ],
            },
          },
        }),
      });
      const data = await response.json() as any;
      if (response.ok) {
        result = { success: true, messageId: data?.messages?.[0]?.id };
      } else {
        result = await sendTextMessage(params.phone, bodyText);
      }
    } catch {
      result = await sendTextMessage(params.phone, bodyText);
    }
  }

  await logWhatsAppMessage({
    phone: params.phone,
    customerName: params.customerName,
    messageType: "order_confirmed",
    templateName: "order_confirmed",
    messageContent: bodyText,
    orderId: params.orderId,
    status: result.success ? "sent" : "failed",
    metaMessageId: result.messageId,
    errorMessage: result.error,
  });
  await saveOutgoingToLiveChat({
    phone: params.phone,
    customerName: params.customerName,
    content: bodyText,
    messageType: "order_confirmation",
    metaMessageId: result.messageId,
    status: result.success ? "sent" : "failed",
  });

  return result;
}

/**
 * Send order shipped message.
 * Strategy: Template first → Interactive fallback → Plain text fallback
 */
export async function sendOrderShipped(params: {
  phone: string;
  customerName: string;
  orderId: string;
  awbCode: string;
  trackingUrl?: string;
  shippingProvider?: string;
}): Promise<SendResult> {
  if (!(await isNotificationEnabled("orderShipped"))) return { success: false };
  const cleanPhone = params.phone.replace(/\D/g, "");
  const phoneWithCountry = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
  const trackingPageUrl = `https://www.foodondoor.com/track-order?orderId=${params.orderId}`;
  const bodyText = `🚚 *Order Shipped!*\n\nHi ${params.customerName}!\n\nGreat news! Your Foodondoor order *#${params.orderId}* has been shipped via ${params.shippingProvider || "our courier partner"}.\n\n📋 *AWB Code:* ${params.awbCode}\n⏰ Expected delivery: 3-5 business days\n\nThank you for choosing Foodondoor! 🌿`;

  let result: SendResult = { success: false };

  // 1) Try approved template first
  try {
    const templateResult = await sendTemplateMessage({
      phone: params.phone,
      templateName: "order_shipped",
      languageCode: "en",
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: params.customerName },
            { type: "text", text: params.orderId },
            { type: "text", text: params.awbCode },
            { type: "text", text: params.shippingProvider || "Shiprocket" },
          ],
        },
      ],
    });
    if (templateResult.success) result = templateResult;
  } catch {
    // Template not approved yet
  }

  // 2) Fallback: Interactive message
  if (!result.success) {
    try {
      const response = await fetch(`${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${getAccessToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phoneWithCountry,
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: bodyText },
            action: {
              buttons: [
                {
                  type: "reply",
                  reply: {
                    id: `track_${params.orderId}`,
                    title: "Track Order 📦",
                  },
                },
              ],
            },
          },
        }),
      });
      const data = await response.json() as any;
      if (response.ok) {
        result = { success: true, messageId: data?.messages?.[0]?.id };
      } else {
        const fallbackMsg = `${bodyText}\n\n🔍 Track your order: ${trackingPageUrl}`;
        result = await sendTextMessage(params.phone, fallbackMsg);
      }
    } catch {
      const fallbackMsg = `${bodyText}\n\n🔍 Track your order: ${trackingPageUrl}`;
      result = await sendTextMessage(params.phone, fallbackMsg);
    }
  }

  await logWhatsAppMessage({
    phone: params.phone,
    customerName: params.customerName,
    messageType: "order_shipped",
    templateName: "order_shipped",
    messageContent: bodyText,
    orderId: params.orderId,
    status: result.success ? "sent" : "failed",
    metaMessageId: result.messageId,
    errorMessage: result.error,
  });
  await saveOutgoingToLiveChat({
    phone: params.phone,
    customerName: params.customerName,
    content: bodyText,
    messageType: "order_shipped",
    metaMessageId: result.messageId,
    status: result.success ? "sent" : "failed",
  });

  return result;
}

/**
 * Send order delivered message.
 * Strategy: Template first → Plain text fallback
 */
export async function sendOrderDelivered(params: {
  phone: string;
  customerName: string;
  orderId: string;
}): Promise<SendResult> {
  if (!(await isNotificationEnabled("orderDelivered"))) return { success: false };
  const message = `✅ *Order Delivered!*\n\nHi ${params.customerName}!\n\nYour Foodondoor order *#${params.orderId}* has been delivered successfully! 🎉\n\nWe hope you love your products. Please share your experience:\n⭐ Rate your order at: www.foodondoor.com\n\nFor any queries, WhatsApp us at +91 99938 83710\n\nThank you for choosing Foodondoor! 🌿`;

  let result: SendResult = { success: false };

  // 1) Try approved template first
  try {
    const templateResult = await sendTemplateMessage({
      phone: params.phone,
      templateName: "order_delivery_update",
      languageCode: "en",
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: params.customerName },
            { type: "text", text: params.orderId },
          ],
        },
      ],
    });
    if (templateResult.success) result = templateResult;
  } catch {
    // Template not approved yet
  }

  // 2) Fallback: Plain text
  if (!result.success) {
    result = await sendTextMessage(params.phone, message);
  }

  await logWhatsAppMessage({
    phone: params.phone,
    customerName: params.customerName,
    messageType: "order_delivered",
    templateName: "order_delivery_update",
    messageContent: message,
    orderId: params.orderId,
    status: result.success ? "sent" : "failed",
    metaMessageId: result.messageId,
    errorMessage: result.error,
  });
  await saveOutgoingToLiveChat({
    phone: params.phone,
    customerName: params.customerName,
    content: message,
    messageType: "order_delivered",
    metaMessageId: result.messageId,
    status: result.success ? "sent" : "failed",
  });

  return result;
}

/**
 * Send abandoned cart recovery message.
 * Strategy: Template first → Plain text fallback
 */
export async function sendAbandonedCartRecovery(params: {
  phone: string;
  customerName: string;
  cartItems: string;
  cartTotal: number;
  cartId: number;
}): Promise<SendResult> {
  if (!(await isNotificationEnabled("abandonedCart"))) return { success: false };
  const message = `🛒 *You left something behind!*\n\nHi ${params.customerName || "there"}!\n\nYou have items waiting in your Foodondoor cart:\n\n📦 ${params.cartItems}\n💰 *Cart Total:* ₹${params.cartTotal}\n\nComplete your order now and get *FREE shipping* on orders above ₹499! 🚚\n\n👉 Shop now: www.foodondoor.com\n\nOffer valid for limited time! ⏰`;

  let result: SendResult = { success: false };

  // 1) Try approved template first (works outside 24h window)
  try {
    const templateResult = await sendTemplateMessage({
      phone: params.phone,
      templateName: "abandoned_cart_recovery",
      languageCode: "en",
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: params.customerName || "there" },
            { type: "text", text: `Rs.${params.cartTotal}` },
          ],
        },
      ],
    });
    if (templateResult.success) result = templateResult;
  } catch {
    // Template not approved yet
  }

  // 2) Fallback: Plain text (only works within 24h window)
  if (!result.success) {
    result = await sendTextMessage(params.phone, message);
  }

  await logWhatsAppMessage({
    phone: params.phone,
    customerName: params.customerName,
    messageType: "abandoned_cart",
    templateName: "abandoned_cart_recovery",
    messageContent: message,
    status: result.success ? "sent" : "failed",
    metaMessageId: result.messageId,
    errorMessage: result.error,
  });
  await saveOutgoingToLiveChat({
    phone: params.phone,
    customerName: params.customerName,
    content: message,
    messageType: "abandoned_cart",
    metaMessageId: result.messageId,
    status: result.success ? "sent" : "failed",
  });

  return result;
}

/**
 * Send a promotional broadcast message to a customer (plain text/image fallback)
 */
export async function sendPromoMessage(params: {
  phone: string;
  customerName: string;
  message: string;
  campaignId: number;
  imageUrl?: string;
}): Promise<SendResult> {
  let result: SendResult;
  
  // If image is provided, send image message; otherwise send text
  if (params.imageUrl) {
    const safeImageUrl = getWhatsAppSafeImageUrl(params.imageUrl);
    result = await sendImageMessage({
      phone: params.phone,
      imageUrl: safeImageUrl,
      caption: params.message,
    });
  } else {
    result = await sendTextMessage(params.phone, params.message);
  }

  await logWhatsAppMessage({
    phone: params.phone,
    customerName: params.customerName,
    messageType: "campaign",
    messageContent: params.message,
    campaignId: params.campaignId,
    status: result.success ? "sent" : "failed",
    metaMessageId: result.messageId,
    errorMessage: result.error,
  });
  await saveOutgoingToLiveChat({
    phone: params.phone,
    customerName: params.customerName,
    content: params.message,
    messageType: "promotional",
    metaMessageId: result.messageId,
    status: result.success ? "sent" : "failed",
  });

  return result;
}

/**
 * Ensure an image URL is under WhatsApp's 5MB limit.
 * If the image is too large, download it, compress it as JPEG, re-upload to S3, and return the new URL.
 * This is called ONCE per campaign (not per recipient).
 */
export async function ensureImageUnder5MB(imageUrl: string): Promise<string> {
  const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5MB to be safe (WhatsApp limit is 5MB)
  
  try {
    // Check file size with HEAD request
    const headRes = await fetch(imageUrl, { method: 'HEAD' });
    const contentLength = parseInt(headRes.headers.get('content-length') || '0', 10);
    
    if (contentLength > 0 && contentLength <= MAX_SIZE) {
      console.log(`[WhatsApp] Image size OK: ${(contentLength / 1024 / 1024).toFixed(2)}MB`);
      return imageUrl; // Image is fine
    }
    
    if (contentLength === 0) {
      // Can't determine size, try to use it as-is
      return imageUrl;
    }
    
    console.log(`[WhatsApp] Image too large (${(contentLength / 1024 / 1024).toFixed(2)}MB), compressing...`);
    
    // Download the image
    const imgRes = await fetch(imageUrl);
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    
    // Use sharp to compress - convert to JPEG with quality reduction
    let compressedBuffer: Buffer;
    try {
      // @ts-ignore - dynamic import
      const sharpModule = await import('sharp');
      const sharpFn = sharpModule.default || sharpModule;
      compressedBuffer = await sharpFn(imgBuffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer();
      
      // If still too large, reduce quality further
      if (compressedBuffer.length > MAX_SIZE) {
        compressedBuffer = await sharpFn(imgBuffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 60 })
          .toBuffer();
      }
      if (compressedBuffer.length > MAX_SIZE) {
        compressedBuffer = await sharpFn(imgBuffer)
          .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 50 })
          .toBuffer();
      }
    } catch (sharpErr) {
      console.log('[WhatsApp] sharp not available, skipping compression');
      return imageUrl; // Can't compress, try original
    }
    
    console.log(`[WhatsApp] Compressed to ${(compressedBuffer.length / 1024 / 1024).toFixed(2)}MB`);
    
    // Upload compressed image to S3
    const { storagePut } = await import('./storage');
    const suffix = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const { url } = await storagePut(
      `whatsapp-campaigns/compressed-${suffix}.jpg`,
      compressedBuffer,
      'image/jpeg'
    );
    
    console.log(`[WhatsApp] Compressed image uploaded: ${url}`);
    return url;
  } catch (err: any) {
    console.error('[WhatsApp] Image compression failed:', err?.message);
    return imageUrl; // Return original on failure
  }
}

/**
 * Send a campaign message using an approved Meta template.
 * This sends proper template-based messages with image header + body text + CTA button.
 * Falls back to plain text/image if template send fails.
 */
export async function sendCampaignTemplateMessage(params: {
  phone: string;
  customerName: string;
  templateName: string;
  templateTitle: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  campaignId: number;
}): Promise<SendResult> {
  let result: SendResult = { success: false };

  // 1) Try sending as approved Meta template (works outside 24h window)
  try {
    const components: any[] = [];

    // Header with image — upload to Meta media first so the full product is visible
    // (raw URLs get auto-cropped by WhatsApp's 1.91:1 header display)
    if (params.imageUrl) {
      const mediaId = await uploadHeroImage(params.imageUrl);
      components.push({
        type: "header",
        parameters: [
          mediaId
            ? { type: "image", image: { id: mediaId } }
            : { type: "image", image: { link: getWhatsAppSafeImageUrl(params.imageUrl) } },
        ],
      });
    }

    // Body parameters (if template has variables like {{1}})
    // For marketing templates, body is usually static text set during template creation
    // No body parameters needed unless template has {{1}}, {{2}} etc.

    const templateResult = await sendTemplateMessage({
      phone: params.phone,
      templateName: params.templateName,
      languageCode: "en_US",
      components,
    });

    if (templateResult.success) {
      result = templateResult;
      console.log(`[WhatsApp Campaign] Template "${params.templateName}" sent to ${params.phone}`);
    } else {
      console.log(`[WhatsApp Campaign] Template send failed for ${params.phone}: ${templateResult.error}`);
      // Try with language code "en" as fallback
      const retryResult = await sendTemplateMessage({
        phone: params.phone,
        templateName: params.templateName,
        languageCode: "en",
        components,
      });
      if (retryResult.success) {
        result = retryResult;
        console.log(`[WhatsApp Campaign] Template "${params.templateName}" sent with lang=en to ${params.phone}`);
      } else {
        console.log(`[WhatsApp Campaign] Template retry also failed: ${retryResult.error}`);
      }
    }
  } catch (err: any) {
    console.log(`[WhatsApp Campaign] Template exception for ${params.phone}: ${err?.message}`);
  }

  // 2) Fallback: Send as image+caption (only works within 24h window)
  if (!result.success && params.imageUrl) {
    try {
      const caption = `${params.templateTitle}${params.buttonUrl ? `\n\n\ud83d\udc49 ${params.buttonUrl}` : ''}`;
      const imgResult = await sendImageMessage({
        phone: params.phone,
        imageUrl: getWhatsAppSafeImageUrl(params.imageUrl),
        caption,
      });
      if (imgResult.success) {
        result = imgResult;
        console.log(`[WhatsApp Campaign] Image fallback sent to ${params.phone}`);
      }
    } catch (err: any) {
      console.log(`[WhatsApp Campaign] Image fallback failed: ${err?.message}`);
    }
  }

  // 3) Final fallback: Plain text with link (only works within 24h window)
  if (!result.success) {
    const textMsg = `${params.templateTitle}${params.buttonUrl ? `\n\n${params.buttonText || 'Shop Now'}: ${params.buttonUrl}` : ''}`;
    result = await sendTextMessage(params.phone, textMsg);
    if (result.success) {
      console.log(`[WhatsApp Campaign] Text fallback sent to ${params.phone}`);
    }
  }

  // Log the message
  await logWhatsAppMessage({
    phone: params.phone,
    customerName: params.customerName,
    messageType: "campaign",
    templateName: params.templateName,
    messageContent: params.templateTitle,
    campaignId: params.campaignId,
    status: result.success ? "sent" : "failed",
    metaMessageId: result.messageId,
    errorMessage: result.error,
  });
  await saveOutgoingToLiveChat({
    phone: params.phone,
    customerName: params.customerName,
    content: params.templateTitle,
    messageType: "template",
    metaMessageId: result.messageId,
    status: result.success ? "sent" : "failed",
    mediaUrl: params.imageUrl || undefined,
    buttonText: params.buttonText || undefined,
    buttonUrl: params.buttonUrl || undefined,
  });

  return result;
}

const HERO_TEMPLATE = "nutriwow_product_hero";

/**
 * Hero image for single-image product messages: place the WHOLE product on a clean
 * 1200×628 landscape canvas (1.91:1 — the ratio WhatsApp uses to display template
 * header images). fit: contain ensures the full product is visible with white padding,
 * nothing gets cropped. Convert to JPEG (WhatsApp headers reject webp), upload to
 * the phone number's /media, return the media id.
 * Returns null on any failure so the caller can fall back to the raw URL.
 */
async function uploadHeroImage(imageUrl: string): Promise<string | null> {
  try {
    if (!imageUrl) return null;
    const safeUrl = getWhatsAppSafeImageUrl(imageUrl);
    console.log(`[WhatsApp] uploadHeroImage: fetching ${safeUrl}`);
    const resp = await fetch(safeUrl);
    if (!resp.ok) {
      console.warn(`[WhatsApp] uploadHeroImage: fetch failed ${resp.status} for ${safeUrl}`);
      return null;
    }
    let buf: any = Buffer.from(await resp.arrayBuffer());
    try {
      const sharp = (await import("sharp")).default;
      buf = await sharp(buf)
        .resize(1200, 628, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (e) {
      // sharp unavailable — upload original bytes as-is
      console.warn("[WhatsApp] uploadHeroImage: sharp resize failed, using raw bytes", e);
    }
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", "image/jpeg");
    form.append("file", new Blob([buf], { type: "image/jpeg" }), "hero.jpg");
    const r = await fetch(`${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getAccessToken()}` },
      body: form as any,
    });
    const d = await r.json() as any;
    if (!d?.id) console.warn("[WhatsApp] uploadHeroImage: media upload returned no ID", d);
    return d?.id || null;
  } catch (e) {
    console.error("[WhatsApp] uploadHeroImage failed:", e);
    return null;
  }
}

const CAROUSEL_TEMPLATE = "nutriwow_bestsellers";

// Compose Tata-style "designed" carousel cards once per product (cached), so a campaign
// builds each card a single time instead of per recipient.
const _carouselCardCache = new Map<string, string>();
// (Carousel cards are now plain product photos — the old SVG text/price helpers were removed.)

/**
 * Carousel card image: product photo placed on a clean 1125×600 white canvas
 * (1.91:1 WhatsApp carousel frame). fit: contain ensures the full product is
 * visible — no cropping. The template card body below shows name + price.
 * Returns the uploaded media id (cached per product within the instance).
 */
async function composeCarouselCard(product: WhatsAppCampaignProduct): Promise<string | null> {
  const key = `card:${product.id}`;
  const cached = _carouselCardCache.get(key);
  if (cached) return cached;
  try {
    let buf: any;
    try {
      const sharp = (await import("sharp")).default;
      const safeUrl = getWhatsAppSafeImageUrl(product.imageUrl);
      const resp = await fetch(safeUrl);
      const src = Buffer.from(await resp.arrayBuffer());
      buf = await sharp(src)
        .resize(1125, 600, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 90 }).toBuffer();
    } catch (e) {
      // sharp/compose unavailable — fall back to the raw product image bytes
      console.warn("[WhatsApp] composeCarouselCard: sharp failed, using raw image", e);
      const resp = await fetch(getWhatsAppSafeImageUrl(product.imageUrl));
      buf = Buffer.from(await resp.arrayBuffer());
    }
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", "image/jpeg");
    form.append("file", new Blob([buf], { type: "image/jpeg" }), "card.jpg");
    const r = await fetch(`${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getAccessToken()}` },
      body: form as any,
    });
    const d = await r.json() as any;
    if (d?.id) { _carouselCardCache.set(key, d.id); return d.id as string; }
    return null;
  } catch {
    return null;
  }
}

/**
 * Send all products in ONE swipeable carousel message (nutriwow_bestsellers, 10 cards).
 * The template is fixed at 10 cards, so if fewer products are selected we cycle through
 * them to fill the 10 slots (WhatsApp rejects a carousel with fewer cards than the template).
 */
async function sendProductCarousel(
  params: { phone: string; customerName: string; campaignId: number; buttonText?: string; payload: WhatsAppProductCampaignPayload },
  products: WhatsAppCampaignProduct[],
): Promise<SendResult> {
  const CARD_COUNT = 10;
  const filled = Array.from({ length: CARD_COUNT }, (_, i) => products[i % products.length]);
  const mediaIds = await Promise.all(filled.map((p) => composeCarouselCard(p)));

  const cards = filled.map((product, cardIndex) => {
    const disc = (product.originalPrice && product.originalPrice > product.price)
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;
    const priceText = disc > 0
      ? `*₹${product.price}* ~₹${product.originalPrice}~ ${disc}% off`
      : `*₹${product.price}*`;
    const cardTitle = product.name
      .replace(/^Foodondoor\s+/i, "")
      .replace(/\s*\|.*$/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 28);
    return {
      card_index: cardIndex,
      components: [
        {
          type: "header",
          parameters: [
            mediaIds[cardIndex]
              ? { type: "image", image: { id: mediaIds[cardIndex] } }
              : { type: "image", image: { link: getWhatsAppSafeImageUrl(product.imageUrl) } },
          ],
        },
        { type: "body", parameters: [
          { type: "text", text: cardTitle },
          { type: "text", text: priceText },
        ] },
        { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: product.handle }] },
      ],
    };
  });

  let res: SendResult;
  try {
    res = await sendTemplateMessage({
      phone: params.phone,
      templateName: CAROUSEL_TEMPLATE,
      languageCode: "en_US",
      components: [{ type: "carousel", cards }],
    });
  } catch (err: any) {
    res = { success: false, error: err?.message || "carousel send failed" };
  }

  const content = productCampaignText(params.payload);
  await logWhatsAppMessage({
    phone: params.phone,
    customerName: params.customerName,
    messageType: "campaign",
    templateName: CAROUSEL_TEMPLATE,
    messageContent: content,
    campaignId: params.campaignId,
    status: res.success ? "sent" : "failed",
    metaMessageId: res.messageId,
    errorMessage: res.error,
  });
  await saveOutgoingToLiveChat({
    phone: params.phone,
    customerName: params.customerName,
    content,
    messageType: "template",
    metaMessageId: res.messageId,
    status: res.success ? "sent" : "failed",
    mediaUrl: products[0]?.imageUrl || undefined,
    buttonText: params.buttonText || "Shop now",
    buttonUrl: BASE_URL,
  });
  return res;
}

/**
 * Send Tata-style Meta catalog product cards in one message.
 *
 * This uses WhatsApp interactive MPM/product_list, so WhatsApp renders the live
 * catalog price, View button, and cart affordances from Commerce Manager. It is
 * excellent for warm conversations, but Meta only delivers free-form interactive
 * product messages inside the 24h customer-service window. Cold broadcasts still
 * need an approved MARKETING MPM template.
 */
async function sendProductCatalogList(
  params: { phone: string; customerName: string; campaignId: number; buttonText?: string; payload: WhatsAppProductCampaignPayload },
  products: WhatsAppCampaignProduct[],
): Promise<SendResult> {
  const cleanPhone = params.phone.replace(/\D/g, "");
  const phoneWithCountry = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
  const productItems = products.slice(0, 10).map((product) => ({
    product_retailer_id: String(product.id),
  }));
  const headerText = (params.payload.headline || "Foodondoor Picks").replace(/\s+/g, " ").trim().slice(0, 60);
  const bodyText = (params.payload.body || "Handpicked Foodondoor products for you.").replace(/\s+/g, " ").trim().slice(0, 1024);
  const buttonText = (params.buttonText || "View products").replace(/\s+/g, " ").trim().slice(0, 20);

  let res: SendResult;
  try {
    const response = await fetch(`${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneWithCountry,
        type: "interactive",
        interactive: {
          type: "product_list",
          header: { type: "text", text: headerText },
          body: { text: bodyText },
          footer: { text: "Foodondoor" },
          action: {
            catalog_id: WHATSAPP_CATALOG_ID,
            button: buttonText,
            sections: [
              {
                title: "Foodondoor Picks",
                product_items: productItems,
              },
            ],
          },
        },
      }),
    });
    const data = await response.json() as any;
    res = response.ok
      ? { success: true, messageId: data?.messages?.[0]?.id }
      : { success: false, error: data?.error?.message || "catalog product list send failed" };
  } catch (err: any) {
    res = { success: false, error: err?.message || "catalog product list send failed" };
  }

  const content = productCampaignText(params.payload);
  await logWhatsAppMessage({
    phone: params.phone,
    customerName: params.customerName,
    messageType: "campaign",
    templateName: "catalog_product_list",
    messageContent: content,
    campaignId: params.campaignId,
    status: res.success ? "sent" : "failed",
    metaMessageId: res.messageId,
    errorMessage: res.error,
  });
  await saveOutgoingToLiveChat({
    phone: params.phone,
    customerName: params.customerName,
    content,
    messageType: "interactive",
    metaMessageId: res.messageId,
    status: res.success ? "sent" : "failed",
    mediaUrl: products[0]?.imageUrl || undefined,
    buttonText,
    buttonUrl: BASE_URL,
  });
  return res;
}

export async function sendProductCampaignMessage(params: {
  phone: string;
  customerName: string;
  templateName: string;
  payload: WhatsAppProductCampaignPayload;
  campaignId: number;
  buttonText?: string;
}): Promise<SendResult> {
  const products = params.payload.products.slice(0, 10);

  // No products → just send the campaign text.
  if (products.length === 0) {
    return sendTextMessage(params.phone, productCampaignText(params.payload));
  }

  // Carousel mode: one swipeable message with all products (smaller cards).
  if (params.payload.format === "carousel") {
    return sendProductCarousel(params, products);
  }

  // Catalog mode: Meta renders native product cards with live catalog price,
  // View, and cart controls. Works only inside the 24h customer-service window
  // until an MPM marketing template is approved.
  if (params.payload.format === "catalog") {
    return sendProductCatalogList(params, products);
  }

  // Default = hero mode. Send EACH product as its own big single-image template message
  // (nutriwow_product_hero): full 1080² product image + bold name/offer + a Shop Now
  // button that opens the product page. The owner preferred this big hero look over
  // WhatsApp's small fixed-size carousel cards, so a product campaign now fans out to
  // one hero message per selected product.
  // Uses approved template with product image + product name only (no auto-generated
  // price/discount text — owner writes their own marketing content separately).
  // Template required for delivery outside 24h customer-service window.
  let anySuccess = false;
  let firstMessageId: string | undefined;
  let lastError: string | undefined;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const safeImageUrl = getWhatsAppSafeImageUrl(product.imageUrl);
    const disc = (product.originalPrice && product.originalPrice > product.price)
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;
    const bodyText = disc > 0
      ? `*${product.name}* — Now *₹${product.price}* ~₹${product.originalPrice}~ ${disc}% off`
      : `*${product.name}* — *₹${product.price}*`;

    const mediaId = await uploadHeroImage(product.imageUrl);
    console.log(`[WhatsApp] Hero #${i}: "${product.name}" mediaId=${mediaId || "NONE"} imageUrl=${safeImageUrl}`);

    const components = [
      {
        type: "header",
        parameters: [
          mediaId
            ? { type: "image", image: { id: mediaId } }
            : { type: "image", image: { link: safeImageUrl } },
        ],
      },
      { type: "body", parameters: [{ type: "text", text: bodyText }] },
      { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: product.handle }] },
    ];

    let res: SendResult;
    try {
      res = await sendTemplateMessage({
        phone: params.phone,
        templateName: HERO_TEMPLATE,
        languageCode: "en_US",
        components,
      });
    } catch (err: any) {
      res = { success: false, error: err?.message || "hero send failed" };
    }

    if (res.success) {
      anySuccess = true;
      if (!firstMessageId) firstMessageId = res.messageId;
    } else {
      lastError = res.error;
    }

    await logWhatsAppMessage({
      phone: params.phone,
      customerName: params.customerName,
      messageType: "campaign",
      templateName: HERO_TEMPLATE,
      messageContent: bodyText,
      campaignId: params.campaignId,
      status: res.success ? "sent" : "failed",
      metaMessageId: res.messageId,
      errorMessage: res.error,
    });
    await saveOutgoingToLiveChat({
      phone: params.phone,
      customerName: params.customerName,
      content: bodyText,
      messageType: "template",
      metaMessageId: res.messageId,
      status: res.success ? "sent" : "failed",
      mediaUrl: product.imageUrl || undefined,
      buttonText: params.buttonText || "Shop now",
      buttonUrl: `${BASE_URL}/products/${product.handle}`,
    });

    // Small gap between hero messages to the same recipient (ordering + rate limits).
    if (i < products.length - 1) await new Promise((r) => setTimeout(r, 250));
  }

  return { success: anySuccess, messageId: firstMessageId, error: anySuccess ? undefined : lastError };
}

// ─── Image Message ──────────────────────────────────────────────────────────────

/**
 * Resize a Shopify CDN image URL to fit within WhatsApp's 5MB limit.
 * Shopify CDN supports _WIDTHxHEIGHT suffix before the extension.
 * For non-Shopify URLs, returns the original URL unchanged.
 */
function getWhatsAppSafeImageUrl(imageUrl: string): string {
  if (!imageUrl) return imageUrl;

  // Vercel Image Optimization proxy — extract original URL
  if (imageUrl.includes("/_vercel/image")) {
    try {
      const u = new URL(imageUrl, "https://www.foodondoor.com");
      const original = u.searchParams.get("url");
      if (original) return original;
    } catch {}
  }

  // Relative URLs — make absolute (Vercel Blob URLs should already be absolute)
  if (imageUrl.startsWith("/")) {
    return `https://www.foodondoor.com${imageUrl}`;
  }

  // Shopify CDN pattern: ...filename.ext?v=...
  // Insert _500x500 before the extension
  if (imageUrl.includes("cdn.shopify.com")) {
    const match = imageUrl.match(/^(.*?)(\.(png|jpg|jpeg|webp|gif))(\?.*)?$/i);
    if (match) {
      if (/_\d+x\d+$/.test(match[1])) return imageUrl;
      return `${match[1]}_500x500${match[2]}${match[4] || ""}`;
    }
  }

  return imageUrl;
}

/**
 * Send an image message via WhatsApp (within 24h window).
 * Automatically resizes Shopify CDN images to stay under WhatsApp's 5MB limit.
 */
export async function sendImageMessage(params: {
  phone: string;
  imageUrl: string;
  caption?: string;
}): Promise<SendResult> {
  const cleanPhone = params.phone.replace(/\D/g, "");
  const phoneWithCountry = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
  try {
    const response = await fetch(`${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneWithCountry,
        type: "image",
        image: {
          link: getWhatsAppSafeImageUrl(params.imageUrl),
          caption: params.caption || "",
        },
      }),
    });
    const data = await response.json() as any;
    if (!response.ok) return { success: false, error: data?.error?.message || "Unknown error" };
    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error" };
  }
}

// ─── Chatbot Auto-Reply ───────────────────────────────────────────────────────

/**
 * Send chatbot menu with interactive buttons.
 * Strategy: Template first (chatbot_welcome with quick reply buttons) → Interactive fallback → Plain text
 */
export async function sendChatbotMenu(params: {
  phone: string;
  greeting?: string;
}): Promise<SendResult> {
  const cleanPhone = params.phone.replace(/\D/g, "");
  const phoneWithCountry = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
  const bodyText = params.greeting ||
    `Namaste! 👋 *Foodondoor* mein aapka swagat hai! 🌿\n\nHum kaise madad kar sakte hain? Neeche se option choose karein:`;

  let result: SendResult = { success: false };

  const saveBotReply = (content: string, msgId?: string) => {
    saveOutgoingToLiveChat({
      phone: phoneWithCountry, content: `🤖 ${content}`,
      messageType: "text", metaMessageId: msgId, status: "sent",
    }).catch(() => {});
  };

  // 1) Try chatbot_welcome template ONLY when no custom greeting (i.e., fresh welcome, not a keyword response)
  if (!params.greeting) {
    try {
      const templateResult = await sendTemplateMessage({
        phone: params.phone,
        templateName: "chatbot_welcome",
        languageCode: "en",
        components: [],
      });
      if (templateResult.success) {
        saveBotReply(bodyText, templateResult.messageId);
        return templateResult;
      }
    } catch {}
  }

  // 2) Fallback: Interactive message (within 24h window)
  try {
    const response = await fetch(`${WHATSAPP_API_BASE}/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneWithCountry,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: bodyText },
          action: {
            buttons: [
              { type: "reply", reply: { id: "bot_track", title: "📦 Track Order" } },
              { type: "reply", reply: { id: "bot_support", title: "🙋 Talk to Support" } },
              { type: "reply", reply: { id: "bot_offers", title: "🎁 Offers & Deals" } },
            ],
          },
        },
      }),
    });
    const data = await response.json() as any;
    if (response.ok) {
      const msgId = data?.messages?.[0]?.id;
      saveBotReply(bodyText, msgId);
      return { success: true, messageId: msgId };
    }
    // 3) Fallback: Plain text
    const fallback = `${bodyText}\n\n📦 Track Order: www.foodondoor.com/track-order\n🙋 Support: +91 92431 77706\n🎁 Offers: www.foodondoor.com`;
    const r = await sendTextMessage(params.phone, fallback);
    saveBotReply(fallback, r.messageId);
    return r;
  } catch {
    const fallback = `${bodyText}\n\n📦 Track Order: www.foodondoor.com/track-order\n🙋 Support: +91 92431 77706`;
    const r = await sendTextMessage(params.phone, fallback);
    saveBotReply(fallback, r.messageId);
    return r;
  }
}

/**
 * Handle chatbot button reply (when user clicks a bot menu button).
 * Strategy: Template first → Plain text fallback for each reply type
 */
export async function handleChatbotReply(params: {
  phone: string;
  buttonId: string;
  customerName?: string;
}): Promise<void> {
  const { phone, buttonId, customerName } = params;

  const sendAndSave = async (text: string, templateName?: string) => {
    let sent = false;
    let msgId: string | undefined;
    if (templateName) {
      try {
        const r = await sendTemplateMessage({ phone, templateName, languageCode: "en", components: [] });
        if (r.success) { sent = true; msgId = r.messageId; }
      } catch {}
    }
    if (!sent) {
      const r = await sendTextMessage(phone, text);
      msgId = r.messageId;
    }
    saveOutgoingToLiveChat({
      phone, customerName, content: `🤖 ${text}`,
      messageType: "text", metaMessageId: msgId, status: "sent",
    }).catch(() => {});
  };

  if (buttonId === "bot_track" || buttonId === "Track Order") {
    try {
      const recentOrders = await getOrdersByPhone(phone);
      if (recentOrders.length > 0) {
        const orderLines = recentOrders.slice(0, 3).map((o) => {
          const statusEmoji: Record<string, string> = {
            placed: "🟡", processing: "🔵", shipped: "🚚", delivered: "✅", cancelled: "❌",
          };
          const emoji = statusEmoji[o.status] || "⚪";
          let line = `${emoji} *#${o.id}* — ${o.status.toUpperCase()} — ₹${o.total}`;
          if (o.status === "shipped" && o.trackingUrl) {
            line += `\n   🔗 Track: ${o.trackingUrl}`;
          } else if (o.status === "shipped" && o.awbCode) {
            line += `\n   📋 AWB: ${o.awbCode}`;
          }
          return line;
        });
        const trackMsg = `📦 *Aapke Recent Orders:*\n\n${orderLines.join("\n\n")}\n\n👉 Full details: www.foodondoor.com/track-order`;
        await sendAndSave(trackMsg);
      } else {
        const noOrderText = `📦 *Order Track*\n\nIs phone number se koi order nahi mila.\n\nAgar aapne dusre number se order kiya hai toh woh Order ID yahan type karein, ya website pe track karein:\n👉 www.foodondoor.com/track-order`;
        await sendAndSave(noOrderText);
      }
    } catch (err) {
      console.error("[WhatsApp] bot_track auto-lookup failed:", err);
      await sendAndSave(`📦 *Order Track Karein*\n\nApna Order ID enter karein ya yahan track karein:\n👉 www.foodondoor.com/track-order`, "chatbot_track_order");
    }

  } else if (buttonId === "bot_support" || buttonId === "Talk to Support") {
    const supportText = `🙋 *Foodondoor Support Team*\n\nOur team is ready to help you!\n\n📞 *Direct Call:* +91 92431 77706\n💬 *WhatsApp:* wa.me/919243177706\n📧 *Email:* wecare@foodondoor.com\n⏰ *Timing:* Mon-Sat, 10 AM - 7 PM\n\nType your issue here and we'll respond shortly. 🌿`;
    await sendAndSave(supportText);

  } else if (buttonId === "bot_offers" || buttonId === "Offers and Deals") {
    const offersText = `🎁 *Current Offers*\n\n✨ *SUPERSAVER10* — 10% OFF on all orders\n🚚 FREE Shipping on orders above ₹499\n🌰 Buy 2 Get 1 FREE on selected combos\n\n👉 Shop now: www.foodondoor.com\n\nAur offers ke liye subscribe karein! 💚`;
    await sendAndSave(offersText, "chatbot_offers");
  }
}

// ─── Live Chat: Save Outgoing Messages ───────────────────────────────────────

/**
 * Upsert conversation and save outgoing message to whatsappMessages table
 * so it appears in the Admin Live Chat tab.
 */
async function saveOutgoingToLiveChat(params: {
  phone: string;
  customerName?: string;
  content: string;
  messageType: string;
  metaMessageId?: string;
  status: string;
  mediaUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    // Normalize phone: always use 91XXXXXXXXXX format
    const rawPhone = params.phone.replace(/\D/g, "");
    const normalizedPhone = rawPhone.startsWith("91") ? rawPhone : `91${rawPhone}`;
    // Find or create conversation
    const existing = await db.select().from(whatsappConversations)
      .where(eq(whatsappConversations.phone, normalizedPhone)).limit(1);
    let conversationId: number;
    if (existing.length > 0) {
      conversationId = existing[0].id;
      await db.update(whatsappConversations).set({
        lastMessage: params.content,
        lastMessageAt: new Date(),
        customerName: params.customerName || existing[0].customerName,
        status: "active",
      }).where(eq(whatsappConversations.id, conversationId));
    } else {
      await db.insert(whatsappConversations).values({
        phone: normalizedPhone,
        customerName: params.customerName || null,
        lastMessage: params.content,
        lastMessageAt: new Date(),
        unreadCount: 0,
        status: "active",
      });
      // Re-fetch to get correct ID (TiDB insertId can be unreliable)
      const inserted = await db.select().from(whatsappConversations)
        .where(eq(whatsappConversations.phone, normalizedPhone)).limit(1);
      conversationId = inserted[0].id;
    }
    // Save message
    await db.insert(whatsappMessages).values({
      conversationId,
      phone: normalizedPhone,
      direction: "outgoing",
      messageType: params.messageType,
      content: params.content,
      mediaUrl: params.mediaUrl || null,
      buttonText: params.buttonText || null,
      buttonUrl: params.buttonUrl || null,
      metaMessageId: params.metaMessageId || null,
      status: params.status,
    });
  } catch (err) {
    console.error("[WhatsApp] Failed to save outgoing to live chat:", err);
  }
}

// ─── Logging ──────────────────────────────────────────────────────────────────

async function logWhatsAppMessage(params: {
  phone: string;
  customerName?: string;
  messageType: string;
  templateName?: string;
  messageContent?: string;
  orderId?: string;
  campaignId?: number;
  status: string;
  metaMessageId?: string;
  errorMessage?: string;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(whatsappLogs).values({
      phone: params.phone,
      customerName: params.customerName,
      messageType: params.messageType,
      templateName: params.templateName,
      messageContent: params.messageContent,
      orderId: params.orderId,
      campaignId: params.campaignId,
      status: params.status,
      metaMessageId: params.metaMessageId,
      errorMessage: params.errorMessage,
    });
  } catch (err) {
    console.error("[WhatsApp] Failed to log message:", err);
  }
}

// ─── DB Query Helpers ─────────────────────────────────────────────────────────

export async function getWhatsAppLogs(limit = 100, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  if (startDate) {
    conditions.push(gte(whatsappLogs.sentAt, new Date(startDate)));
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(whatsappLogs.sentAt, end));
  }
  
  if (conditions.length > 0) {
    return db.select().from(whatsappLogs)
      .where(and(...conditions))
      .orderBy(desc(whatsappLogs.sentAt))
      .limit(limit);
  }
  return db.select().from(whatsappLogs).orderBy(desc(whatsappLogs.sentAt)).limit(limit);
}

export async function getWhatsAppCampaigns() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(whatsappCampaigns).orderBy(desc(whatsappCampaigns.createdAt));
}

export async function createCampaign(params: {
  name: string;
  message: string;
  targetSegment: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(whatsappCampaigns).values({
    name: params.name,
    message: params.message,
    targetSegment: params.targetSegment,
    status: "draft",
  });
  return result;
}

export async function updateCampaignStats(campaignId: number, stats: {
  totalSent?: number;
  totalDelivered?: number;
  totalFailed?: number;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(whatsappCampaigns)
    .set({
      ...stats,
      ...(stats.status === "completed" ? { sentAt: new Date() } : {}),
    })
    .where(eq(whatsappCampaigns.id, campaignId));
}


// ─── Meta Template Management ─────────────────────────────────────────────────

const WABA_ID = process.env.WHATSAPP_WABA_ID || "718666704638313";

/**
 * Upload an image to Meta's Resumable Upload API and return the header_handle.
 * Meta requires this handle (not a URL) when creating image templates.
 * Process: 1) Create upload session 2) Upload file bytes 3) Get handle
 */
async function uploadImageToMeta(imageUrl: string, token: string): Promise<string | null> {
  try {
    // Fetch image bytes (supports both http URLs and S3 URLs)
    let imageBuffer: Buffer;
    let mimeType = 'image/jpeg';
    let fileSize: number;

    if (imageUrl.startsWith('data:')) {
      // base64 data URL
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) throw new Error('Invalid base64 image');
      mimeType = matches[1];
      imageBuffer = Buffer.from(matches[2], 'base64');
    } else {
      // Remote URL - fetch it
      const resp = await fetch(imageUrl);
      if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
      const contentType = resp.headers.get('content-type');
      if (contentType) mimeType = contentType.split(';')[0].trim();
      imageBuffer = Buffer.from(await resp.arrayBuffer());
    }
    fileSize = imageBuffer.length;

    // Step 1: Create upload session
    const sessionResp = await fetch(
      `https://graph.facebook.com/v25.0/app/uploads?file_length=${fileSize}&file_type=${encodeURIComponent(mimeType)}&access_token=${token}`,
      { method: 'POST' }
    );
    const sessionData = await sessionResp.json() as any;
    if (!sessionResp.ok || !sessionData.id) {
      console.error('Meta upload session error:', sessionData);
      return null;
    }
    const uploadSessionId = sessionData.id;

    // Step 2: Upload file bytes
    const uploadResp = await fetch(
      `https://graph.facebook.com/v25.0/${uploadSessionId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `OAuth ${token}`,
          'file_offset': '0',
          'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(imageBuffer),
      }
    );
    const uploadData = await uploadResp.json() as any;
    if (!uploadResp.ok || !uploadData.h) {
      console.error('Meta upload error:', uploadData);
      return null;
    }

    return uploadData.h as string;
  } catch (err) {
    console.error('uploadImageToMeta error:', err);
    return null;
  }
}

/**
 * Submit a promotional template to Meta for approval
 * Templates must be approved before they can be used for broadcasting
 */
export async function submitTemplateToMeta(templateData: {
  name: string;
  title: string;
  buttonText: string;
  buttonUrl: string;
  imageUrl?: string;
}): Promise<{ success: boolean; metaTemplateId?: string; error?: string }> {
  const token = getAccessToken();
  if (!token) {
    return { success: false, error: "WHATSAPP_TOKEN not configured" };
  }

  try {
    // Build template components for Meta API
    const components: any[] = [];

    // Header component (with image if provided)
    if (templateData.imageUrl) {
      // Meta requires a special "header_handle" from their Resumable Upload API.
      // We cannot pass a direct URL. Instead, upload to Meta's upload API to get a handle.
      let metaHandle: string | null = null;
      try {
        metaHandle = await uploadImageToMeta(templateData.imageUrl, token);
      } catch (err) {
        console.error('Failed to upload image to Meta, submitting without image header:', err);
      }

      if (metaHandle) {
        components.push({
          type: "HEADER",
          format: "IMAGE",
          example: {
            header_handle: [metaHandle],
          },
        });
      }
      // If upload failed, skip image header - Meta will still accept text-only template
    }

    // Body component (offer text)
    components.push({
      type: "BODY",
      text: templateData.title,
    });

    // Footer component (optional)
    components.push({
      type: "FOOTER",
      text: "Foodondoor - Premium Dry Fruits & Healthy Snacks",
    });

    // Buttons component (CTA button)
    components.push({
      type: "BUTTONS",
      buttons: [
        {
          type: "URL",
          text: templateData.buttonText,
          url: templateData.buttonUrl,
        },
      ],
    });

    // Submit to Meta
    const WABA_ID = process.env.WHATSAPP_WABA_ID || "718666704638313";
    const response = await fetch(
      `${WHATSAPP_API_BASE}/${WABA_ID}/message_templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: templateData.name.toLowerCase().replace(/\s+/g, "_"),
          language: "en_US",
          category: "MARKETING",
          components,
        }),
      }
    );

    const data = (await response.json()) as any;

    if (!response.ok) {
      return {
        success: false,
        error: data?.error?.message || "Template submission failed",
      };
    }

    return {
      success: true,
      metaTemplateId: data?.id,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error" };
  }
}

export async function submitUtilityTemplate(params: {
  name: string;
  bodyText: string;
  category?: string;
  footerText?: string;
  buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
}): Promise<{ success: boolean; metaTemplateId?: string; error?: string }> {
  const token = getAccessToken();
  if (!token) return { success: false, error: "WHATSAPP_TOKEN not configured" };
  try {
    const components: any[] = [{ type: "BODY", text: params.bodyText }];
    if (params.footerText) components.push({ type: "FOOTER", text: params.footerText });
    if (params.buttons?.length) {
      components.push({
        type: "BUTTONS",
        buttons: params.buttons.map(b => {
          if (b.type === "PHONE_NUMBER") return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone_number };
          if (b.type === "URL") return { type: "URL", text: b.text, url: b.url };
          return { type: "QUICK_REPLY", text: b.text };
        }),
      });
    }
    const WABA_ID = process.env.WHATSAPP_WABA_ID || "718666704638313";
    const res = await fetch(`${WHATSAPP_API_BASE}/${WABA_ID}/message_templates`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: params.name.toLowerCase().replace(/\s+/g, "_"),
        language: "en_US",
        category: params.category || "UTILITY",
        components,
      }),
    });
    const data = await res.json() as any;
    if (!res.ok) return { success: false, error: data?.error?.message || `HTTP ${res.status}` };
    return { success: true, metaTemplateId: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || "Network error" };
  }
}

/**
 * Check template approval status from Meta
 */
export async function checkTemplateStatus(metaTemplateId: string): Promise<{
  status?: string;
  error?: string;
}> {
  const token = getAccessToken();
  if (!token) {
    return { error: "WHATSAPP_TOKEN not configured" };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_BASE}/${metaTemplateId}?fields=status,rejection_reason`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = (await response.json()) as any;

    if (!response.ok) {
      return { error: data?.error?.message || "Failed to check status" };
    }

    return {
      status: data?.status,
      error: data?.rejection_reason,
    };
  } catch (err: any) {
    return { error: err?.message || "Network error" };
  }
}


// ─── Template Management ──────────────────────────────────────────────────────

/**
 * Get template approval status from Meta API
 * Returns list of all templates and their approval status
 */
export async function getTemplateStatus() {
  try {
    const WABA_ID = process.env.WHATSAPP_WABA_ID || "718666704638313";
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      return { success: false, error: "WhatsApp token not configured" };
    }

    const response = await fetch(
      `${WHATSAPP_API_BASE}/${WABA_ID}/message_templates?fields=id,name,status,category,language,components&limit=100`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || "Failed to fetch templates" };
    }

    const data = await response.json();
    return { success: true, templates: data.data || [] };
  } catch (error) {
    console.error("Error fetching template status:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Check if specific templates are approved
 */
export async function checkTemplateApproval(templateNames: string[]) {
  const result = await getTemplateStatus();
  
  if (!result.success) {
    return { success: false, error: result.error };
  }

  const templates = result.templates || [];
  const approvalStatus: Record<string, string> = {};

  for (const name of templateNames) {
    const template = templates.find((t: any) => t.name === name);
    approvalStatus[name] = template?.status || "NOT_FOUND";
  }

  return { success: true, approvalStatus };
}

export async function getWhatsAppLogsWithStats(limit = 500, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return { logs: [], stats: { sent: 0, delivered: 0, read: 0, failed: 0 } };
  
  const conditions = [];
  if (startDate) {
    conditions.push(gte(whatsappLogs.sentAt, new Date(startDate)));
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(whatsappLogs.sentAt, end));
  }
  
  // Build where clause
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  // Fetch logs with limit (for display)
  const logs = whereClause
    ? await db.select().from(whatsappLogs)
        .where(whereClause)
        .orderBy(desc(whatsappLogs.sentAt))
        .limit(limit)
    : await db.select().from(whatsappLogs)
        .orderBy(desc(whatsappLogs.sentAt))
        .limit(limit);
  
  // Calculate stats from ALL logs (without limit)
  const { sql, eq, count } = await import("drizzle-orm");
  
  const [sentResult] = await (whereClause
    ? db.select({ count: count() })
        .from(whatsappLogs)
        .where(and(whereClause, eq(whatsappLogs.status, "sent")))
    : db.select({ count: count() })
        .from(whatsappLogs)
        .where(eq(whatsappLogs.status, "sent")))
  
  const [deliveredResult] = await (whereClause
    ? db.select({ count: count() })
        .from(whatsappLogs)
        .where(and(whereClause, eq(whatsappLogs.status, "delivered")))
    : db.select({ count: count() })
        .from(whatsappLogs)
        .where(eq(whatsappLogs.status, "delivered")))
  
  const [readResult] = await (whereClause
    ? db.select({ count: count() })
        .from(whatsappLogs)
        .where(and(whereClause, eq(whatsappLogs.status, "read")))
    : db.select({ count: count() })
        .from(whatsappLogs)
        .where(eq(whatsappLogs.status, "read")))
  
  const [failedResult] = await (whereClause
    ? db.select({ count: count() })
        .from(whatsappLogs)
        .where(and(whereClause, eq(whatsappLogs.status, "failed")))
    : db.select({ count: count() })
        .from(whatsappLogs)
        .where(eq(whatsappLogs.status, "failed")))
  
  return {
    logs,
    stats: {
      sent: Number(sentResult?.count) || 0,
      delivered: Number(deliveredResult?.count) || 0,
      read: Number(readResult?.count) || 0,
      failed: Number(failedResult?.count) || 0,
    }
  };
}
