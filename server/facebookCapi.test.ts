import { describe, it, expect } from "vitest";
import { sendCAPIEvent, generateEventId } from "./facebookCapi";

describe("Facebook Conversions API", () => {
  it("should send a test event successfully with valid token", async () => {
    // Skip if no token configured
    const token = process.env.FB_CONVERSIONS_API_TOKEN;
    if (!token) {
      console.log("Skipping: FB_CONVERSIONS_API_TOKEN not set");
      return;
    }

    const result = await sendCAPIEvent(
      "ViewContent",
      generateEventId(),
      {
        clientIpAddress: "127.0.0.1",
        clientUserAgent: "vitest/1.0",
      },
      {
        value: 299,
        currency: "INR",
        contentIds: ["test-product-1"],
        contentType: "product",
        contentName: "Test Almonds",
      },
      "https://www.foodondoor.com/products/test"
    );

    expect(result.success).toBe(true);
  }, 15000);

  it("should generate unique event IDs", () => {
    const id1 = generateEventId();
    const id2 = generateEventId();
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(10);
  });
});
