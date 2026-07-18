/**
 * Shipping Service — Shiprocket & iThink Logistics
 * Handles authentication, order creation, AWB assignment, and tracking.
 *
 * iThink Pickup Address ID: 89598 (Foodondoor Private Limited, Sehore)
 * Shiprocket: Uses email/password auth — requires IP whitelisting for cloud servers.
 */

import { ENV } from "./_core/env";
import { getOrderByAwb, getOrderById, updateOrderStatus } from "./db";
import { sendOrderShipped, sendOrderDelivered } from "./whatsapp";
import { sendShippingUpdateEmail } from "./email";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ShippingProvider = "shiprocket" | "ithink";

export interface ShipOrderInput {
  orderId: string;
  orderDate: string; // "YYYY-MM-DD"
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: { name: string; sku: string; qty: number; price: number }[];
  totalAmount: number;
  paymentMethod: "COD" | "Prepaid";
  codAmount?: number;
  weight?: number; // kg, default 0.5
  length?: number; // cm, default 15
  breadth?: number; // cm, default 12
  height?: number; // cm, default 8
  courierId?: number; // Shiprocket courier_company_id chosen by admin (optional)
}

export interface ShipOrderResult {
  success: boolean;
  awb?: string;
  shipmentId?: string;
  trackingUrl?: string;
  labelUrl?: string;
  error?: string;
  rawResponse?: unknown;
}

export interface TrackResult {
  success: boolean;
  status?: string;
  location?: string;
  updatedAt?: string;
  history?: { date: string; activity: string; location: string }[];
  error?: string;
}

// ─── Shiprocket ──────────────────────────────────────────────────────────────
// NOTE: Shiprocket API (apiv2.shiprocket.in) blocks cloud/VPS server IPs with 403.
// To use Shiprocket, whitelist your server IP via Shiprocket support, or use a proxy.

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

// On Shiprocket we always ship via this courier (configurable). The serviceability
// check returns every courier servicing the route; we pick this one by name.
const SHIPROCKET_PREFERRED_COURIER = (process.env.SHIPROCKET_PREFERRED_COURIER ?? "delhivery").toLowerCase();

let srTokenCache: { token: string; expiresAt: number } | null = null;
let srPickupPinCache: { pin: string; expiresAt: number } | null = null;

async function getSRToken(): Promise<string> {
  const now = Date.now();
  if (srTokenCache && srTokenCache.expiresAt > now) return srTokenCache.token;

  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: ENV.shiprocketEmail,
      password: ENV.shiprocketPassword,
    }),
  });

  // Shiprocket returns HTML 403 for non-whitelisted IPs
  const text = await res.text();
  if (!res.ok || text.startsWith("<")) {
    throw new Error(
      `Shiprocket auth failed (HTTP ${res.status}). ` +
      `If you see 403, your server IP is not whitelisted. ` +
      `Contact Shiprocket support to whitelist: ${res.status}`
    );
  }

  const data = JSON.parse(text) as { token?: string; message?: string };
  if (!data.token) throw new Error(`Shiprocket auth failed: ${data.message ?? "No token returned"}`);

  // Token valid for 10 days; cache for 9 days
  srTokenCache = { token: data.token, expiresAt: now + 9 * 24 * 60 * 60 * 1000 };
  return data.token;
}

export interface ShiprocketCourierOption {
  courier_company_id?: number;
  courier_name?: string;
  is_surface?: boolean;
  rate?: number;
}

/**
 * From a list of serviceable couriers, pick the one matching `preferred` (by
 * name, case-insensitive substring). Among matches, prefer surface (cheaper)
 * over air, then the lowest rate. Returns null if none match. Pure/​testable.
 */
export function pickPreferredCourier(
  couriers: ShiprocketCourierOption[],
  preferred: string
): ShiprocketCourierOption | null {
  const needle = preferred.toLowerCase();
  const matches = (couriers ?? []).filter((c) =>
    (c.courier_name || "").toLowerCase().includes(needle)
  );
  if (matches.length === 0) return null;
  return matches.slice().sort((a, b) => {
    const sa = a.is_surface ? 0 : 1;
    const sb = b.is_surface ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return (a.rate ?? Infinity) - (b.rate ?? Infinity);
  })[0];
}

