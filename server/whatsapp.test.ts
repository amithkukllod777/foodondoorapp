/**
 * WhatsApp API credentials validation test
 * Verifies that WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID are set
 * and that the Meta API is reachable with the token.
 */
import { describe, it, expect } from "vitest";

describe("WhatsApp API credentials", () => {
  it("should have WHATSAPP_TOKEN set", () => {
    const token = process.env.WHATSAPP_TOKEN;
    expect(token).toBeDefined();
    expect(token?.length).toBeGreaterThan(10);
  });

  it("should have WHATSAPP_PHONE_NUMBER_ID set", () => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    expect(phoneNumberId).toBeDefined();
    expect(phoneNumberId?.length).toBeGreaterThan(5);
  });

  it("should have WHATSAPP_WABA_ID set", () => {
    const wabaId = process.env.WHATSAPP_WABA_ID;
    expect(wabaId).toBeDefined();
    expect(wabaId?.length).toBeGreaterThan(5);
  });

  it("should be able to reach Meta WhatsApp API with the token", async () => {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      throw new Error("WhatsApp credentials not set");
    }
    // Call Meta API to get phone number info (lightweight GET, no message sent)
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,verified_name`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json() as any;
    // Should return phone number info, not an error
    expect(res.status).toBe(200);
    expect(data.display_phone_number || data.verified_name).toBeTruthy();
  }, 15000);
});
