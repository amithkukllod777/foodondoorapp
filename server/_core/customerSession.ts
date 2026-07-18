import crypto from "crypto";
import { CUSTOMER_SESSION_MS } from "@shared/const";
import { ENV } from "./env";

export interface CustomerSessionPayload {
  phone: string;
  customerId: number;
  exp: number;
}

let _ephemeralSecret: string | null = null;

function signingSecret(): string {
  if (ENV.cookieSecret) return ENV.cookieSecret;
  // NW-SEC-05: fail closed in production (see adminSession for rationale).
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new Error("[SECURITY] JWT_SECRET (cookie secret) is not set in production — refusing to sign customer sessions.");
  }
  if (!_ephemeralSecret) {
    _ephemeralSecret = crypto.randomBytes(32).toString("hex");
    console.error("[SECURITY] JWT_SECRET not set — using ephemeral secret (dev only). Customer sessions will NOT survive redeploys.");
  }
  return _ephemeralSecret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function hmac(payload: string): string {
  return base64url(crypto.createHmac("sha256", signingSecret()).update(payload).digest());
}

export function createCustomerToken(phone: string, customerId: number): string {
  const payload = base64url(
    JSON.stringify({ phone, customerId, exp: Date.now() + CUSTOMER_SESSION_MS }),
  );
  return `${payload}.${hmac(payload)}`;
}

export function verifyCustomerToken(token: string | undefined | null): CustomerSessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expectedSig = hmac(payload);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as CustomerSessionPayload;
    if (typeof decoded.exp !== "number" || decoded.exp <= Date.now()) return null;
    if (!decoded.phone || !decoded.customerId) return null;
    return decoded;
  } catch {
    return null;
  }
}
