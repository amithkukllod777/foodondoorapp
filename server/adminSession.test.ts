import { describe, it, expect } from "vitest";
import {
  createAdminToken,
  verifyAdminToken,
  verifyAdminPassword,
  getAdminPassword,
  parseCookieHeader,
} from "./_core/adminSession";

describe("adminSession", () => {
  it("issues a token that verifies", () => {
    const token = createAdminToken();
    expect(verifyAdminToken(token)).toBe(true);
  });

  it("rejects empty / malformed tokens", () => {
    expect(verifyAdminToken(undefined)).toBe(false);
    expect(verifyAdminToken("")).toBe(false);
    expect(verifyAdminToken("garbage")).toBe(false);
    expect(verifyAdminToken("a.b.c")).toBe(false);
  });

  it("rejects a token with a tampered signature", () => {
    const token = createAdminToken();
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(verifyAdminToken(tampered)).toBe(false);
  });

  it("rejects a token whose payload was swapped (signature mismatch)", () => {
    const token = createAdminToken();
    const sig = token.slice(token.lastIndexOf(".") + 1);
    const forgedPayload = Buffer.from(JSON.stringify({ exp: Date.now() + 1_000_000 }))
      .toString("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(verifyAdminToken(`${forgedPayload}.${sig}`)).toBe(false);
  });

  it("verifies the configured admin password and rejects others", () => {
    expect(verifyAdminPassword(getAdminPassword())).toBe(true);
    expect(verifyAdminPassword("wrong-password")).toBe(false);
    expect(verifyAdminPassword("")).toBe(false);
  });

  it("parses cookie headers into a map", () => {
    const m = parseCookieHeader("a=1; nw_admin_session=xyz; b=2");
    expect(m.get("nw_admin_session")).toBe("xyz");
    expect(m.get("a")).toBe("1");
    expect(parseCookieHeader(undefined).size).toBe(0);
  });
});
