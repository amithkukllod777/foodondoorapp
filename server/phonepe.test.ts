import { describe, it, expect } from "vitest";
import { StandardCheckoutClient, Env } from "@phonepe-pg/pg-sdk-node";

describe("PhonePe credentials", () => {
  it("PHONEPE_CLIENT_ID and PHONEPE_CLIENT_SECRET are set", () => {
    expect(process.env.PHONEPE_CLIENT_ID).toBeTruthy();
    expect(process.env.PHONEPE_CLIENT_SECRET).toBeTruthy();
  });

  it("StandardCheckoutClient can be initialized with credentials", () => {
    const clientId = process.env.PHONEPE_CLIENT_ID!;
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET!;

    // Reset singleton for test
    try {
      const client = StandardCheckoutClient.getInstance(
        clientId,
        clientSecret,
        1,
        Env.PRODUCTION
      );
      expect(client).toBeDefined();
    } catch (e: any) {
      // If singleton already initialized, that's fine
      if (e?.message?.includes("already initialized")) {
        expect(true).toBe(true);
      } else {
        throw e;
      }
    }
  });
});