/**
 * Resolve the configured pickup location's pincode from Shiprocket (needed for
 * the serviceability check). Reads the "Primary" pickup location, falling back
 * to the first one. Cached for a day. Returns null on failure.
 */
async function getSRPickupPincode(token: string): Promise<string | null> {
  const now = Date.now();
  if (srPickupPinCache && srPickupPinCache.expiresAt > now) return srPickupPinCache.pin;
  try {
    const res = await fetch(`${SHIPROCKET_BASE}/settings/company/pickup`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    if (!res.ok || text.startsWith("<")) return null;
    const data = JSON.parse(text) as {
      data?: { shipping_address?: { pickup_location?: string; pin_code?: string | number }[] };
    };
    const list = data.data?.shipping_address ?? [];
    const primary =
      list.find((a) => (a.pickup_location || "").toLowerCase() === "primary") ?? list[0];
    const pin = primary?.pin_code != null ? String(primary.pin_code) : null;
    if (pin) srPickupPinCache = { pin, expiresAt: now + 24 * 60 * 60 * 1000 };
    return pin;
  } catch {
    return null;
  }
}

/**
 * Find the preferred courier's company id for a route via Shiprocket's
 * serviceability API. Returns null if the courier doesn't service the route.
 */
async function getPreferredCourierId(
  token: string,
  pickupPin: string,
  deliveryPin: string,
  weight: number,
  cod: boolean
): Promise<number | null> {
  try {
    const url =
      `${SHIPROCKET_BASE}/courier/serviceability/?pickup_postcode=${encodeURIComponent(pickupPin)}` +
      `&delivery_postcode=${encodeURIComponent(deliveryPin)}&weight=${weight}&cod=${cod ? 1 : 0}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const text = await res.text();
    if (!res.ok || text.startsWith("<")) return null;
    const data = JSON.parse(text) as {
      data?: { available_courier_companies?: ShiprocketCourierOption[] };
    };
    const chosen = pickPreferredCourier(
      data.data?.available_courier_companies ?? [],
      SHIPROCKET_PREFERRED_COURIER
    );
    return chosen?.courier_company_id ?? null;
  } catch {
    return null;
  }
}

export interface CourierOption {
  courierId: number;
  courierName: string;
  rate?: number;
  etd?: string;
  isSurface?: boolean;
  isRecommended?: boolean; // the preferred courier (Delhivery) for this account
}

/**
 * List the couriers that service a route, for the admin courier picker. Shiprocket
 * only — iThink is configured server-side to ship via Delhivery. The preferred
 * courier (Delhivery) is flagged `isRecommended` and sorted to the top.
 */
export async function getServiceableCouriers(
  provider: ShippingProvider,
  deliveryPin: string,
  weight: number,
  cod: boolean
): Promise<{ success: boolean; couriers: CourierOption[]; error?: string }> {
  if (provider !== "shiprocket") {
    return { success: true, couriers: [] };
  }
  try {
    const token = await getSRToken();
    const pickupPin = await getSRPickupPincode(token);
    if (!pickupPin) return { success: false, couriers: [], error: "Could not resolve pickup pincode" };
    const url =
      `${SHIPROCKET_BASE}/courier/serviceability/?pickup_postcode=${encodeURIComponent(pickupPin)}` +
      `&delivery_postcode=${encodeURIComponent(deliveryPin)}&weight=${weight}&cod=${cod ? 1 : 0}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const text = await res.text();
    if (!res.ok || text.startsWith("<")) {
      return { success: false, couriers: [], error: `Serviceability check failed (HTTP ${res.status})` };
    }
    const data = JSON.parse(text) as {
      data?: { available_courier_companies?: (ShiprocketCourierOption & { etd?: string })[] };
    };
    const couriers: CourierOption[] = (data.data?.available_courier_companies ?? [])
      .filter((c) => c.courier_company_id != null)
      .map((c) => ({
        courierId: c.courier_company_id as number,
        courierName: c.courier_name ?? `Courier ${c.courier_company_id}`,
        rate: c.rate,
        etd: c.etd,
        isSurface: c.is_surface,
        isRecommended: (c.courier_name || "").toLowerCase().includes(SHIPROCKET_PREFERRED_COURIER),
      }))
      .sort((a, b) => {
        if (a.isRecommended !== b.isRecommended) return a.isRecommended ? -1 : 1;
        return (a.rate ?? Infinity) - (b.rate ?? Infinity);
      });
    return { success: true, couriers };
  } catch (err: unknown) {
    return { success: false, couriers: [], error: (err as Error).message };
  }
}

/**
 * Assign an AWB to a freshly created Shiprocket shipment. The adhoc order-create
 * call does not generate a tracking number on its own — Shiprocket only mints the
 * AWB once a courier is assigned. Passing no courier_id lets Shiprocket auto-pick
 * the recommended (cheapest serviceable) courier for the route.
 */
async function shiprocketAssignAwb(
  shipmentId: number | string,
  token: string,
  courierId?: number
): Promise<{ awb?: string; courierName?: string; error?: string }> {
  try {
    const res = await fetch(`${SHIPROCKET_BASE}/courier/assign/awb`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(
        courierId ? { shipment_id: shipmentId, courier_id: courierId } : { shipment_id: shipmentId }
      ),
    });
    const text = await res.text();
    if (!res.ok || text.startsWith("<")) {
      return { error: `AWB assignment failed (HTTP ${res.status})` };
    }
    const data = JSON.parse(text) as {
      awb_assign_status?: number;
      response?: { data?: { awb_code?: string; courier_name?: string } };
      message?: string;
    };
    const awb = data.response?.data?.awb_code;
    if (!awb) {
      return { error: data.message ?? "no serviceable courier could be assigned" };
    }
    return { awb, courierName: data.response?.data?.courier_name };
  } catch (err: unknown) {
    return { error: (err as Error).message };
  }
}

