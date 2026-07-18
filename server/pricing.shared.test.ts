import { describe, it, expect } from "vitest";
import {
  getProductVariants,
  multiplierForWeight,
  effectiveUnitPrice,
  baseWeightGrams,
  computeShipping,
} from "@shared/pricing";

describe("shared/pricing", () => {
  it("derives base weight, defaulting to 250", () => {
    expect(baseWeightGrams("250g")).toBe(250);
    expect(baseWeightGrams("500g")).toBe(500);
    expect(baseWeightGrams("")).toBe(250);
    expect(baseWeightGrams(null)).toBe(250);
  });

  it("builds the three weight variants from the base", () => {
    const v = getProductVariants("250g");
    expect(v).toEqual([
      { label: "250g", priceMultiplier: 1 },
      { label: "500g", priceMultiplier: 1.85 },
      { label: "1000g", priceMultiplier: 3.5 },
    ]);
  });

  it("resolves multipliers by label, ×1 for blank/missing", () => {
    expect(multiplierForWeight("250g", "250g")).toBe(1);
    expect(multiplierForWeight("250g", "500g")).toBe(1.85);
    expect(multiplierForWeight("250g", "1000g")).toBe(3.5);
    expect(multiplierForWeight("250g", undefined)).toBe(1);
    expect(multiplierForWeight("250g", "")).toBe(1);
  });

  it("returns null for an unknown (tampered) weight label", () => {
    expect(multiplierForWeight("250g", "999g")).toBeNull();
    expect(effectiveUnitPrice(1000, "250g", "999g")).toBeNull();
  });

  it("computes effective unit prices (rounded), matching the storefront", () => {
    expect(effectiveUnitPrice(1055, "250g", "250g")).toBe(1055);
    expect(effectiveUnitPrice(1055, "250g", "500g")).toBe(Math.round(1055 * 1.85)); // 1952
    expect(effectiveUnitPrice(1055, "250g", "1000g")).toBe(Math.round(1055 * 3.5)); // 3693
  });

  describe("computeShipping", () => {
    const cfg = { fee: 49, freeAbove: 499 };

    it("charges the flat fee below the threshold", () => {
      expect(computeShipping(0, cfg)).toBe(49);
      expect(computeShipping(498, cfg)).toBe(49);
    });

    it("is free at and above the threshold", () => {
      expect(computeShipping(499, cfg)).toBe(0);
      expect(computeShipping(1200, cfg)).toBe(0);
    });

    it("is always free when fee is 0 (owner disables shipping charge)", () => {
      expect(computeShipping(100, { fee: 0, freeAbove: 499 })).toBe(0);
    });

    it("charges the fee at every total when freeAbove is 0 (no free tier)", () => {
      expect(computeShipping(100, { fee: 49, freeAbove: 0 })).toBe(49);
      expect(computeShipping(5000, { fee: 49, freeAbove: 0 })).toBe(49);
    });

    it("defaults to free shipping when no config is given", () => {
      expect(computeShipping(100)).toBe(0);
    });
  });
});
