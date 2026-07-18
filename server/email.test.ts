import { describe, it, expect } from "vitest";
import { verifyEmailConnection, sendOtpEmail } from "./email";

describe("Email Service", () => {
  it("should connect to SMTP server successfully", async () => {
    const result = await verifyEmailConnection();
    expect(result).toBe(true);
  }, 15000);

  it("should send a test OTP email to wecare@foodondoor.com", async () => {
    const result = await sendOtpEmail({
      customerEmail: "wecare@foodondoor.com",
      otp: "123456",
      purpose: "login",
    });
    expect(result).toBe(true);
  }, 15000);
});
