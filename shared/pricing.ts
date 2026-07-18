/*
 * Variant pricing — single source of truth shared by the client and the server.
 *
 * A product has one base price (DB `products.price`) and one base weight
 * (`products.weight`, e.g. "250g"). The storefront offers three weight variants
 * derived from that base, each with a fixed price multiplier. Previously these
 * multipliers lived only in the client (ProductDetail), so the server had no way
 * to validate the price a client claimed at checkout — enabling price tampering.
 * Both sides now import from here.
 */

// Fixed multipliers for [base, 2×, 4×] weight variants.
export const VARIANT_MULTIPLIERS = [1, 1.85, 3.5] as const;

export type Variant = { label: string; priceMultiplier: number };

/** Parses the numeric base weight in grams (defaults to 250 when unparseable). */
export function baseWeightGrams(productWeight: string | null | undefined): number {
  return parseInt(productWeight || "", 10) || 250;
}

/** The three weight variants offered for a product, matching the storefront UI. */
export function getProductVariants(productWeight: string | null | undefined): Variant[] {
  const base = baseWeightGrams(productWeight);
  const baseLabel = productWeight && productWeight.trim() ? productWeight : `${base}g`;
  return [
    { label: baseLabel, priceMultiplier: VARIANT_MULTIPLIERS[0] },
    { label: `${base * 2}g`, priceMultiplier: VARIANT_MULTIPLIERS[1] },
    { label: `${base * 4}g`, priceMultiplier: VARIANT_MULTIPLIERS[2] },
  ];
}

/**
 * Multiplier for a selected weight label. Missing/blank label → base (×1).
 * A non-blank label that matches no known variant returns null, signalling the
 * caller (server validation) to treat it as a tampering attempt.
 */
export function multiplierForWeight(
  productWeight: string | null | undefined,
  selectedWeight?: string | null
): number | null {
  if (!selectedWeight || !selectedWeight.trim()) return VARIANT_MULTIPLIERS[0];
  const match = getProductVariants(productWeight).find(v => v.label === selectedWeight);
  return match ? match.priceMultiplier : null;
}

/**
 * Authoritative per-unit price for a base price + selected weight. Returns null
 * for an unknown (non-blank) weight label. Mirrors the client's
 * Math.round(basePrice * multiplier).
 */
export function effectiveUnitPrice(
  basePrice: number,
  productWeight: string | null | undefined,
  selectedWeight?: string | null
): number | null {
  const mult = multiplierForWeight(productWeight, selectedWeight);
  return mult === null ? null : Math.round(basePrice * mult);
}

// ── Bulk / quantity discount tiers ──────────────────────────────────────────

/**
 * Returns the fractional discount for a given quantity of the SAME product.
 * - 1 unit  → 0    (full price)
 * - 2 units → 0.05 (5% off each)
 * - 3+ units→ 0.10 (10% off each)
 */
export function getBulkDiscount(quantity: number): number {
  if (quantity >= 3) return 0.10;
  if (quantity >= 2) return 0.05;
  return 0;
}

/**
 * Unit price after applying the bulk/quantity discount, rounded to the nearest
 * rupee. Used on the product detail page and in cart/checkout totals.
 */
export function getBulkPrice(unitPrice: number, quantity: number): number {
  const discount = getBulkDiscount(quantity);
  return Math.round(unitPrice * (1 - discount));
}

/**
 * Total savings from bulk discount for a line item.
 */
export function getBulkSavings(unitPrice: number, quantity: number): number {
  const discount = getBulkDiscount(quantity);
  return Math.round(unitPrice * discount) * quantity;
}

/*
 * Shipping — single source of truth shared by client (display) and server
 * (authoritative order total). Free above a threshold, otherwise a flat fee.
 * All amounts are in rupees, matching DB product prices.
 */
export type ShippingConfig = { fee: number; freeAbove: number };
export const DEFAULT_SHIPPING: ShippingConfig = { fee: 0, freeAbove: 0 };

/**
 * Flat gift-wrap fee (rupees) added to the order when gift wrapping is selected.
 * Single source of truth shared by the client (display) and server (authoritative
 * charge) so the two never drift. Folded into goods total BEFORE the free-shipping
 * threshold check, matching the checkout UI.
 */
export const GIFT_WRAP_FEE = 49;

/** Flat fee below `freeAbove`, free at/above it. fee<=0 or freeAbove<=0 => always free. */
export function computeShipping(goodsTotal: number, cfg: ShippingConfig = DEFAULT_SHIPPING): number {
  const fee = Math.max(0, Math.round(cfg?.fee || 0));
  const freeAbove = Math.max(0, Math.round(cfg?.freeAbove || 0));
  if (fee <= 0) return 0;
  if (freeAbove > 0 && goodsTotal >= freeAbove) return 0;
  return fee;
}
