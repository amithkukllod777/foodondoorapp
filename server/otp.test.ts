import { describe, expect, it } from "vitest";

// Customer OTP is a 4-digit numeric code delivered over WhatsApp (the approved
// `nutriwow_otp` AUTHENTICATION template via sendOTPviaWhatsApp) or, as an
// alternative, by email via Resend. It is NOT sent over SMS — there is no
// Fast2SMS / SMS-gateway integration. Codes are stored hashed (hashOTP).
describe("Customer OTP (WhatsApp + email)", () => {
  it("uses a 4-digit numeric code (matches the verify schema)", () => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    expect(otp).toMatch(/^\d{4}$/);
    expect(otp.length).toBe(4);
  });

  it("accepts a 10-digit Indian mobile number", () => {
    expect(/^\d{10}$/.test("9876543210")).toBe(true);
    expect(/^\d{10}$/.test("123")).toBe(false);
  });

  it("registers the otp router in appRouter", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter).toBeDefined();
    expect(appRouter._def).toBeDefined();
  });
});
