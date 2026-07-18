/**
 * Homepage consolidated data endpoint - unit tests
 * Tests: getHomepageAllData returns correct structure with all sections
 */
import { describe, it, expect } from "vitest";
import { getHomepageAllData, getHomepageSectionProducts } from "./db";

describe("Homepage consolidated endpoint", () => {
  it("getHomepageAllData returns object with all section keys", async () => {
    const data = await getHomepageAllData();
    expect(data).toHaveProperty("bestseller");
    expect(data).toHaveProperty("trending");
    expect(data).toHaveProperty("featured");
    expect(data).toHaveProperty("explore");
    expect(Array.isArray(data.bestseller)).toBe(true);
    expect(Array.isArray(data.trending)).toBe(true);
    expect(Array.isArray(data.featured)).toBe(true);
    expect(Array.isArray(data.explore)).toBe(true);
  });

  it("getHomepageAllData bestseller matches individual getSection call", async () => {
    const allData = await getHomepageAllData();
    const individual = await getHomepageSectionProducts("bestseller");
    // Both should return same product IDs (order may differ slightly due to query)
    const allIds = allData.bestseller.map(p => p.id).sort();
    const individualIds = individual.map((p: any) => p.id).sort();
    expect(allIds).toEqual(individualIds);
  });

  it("getHomepageAllData trending matches individual getSection call", async () => {
    const allData = await getHomepageAllData();
    const individual = await getHomepageSectionProducts("trending");
    const allIds = allData.trending.map(p => p.id).sort();
    const individualIds = individual.map((p: any) => p.id).sort();
    expect(allIds).toEqual(individualIds);
  });

  it("getHomepageAllData products have images array", async () => {
    const data = await getHomepageAllData();
    // Check that products in each section have images property
    for (const product of data.bestseller) {
      expect(product).toHaveProperty("images");
      expect(Array.isArray(product.images)).toBe(true);
    }
    for (const product of data.trending) {
      expect(product).toHaveProperty("images");
      expect(Array.isArray(product.images)).toBe(true);
    }
    for (const product of data.explore) {
      expect(product).toHaveProperty("images");
      expect(Array.isArray(product.images)).toBe(true);
    }
  });

  it("getHomepageAllData explore section excludes section products", async () => {
    const data = await getHomepageAllData();
    const sectionIds = new Set([
      ...data.bestseller.map(p => p.id),
      ...data.trending.map(p => p.id),
      ...data.featured.map(p => p.id),
    ]);
    // Explore products should NOT overlap with section products
    for (const product of data.explore) {
      expect(sectionIds.has(product.id)).toBe(false);
    }
  });

  it("getHomepageAllData explore section is limited to 24 products", async () => {
    const data = await getHomepageAllData();
    expect(data.explore.length).toBeLessThanOrEqual(24);
  });
});
