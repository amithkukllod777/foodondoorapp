/**
 * Facebook Conversions API (CAPI) Module
 * Server-side event tracking for better attribution and ad performance.
 * 
 * Events sent: Purchase, AddToCart, InitiateCheckout, ViewContent
 * Features: SHA256 user data hashing, event deduplication with event_id
 */

import { createHash } from "crypto";
import { ENV } from "./_core/env";
import { getStoreSetting } from "./db";

const API_VERSION = "v21.0";

async function getPixelConfig(): Promise<{ pixelId: string; token: string } | null> {
  const token = ENV.fbConversionsApiToken;
  // Try DB integrations settings first, fall back to env
  let pixelId = process.env.META_PIXEL_ID ?? "";
  let capiToken = token;
  try {
    const raw = await getStoreSetting("integrations");
    const settings = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (settings && typeof settings === "object") {
      if (settings.meta_pixel_id) pixelId = settings.meta_pixel_id;
      if (settings.fb_capi_token) capiToken = settings.fb_capi_token;
    }
  } catch {}
  if (!capiToken) return null;
  if (!pixelId) return null;
  return { pixelId, token: capiToken };
}

/** SHA256 hash for user data (Meta requirement) */
function hashData(value: string | undefined | null): string | undefined {
  if (!value || !value.trim()) return undefined;
  const normalized = value.trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}

/** Normalize Indian phone number to E.164 format */
function normalizePhone(phone: string | undefined | null): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(1);
  return digits;
}

/** User data for matching (all hashed before sending) */
export interface CAPIUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbp?: string; // _fbp cookie value
  fbc?: string; // _fbc cookie value
}

/** Custom data for the event */
export interface CAPICustomData {
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentType?: string;
  contentName?: string;
  contentCategory?: string;
  numItems?: number;
  orderId?: string;
}

/** Supported event names */
export type CAPIEventName = "Purchase" | "AddToCart" | "InitiateCheckout" | "ViewContent" | "Search" | "Lead";

interface CAPIEvent {
  event_name: CAPIEventName;
  event_time: number;
  event_id: string;
  event_source_url?: string;
  action_source: "website";
  user_data: Record<string, string | undefined>;
  custom_data?: Record<string, unknown>;
}

/**
 * Send event to Facebook Conversions API
 * 
 * @param eventName - The event name (Purchase, AddToCart, etc.)
 * @param eventId - Unique event ID for deduplication with browser pixel
 * @param userData - User identifying data (will be hashed)
 * @param customData - Event-specific data (value, products, etc.)
 * @param sourceUrl - The page URL where the event occurred
 */
export async function sendCAPIEvent(
  eventName: CAPIEventName,
  eventId: string,
  userData: CAPIUserData,
  customData?: CAPICustomData,
  sourceUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const config = await getPixelConfig();
  if (!config) {
    console.warn("[FB CAPI] No pixel ID or access token configured, skipping event:", eventName);
    return { success: false, error: "No pixel ID or access token" };
  }
  const { pixelId, token } = config;
  const GRAPH_API_URL = `https://graph.facebook.com/${API_VERSION}/${pixelId}/events`;

  // Build user_data with hashed values
  const hashedUserData: Record<string, string | undefined> = {
    em: hashData(userData.email),
    ph: hashData(normalizePhone(userData.phone)),
    fn: hashData(userData.firstName),
    ln: hashData(userData.lastName),
    ct: hashData(userData.city),
    st: hashData(userData.state),
    zp: hashData(userData.zipCode),
    country: hashData(userData.country || "in"),
    client_ip_address: userData.clientIpAddress,
    client_user_agent: userData.clientUserAgent,
    fbp: userData.fbp,
    fbc: userData.fbc,
  };

  // Remove undefined values
  Object.keys(hashedUserData).forEach((key) => {
    if (hashedUserData[key] === undefined) {
      delete hashedUserData[key];
    }
  });

  // Build custom_data
  const customDataPayload: Record<string, unknown> = {};
  if (customData) {
    if (customData.value !== undefined) customDataPayload.value = customData.value;
    if (customData.currency) customDataPayload.currency = customData.currency;
    if (customData.contentIds && customData.contentIds.length > 0) {
      customDataPayload.content_ids = customData.contentIds;
    }
    if (customData.contentType) customDataPayload.content_type = customData.contentType;
    if (customData.contentName) customDataPayload.content_name = customData.contentName;
    if (customData.contentCategory) customDataPayload.content_category = customData.contentCategory;
    if (customData.numItems !== undefined) customDataPayload.num_items = customData.numItems;
    if (customData.orderId) customDataPayload.order_id = customData.orderId;
  }

  const event: CAPIEvent = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    user_data: hashedUserData,
  };

  if (sourceUrl) {
    event.event_source_url = sourceUrl;
  }

  if (Object.keys(customDataPayload).length > 0) {
    event.custom_data = customDataPayload;
  }

  const payload = {
    data: [event],
  };

  try {
    const response = await fetch(`${GRAPH_API_URL}?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[FB CAPI] Error sending event:", eventName, result);
      return { success: false, error: JSON.stringify(result) };
    }

    console.log("[FB CAPI] Event sent successfully:", eventName, "event_id:", eventId, "events_received:", result.events_received);
    return { success: true };
  } catch (error) {
    console.error("[FB CAPI] Network error sending event:", eventName, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Helper: Generate a unique event ID for deduplication
 * This same ID should be used in both the browser pixel and CAPI
 */
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============ Convenience Functions ============

/** Track a Purchase event (order completed) */
export async function trackPurchase(params: {
  eventId: string;
  orderTotal: number;
  orderId: string;
  productIds: string[];
  numItems: number;
  userData: CAPIUserData;
  sourceUrl?: string;
}) {
  return sendCAPIEvent(
    "Purchase",
    params.eventId,
    params.userData,
    {
      value: params.orderTotal,
      currency: "INR",
      contentIds: params.productIds,
      contentType: "product",
      numItems: params.numItems,
      orderId: params.orderId,
    },
    params.sourceUrl
  );
}

/** Track an AddToCart event */
export async function trackAddToCart(params: {
  eventId: string;
  productId: string;
  productName: string;
  productCategory?: string;
  value: number;
  userData: CAPIUserData;
  sourceUrl?: string;
}) {
  return sendCAPIEvent(
    "AddToCart",
    params.eventId,
    params.userData,
    {
      value: params.value,
      currency: "INR",
      contentIds: [params.productId],
      contentType: "product",
      contentName: params.productName,
      contentCategory: params.productCategory,
    },
    params.sourceUrl
  );
}

/** Track an InitiateCheckout event */
export async function trackInitiateCheckout(params: {
  eventId: string;
  cartTotal: number;
  productIds: string[];
  numItems: number;
  userData: CAPIUserData;
  sourceUrl?: string;
}) {
  return sendCAPIEvent(
    "InitiateCheckout",
    params.eventId,
    params.userData,
    {
      value: params.cartTotal,
      currency: "INR",
      contentIds: params.productIds,
      contentType: "product",
      numItems: params.numItems,
    },
    params.sourceUrl
  );
}

/** Track a ViewContent event (product page view) */
export async function trackViewContent(params: {
  eventId: string;
  productId: string;
  productName: string;
  productCategory?: string;
  value: number;
  userData: CAPIUserData;
  sourceUrl?: string;
}) {
  return sendCAPIEvent(
    "ViewContent",
    params.eventId,
    params.userData,
    {
      value: params.value,
      currency: "INR",
      contentIds: [params.productId],
      contentType: "product",
      contentName: params.productName,
      contentCategory: params.productCategory,
    },
    params.sourceUrl
  );
}
