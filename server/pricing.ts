/*
 * Server-authoritative order pricing.
 *
 * The client sends item prices, subtotal, coupon discount and total at checkout.
 * None of that can be trusted — a tampered request could set total: 1. This
 * module recomputes every monetary value from authoritative data (DB product
 * prices + the shared variant multipliers + server-side coupon validation) and
 * rejects line items whose claimed price doesn't match. All callers that touch
 * money (placeOrder, payment initiation) go through here.
 *
 * All amounts are in rupees, matching DB `products.price`.
 */
import { TRPCError } from "@trpc/server";
import { effectiveUnitPrice, getBulkDiscount, computeShipping, GIFT_WRAP_FEE, type ShippingConfig } from "@shared/pricing";
import { getProductsByIds, validateCoupon, getStoreSetting } from "./db";

/**
 * Shipping rule from Settings → Shipping (first zone). Defaults to a flat ₹49
 * with free shipping at/above ₹499 when unconfigured. Set the zone rate to 0 in
 * admin to make shipping free again.
 */
export async function getShippingConfig(): Promise<ShippingConfig> {
  try {
    const raw = await getStoreSetting("shipping");
    const v = (typeof raw === "string" ? JSON.parse(raw) : raw) as { zones?: { rate?: string | number; freeAbove?: string | number }[] } | null;
    const zone = v?.zones?.[0];
    if (zone) return { fee: Number(zone.rate) || 0, freeAbove: Number(zone.freeAbove) || 0 };
  } catch { /* fall through to default */ }
  return { fee: 49, freeAbove: 499 };
}

/** Prepaid/online-payment discount percentage from Settings → Checkout
 *  (0 = disabled). Applied to prepaid orders only, never COD. */
export async function getPrepaidDiscountPercent(): Promise<number> {
  try {
    const raw = await getStoreSetting("checkout");
    const v = (typeof raw === "string" ? JSON.parse(raw) : raw) as { prepaidDiscountPercent?: string | number } | null;
    const pct = Number(v?.prepaidDiscountPercent) || 0;
    return Math.max(0, Math.min(50, pct)); // clamp 0–50%
  } catch { return 0; }
}

export type ClientOrderItem = {
  id: string;
  name?: string;
  price?: number;
  quantity: number;
  image?: string;
  weight?: string;
};

export type ComputedItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  weight?: string;
};

export type ComputedAmounts = {
  items: ComputedItem[];
  subtotal: number;
  bulkDiscount: number;
  couponCode: string | null;
  couponDiscount: number;
  loyaltyDiscount: number;
  prepaidDiscount: number;
  giftWrapFee: number;
  shipping: number;
  total: number;
  /** Amount due now: full total, 30% for advance plans, 0 for COD. */
  payNowAmount: number;
};

const MAX_QTY_PER_ITEM = 1000;

function isAdvancePlan(plan?: string) {
  return !!plan && plan.endsWith("advance30");
}

/**
 * Recomputes authoritative order amounts from product data and an optional coupon.
 * When `validatePrices` is true, throws on any client-supplied line price that
 * does not match the server-computed price (a tampering signal).
 */
export async function computeOrderAmounts(opts: {
  items: ClientOrderItem[];
  couponCode?: string | null;
  paymentPlan?: string;
  validatePrices?: boolean;
  giftWrap?: boolean;
  /** Loyalty-points discount in RUPEES, pre-validated by the caller (balance +
   *  min/max caps). computeOrderAmounts just applies it — it never trusts a
   *  client-supplied points value. */
  loyaltyDiscount?: number;
}): Promise<ComputedAmounts> {
  const { items, couponCode, paymentPlan, validatePrices = false, giftWrap = false } = opts;
  const loyaltyDiscountReq = Math.max(0, Math.round(opts.loyaltyDiscount || 0));

  if (!Array.isArray(items) || items.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Order has no items." });
  }

  const numericIds = Array.from(new Set(items.map(i => Number(i.id)).filter(n => Number.isInteger(n) && n > 0)));
  const products = await getProductsByIds(numericIds);
  const byId = new Map(products.map(p => [p.id, p]));

  const computed: ComputedItem[] = [];
  let subtotal = 0;

  for (const item of items) {
    const product = byId.get(Number(item.id));
    if (!product) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Product ${item.id} is unavailable.` });
    }

    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid quantity for ${product.name}.` });
    }

    const unitPrice = effectiveUnitPrice(product.price, product.weight, item.weight);
    if (unitPrice === null) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid weight option for ${product.name}.` });
    }

    if (validatePrices && item.price != null && Math.round(item.price) !== unitPrice) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Price mismatch for ${product.name}.`,
      });
    }

    computed.push({
      id: String(product.id),
      name: product.name,
      price: unitPrice,
      quantity: qty,
      image: item.image,
      weight: item.weight,
    });
    subtotal += unitPrice * qty;
  }

  // Bulk / quantity discount: computed server-side from the shared tiers.
  let bulkDiscount = 0;
  for (const ci of computed) {
    const disc = getBulkDiscount(ci.quantity);
    if (disc > 0) {
      bulkDiscount += Math.round(ci.price * disc) * ci.quantity;
    }
  }

  const subtotalAfterBulk = subtotal - bulkDiscount;

  // Coupon: revalidate server-side against the recomputed subtotal (after bulk
  // discount). If the client sent a code that is no longer valid, the discount
  // is simply dropped (the order is stored/charged at the correct amount).
  let couponDiscount = 0;
  let resolvedCode: string | null = null;
  if (couponCode && couponCode.trim()) {
    const res = await validateCoupon(couponCode.trim(), subtotalAfterBulk);
    if (res.valid) {
      couponDiscount = res.discount;
      resolvedCode = couponCode.trim().toUpperCase();
    }
  }

  // Gift-wrap fee is added to goods total BEFORE the free-shipping threshold
  // check, matching the checkout UI (CartDrawer) exactly so displayed total ==
  // charged total. Both payment initiations charge from the stored order.total,
  // so adding it here flows through to Razorpay/PhonePe/advance amounts too.
  const giftWrapFee = giftWrap ? GIFT_WRAP_FEE : 0;
  // Loyalty discount can't exceed the goods value after coupon (never let points
  // create a negative order or pay for shipping/gift wrap beyond the goods).
  const goodsBeforeLoyalty = Math.max(0, subtotalAfterBulk - couponDiscount);
  const loyaltyDiscount = Math.min(loyaltyDiscountReq, goodsBeforeLoyalty);
  const goodsAfterLoyalty = Math.max(0, goodsBeforeLoyalty - loyaltyDiscount);
  // Prepaid/online-payment discount — applies to prepaid plans only, never COD.
  // Charged from the stored order.total, so it flows through to the gateway amount.
  const isPrepaid = !!paymentPlan && paymentPlan !== "cod";
  const prepaidPct = isPrepaid ? await getPrepaidDiscountPercent() : 0;
  const prepaidDiscount = prepaidPct > 0 ? Math.round(goodsAfterLoyalty * prepaidPct / 100) : 0;
  const goodsTotal = Math.max(0, goodsAfterLoyalty - prepaidDiscount + giftWrapFee);
  const shipping = computeShipping(goodsTotal, await getShippingConfig());
  const total = goodsTotal + shipping;
  const payNowAmount = isAdvancePlan(paymentPlan)
    ? Math.round(total * 0.3)
    : paymentPlan === "cod"
      ? 0
      : total;

  return { items: computed, subtotal, bulkDiscount, couponCode: resolvedCode, couponDiscount, loyaltyDiscount, prepaidDiscount, giftWrapFee, shipping, total, payNowAmount };
}