export async function shiprocketCreateShipment(input: ShipOrderInput): Promise<ShipOrderResult> {
  try {
    const token = await getSRToken();

    const orderPayload = {
      order_id: input.orderId,
      order_date: input.orderDate,
      pickup_location: "Primary",
      billing_customer_name: input.customerName,
      billing_last_name: "",
      billing_address: input.address,
      billing_city: input.city,
      billing_pincode: input.pincode,
      billing_state: input.state,
      billing_country: "India",
      billing_email: input.email,
      billing_phone: input.phone,
      shipping_is_billing: true,
      order_items: input.items.map((i) => ({
        name: i.name,
        sku: i.sku || `SKU-${i.name.replace(/\s+/g, "").slice(0, 6)}`,
        units: i.qty,
        selling_price: i.price,
      })),
      payment_method: input.paymentMethod === "COD" ? "COD" : "Prepaid",
      sub_total: input.totalAmount,
      length: input.length ?? 15,
      breadth: input.breadth ?? 12,
      height: input.height ?? 8,
      weight: input.weight ?? 0.5,
    };

    const res = await fetch(`${SHIPROCKET_BASE}/orders/create/adhoc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const text = await res.text();
    if (!res.ok || text.startsWith("<")) {
      return { success: false, error: `Shiprocket API error (HTTP ${res.status})` };
    }

    const data = JSON.parse(text) as {
      order_id?: number;
      shipment_id?: number;
      awb_code?: string;
      label_url?: string;
      status?: string;
      message?: string;
    };

    if (!data.shipment_id) {
      return { success: false, error: data.message ?? "Order creation failed", rawResponse: data };
    }

    // Shiprocket's adhoc create returns a shipment_id but NO AWB — the tracking
    // number is only generated once a courier is assigned. Assign one now so the
    // AWB comes through automatically (no manual second step for the admin).
    // Courier selection: use the one the admin picked, else default to the
    // preferred courier (Delhivery), else let Shiprocket auto-pick.
    let awb = data.awb_code;
    if (!awb) {
      let courierId = input.courierId;
      if (!courierId) {
        const pickupPin = await getSRPickupPincode(token);
        if (pickupPin) {
          const id = await getPreferredCourierId(
            token,
            pickupPin,
            input.pincode,
            input.weight ?? 0.5,
            input.paymentMethod === "COD"
          );
          if (id) courierId = id;
        }
      }
      const assign = await shiprocketAssignAwb(data.shipment_id, token, courierId);
      if (assign.awb) {
        awb = assign.awb;
      } else {
        return {
          success: false,
          error: `Shiprocket order created (shipment ${data.shipment_id}) but ${assign.error}`,
          shipmentId: String(data.shipment_id),
          rawResponse: data,
        };
      }
    }

    return {
      success: true,
      awb,
      shipmentId: String(data.shipment_id),
      trackingUrl: awb
        ? `https://track.shiprocket.in/tracking/${awb}`
        : undefined,
      labelUrl: data.label_url,
      rawResponse: data,
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function shiprocketTrack(awb: string): Promise<TrackResult> {
  try {
    const token = await getSRToken();
    const res = await fetch(`${SHIPROCKET_BASE}/courier/track/awb/${awb}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    if (!res.ok || text.startsWith("<")) {
      return { success: false, error: `Shiprocket tracking error (HTTP ${res.status})` };
    }

    const data = JSON.parse(text) as {
      tracking_data?: {
        track_status?: number;
        shipment_status?: string;
        shipment_track?: { current_status?: string; delivered_date?: string }[];
        shipment_track_activities?: { date?: string; activity?: string; location?: string }[];
      };
    };

    const td = data.tracking_data;
    if (!td) return { success: false, error: "No tracking data" };

    const latest = td.shipment_track?.[0];
    const activities = (td.shipment_track_activities ?? []).map((a) => ({
      date: a.date ?? "",
      activity: a.activity ?? "",
      location: a.location ?? "",
    }));

    return {
      success: true,
      status: latest?.current_status ?? td.shipment_status,
      updatedAt: activities[0]?.date,
      history: activities,
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── iThink Logistics ────────────────────────────────────────────────────────
// Pickup Address ID: 89598 (Foodondoor Private Limited, Sherpur Square, Sehore)
// Return Address ID: same as pickup (89598)

const ITHINK_BASE = "https://my.ithinklogistics.com/api_v3";
// Pickup/return address id — configurable so a freshly created iThink pickup
// address can be used without a code change (defaults to the existing one).
const ITHINK_PICKUP_ID = ENV.ithinkPickupId;

export async function ithinkCreateShipment(input: ShipOrderInput): Promise<ShipOrderResult> {
  try {
    // iThink expects date as DD-MM-YYYY
    const [year, month, day] = input.orderDate.split("-");
    const orderDateFormatted = `${day}-${month}-${year}`;

    const payload = {
      data: {
        shipments: [
          {
            waybill: "",
            order: input.orderId,
            sub_order: `${input.orderId}-A`,
            order_date: orderDateFormatted,
            total_amount: String(input.totalAmount),
            name: input.customerName,
            company_name: "",
            add: input.address,
            add2: "",
            add3: "",
            pin: input.pincode,
            city: input.city,
            state: input.state,
            country: "India",
            phone: input.phone,
            alt_phone: input.phone,
            email: input.email || "orders@nutriwow.in",
            is_billing_same_as_shipping: "yes",
            billing_name: input.customerName,
            billing_company_name: "",
            billing_add: input.address,
            billing_add2: "",
            billing_add3: "",
            billing_pin: input.pincode,
            billing_city: input.city,
            billing_state: input.state,
            billing_country: "India",
            billing_phone: input.phone,
            billing_alt_phone: input.phone,
            billing_email: input.email || "orders@nutriwow.in",
            products: input.items.map((i) => ({
              product_name: i.name,
              product_sku: i.sku || `SKU-${i.name.replace(/\s+/g, "").slice(0, 6)}`,
              product_quantity: String(i.qty),
              product_price: String(i.price),
              product_tax_rate: "0",
              product_hsn_code: "",
              product_discount: "0",
            })),
            shipment_length: String(input.length ?? 15),
            shipment_width: String(input.breadth ?? 12),
            shipment_height: String(input.height ?? 8),
            weight: String(input.weight ?? 0.5),
            shipping_charges: "0",
            giftwrap_charges: "0",
            transaction_charges: "0",
            total_discount: "0",
            first_attemp_discount: "0",
            cod_charges: "0",
            advance_amount: "0",
            cod_amount:
              input.paymentMethod === "COD"
                ? String(input.codAmount ?? input.totalAmount)
                : "0",
            payment_mode: input.paymentMethod === "COD" ? "COD" : "Prepaid",
            reseller_name: "",
            eway_bill_number: "",
            gst_number: "",
            return_address_id: ITHINK_PICKUP_ID,
          },
        ],
        pickup_address_id: ITHINK_PICKUP_ID,
        access_token: ENV.ithinkAccessToken,
        secret_key: ENV.ithinkSecretKey,
        logistics: ENV.ithinkLogistics,
        s_type: "surface",
        order_type: "forward",
      },
    };

    const res = await fetch(`${ITHINK_BASE}/order/add.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as {
      status?: string;
      html_message?: string;
      data?: Record<
        string,
        {
          status?: string;
          remark?: string;
          waybill?: string;
          refnum?: string;
          logistic_name?: string;
          tracking_url?: string;
        }
      >;
    };

    // iThink wraps results per-shipment under numeric keys ("1", "2", ...)
    const shipmentResult = data.data?.["1"];

    if (data.status === "error" || !shipmentResult) {
      const errMsg = data.html_message ?? shipmentResult?.remark ?? "Order creation failed";
      return { success: false, error: errMsg, rawResponse: data };
    }

    if (shipmentResult.status === "error") {
      return {
        success: false,
        error: shipmentResult.remark ?? "Shipment error",
        rawResponse: data,
      };
    }

    const awb = shipmentResult.waybill;
    return {
      success: true,
      awb: awb || undefined,
      shipmentId: shipmentResult.refnum,
      trackingUrl: awb
        ? `https://www.ithinklogistics.co.in/postship/tracking/${awb}`
        : shipmentResult.tracking_url || undefined,
      rawResponse: data,
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function ithinkTrack(awb: string): Promise<TrackResult> {
  try {
    const res = await fetch(`${ITHINK_BASE}/order/track.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          waybill: awb,
          access_token: ENV.ithinkAccessToken,
          secret_key: ENV.ithinkSecretKey,
        },
      }),
    });

    const data = (await res.json()) as
      | {
          data?: {
            package_status?: string;
            current_location?: string;
            scan_details?: {
              scan_datetime?: string;
              scan_type?: string;
              scan_location?: string;
            }[];
          };
          message?: string;
        }
      | unknown[];

    // iThink returns [] for unknown AWBs
    if (Array.isArray(data)) {
      return { success: false, error: "No tracking data found for this AWB" };
    }

    const pkg = (data as { data?: { package_status?: string; current_location?: string; scan_details?: { scan_datetime?: string; scan_type?: string; scan_location?: string }[] } }).data;
    if (!pkg) {
      return { success: false, error: (data as { message?: string }).message ?? "No tracking data" };
    }

    const history = (pkg.scan_details ?? []).map((s) => ({
      date: s.scan_datetime ?? "",
      activity: s.scan_type ?? "",
      location: s.scan_location ?? "",
    }));

    return {
      success: true,
      status: pkg.package_status,
      location: pkg.current_location,
      updatedAt: history[0]?.date,
      history,
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetch the iThink account's pickup/warehouse addresses (with their ids). Used by
 * the diagnostic endpoint so the owner can discover the correct ITHINK_PICKUP_ID
 * after setting up a fresh iThink account. Returns the raw iThink response so the
 * ids are visible regardless of exact field naming.
 */
export async function ithinkGetPickupAddresses(): Promise<{ success: boolean; raw: unknown; error?: string }> {
  try {
    const res = await fetch(`${ITHINK_BASE}/warehouse/get.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { access_token: ENV.ithinkAccessToken, secret_key: ENV.ithinkSecretKey },
      }),
    });
    const raw = await res.json().catch(() => null);
    return { success: res.ok, raw };
  } catch (err: unknown) {
    return { success: false, raw: null, error: (err as Error).message };
  }
}

// ─── Unified helpers ──────────────────────────────────────────────────────────

export async function createShipment(
  provider: ShippingProvider,
  input: ShipOrderInput
): Promise<ShipOrderResult> {
  return provider === "shiprocket"
    ? shiprocketCreateShipment(input)
    : ithinkCreateShipment(input);
}

export async function trackShipment(
  provider: ShippingProvider,
  awb: string
): Promise<TrackResult> {
  return provider === "shiprocket" ? shiprocketTrack(awb) : ithinkTrack(awb);
}

// ─── Courier status webhook reconciliation ─────────────────────────────────────
// Shiprocket / iThink POST tracking status updates to /api/shipping/webhook.
// We map the courier's free-text status onto our order status enum and advance
// the matching order automatically (so "delivered" no longer needs a manual
// admin click) — then fire the same customer notifications the admin flow does.

export type OrderProgressStatus = "processing" | "shipped" | "delivered" | "cancelled";

// Forward-progression ranking. Higher = later in the journey. A webhook may only
// move an order forwards (a stray "in transit" scan must never undo "delivered").
const STATUS_RANK: Record<string, number> = {
  pending_payment: 0,
  placed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
};

/**
 * Normalise a courier's free-text status (Shiprocket / iThink) into our internal
 * order status. Returns null when the scan carries no actionable meaning (e.g.
 * "Pickup Scheduled", "Delivery Failed") so the order is left untouched.
 */
export function mapCourierStatus(raw: string): OrderProgressStatus | null {
  const s = (raw || "").toLowerCase().trim();
  if (!s) return null;
  // Exception scans must NOT be misread as "delivered" (they contain that word).
  if (
    s.includes("undelivered") ||
    s.includes("not delivered") ||
    s.includes("delivery failed") ||
    s.includes("failed delivery")
  ) return null;
  // Return-to-origin & cancellations are terminal-ish → cancelled.
  if (s.includes("rto") || s.includes("return")) return "cancelled";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("delivered")) return "delivered";
  if (
    s.includes("out for delivery") ||
    s.includes("transit") ||
    s.includes("shipped") ||
    s.includes("dispatch") ||
    s.includes("picked up")
  ) return "shipped";
  if (s.includes("pickup") || s.includes("manifest") || s.includes("picked")) return "processing";
  return null;
}

export interface CourierWebhookEvent {
  awb: string;
  rawStatus: string;
  orderId?: string;
  trackingUrl?: string;
  provider?: ShippingProvider;
}

/**
 * Extract one or more tracking events from a courier webhook payload. Handles
 * Shiprocket's flat object and iThink's nested/array shapes by scanning for the
 * common AWB + status field aliases. Returns de-duped events.
 */
export function extractCourierEvents(body: unknown): CourierWebhookEvent[] {
  if (!body || typeof body !== "object") return [];
  const str = (v: unknown) => (v == null ? "" : String(v)).trim();
  const events: CourierWebhookEvent[] = [];

  const consider = (o: unknown) => {
    if (!o || typeof o !== "object") return;
    const r = o as Record<string, unknown>;
    const awb = str(r.awb ?? r.awb_code ?? r.waybill ?? r.AWB);
    const rawStatus = str(
      r.current_status ?? r.shipment_status ?? r.status ?? r.package_status ?? r.scan_type
    );
    if (!awb || !rawStatus) return;
    const courier = str(r.courier_name ?? r.logistic_name ?? r.logistics).toLowerCase();
    events.push({
      awb,
      rawStatus,
      orderId: str(r.order_id ?? r.channel_order_id ?? r.order ?? r.refnum) || undefined,
      trackingUrl: str(r.tracking_url ?? r.track_url) || undefined,
      provider: courier.includes("shiprocket")
        ? "shiprocket"
        : courier.includes("ithink")
          ? "ithink"
          : undefined,
    });
  };

  consider(body);
  const b = body as Record<string, unknown>;
  const data = b.data;
  if (Array.isArray(data)) data.forEach(consider);
  else if (data && typeof data === "object") {
    consider(data);
    for (const v of Object.values(data as Record<string, unknown>)) consider(v);
  }
  if (Array.isArray(b.shipments)) (b.shipments as unknown[]).forEach(consider);

  const seen = new Set<string>();
  return events.filter((e) => {
    const k = `${e.awb}|${e.rawStatus}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export interface ReconcileResult {
  matched: boolean;
  changed: boolean;
  orderId?: string;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
}

/**
 * Apply a courier tracking event to its order: look up by AWB (falling back to
 * order id), map the status, advance forward-only, and — on a real transition —
 * fire the customer WhatsApp + email notifications. Safe to call repeatedly:
 * couriers retry webhooks, and we only act when the stored status actually moves.
 */
export async function reconcileCourierStatus(evt: CourierWebhookEvent): Promise<ReconcileResult> {
  const awb = (evt.awb || "").trim();
  if (!awb && !evt.orderId) return { matched: false, changed: false, reason: "no-awb" };

  let order = awb ? await getOrderByAwb(awb) : null;
  if (!order && evt.orderId) order = await getOrderById(evt.orderId);
  if (!order) return { matched: false, changed: false, reason: "order-not-found" };

  const prev = order.status;
  const mapped = mapCourierStatus(evt.rawStatus);
  if (!mapped) {
    return { matched: true, changed: false, orderId: order.id, previousStatus: prev, reason: "status-not-actionable" };
  }

  // Terminal states are never reopened by a webhook.
  if (prev === "delivered" || prev === "cancelled") {
    return { matched: true, changed: false, orderId: order.id, previousStatus: prev, newStatus: prev, reason: "terminal-state" };
  }
  // Forward-only (cancelled/RTO may arrive from any non-terminal state).
  if (mapped !== "cancelled" && (STATUS_RANK[mapped] ?? 0) <= (STATUS_RANK[prev] ?? 0)) {
    return { matched: true, changed: false, orderId: order.id, previousStatus: prev, newStatus: prev, reason: "no-forward-change" };
  }

  await updateOrderStatus(order.id, mapped);

  const phone = (order.phone || "").replace(/\D/g, "");
  const name = order.customerName || "Customer";
  const provider = order.shippingProvider || evt.provider || "Courier Partner";
  const trackingUrl = order.trackingUrl || evt.trackingUrl || undefined;

  if (mapped === "delivered" && phone) {
    sendOrderDelivered({ phone, customerName: name, orderId: order.id }).catch(() => {});
  } else if (mapped === "shipped" && phone) {
    sendOrderShipped({
      phone,
      customerName: name,
      orderId: order.id,
      awbCode: order.awbCode || awb,
      trackingUrl,
      shippingProvider: provider,
    }).catch(() => {});
    if (order.email) {
      sendShippingUpdateEmail({
        orderId: order.id,
        customerName: name,
        customerEmail: order.email,
        awbNumber: order.awbCode || awb,
        courierName: provider,
        trackingUrl,
      }).catch(() => {});
    }
  }

  return { matched: true, changed: true, orderId: order.id, previousStatus: prev, newStatus: mapped };
}
