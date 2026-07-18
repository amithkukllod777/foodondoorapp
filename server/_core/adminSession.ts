/*
 * Admin session — a self-contained, signed httpOnly session for the admin panel.
 *
 * The legacy admin panel "authenticated" by comparing a password hardcoded in the
 * client bundle and then trusting a sessionStorage flag — meaning anyone could read
 * the password from the JS bundle or simply set the flag in DevTools. This module
 * replaces that with a server-validated password and a tamper-proof session token:
 *
 *   - The password is checked server-side (timing-safe) against ENV.adminPassword.
 *   - On success we issue an HMAC-signed token (signed with JWT_SECRET, the same
 *     secret the OAuth session already uses) carrying only an expiry timestamp.
 *   - The token is stored in an httpOnly cookie, so client-side JS cannot read or
 *     forge it. `adminProcedure` trusts a request only if this token verifies.
 */
import crypto from "crypto";
import { ADMIN_SESSION_MS } from "@shared/const";
import { ENV } from "./env";

let _ephemeralSecret: string | null = null;

function signingSecret(): string {
  if (ENV.cookieSecret) return ENV.cookieSecret;
  // NW-SEC-05: fail closed in production. Fabricating an ephemeral per-instance
  // secret makes tokens validate inconsistently across serverless instances.
  // Throwing here only affects auth operations (not static/product pages), so
  // the store still serves while login is disabled until JWT_SECRET is set.
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new Error("[SECURITY] JWT_SECRET (cookie secret) is not set in production — refusing to sign admin sessions.");
  }
  if (!_ephemeralSecret) {
    _ephemeralSecret = crypto.randomBytes(32).toString("hex");
    console.error("[SECURITY] JWT_SECRET not set — using ephemeral secret (dev only). Sessions will NOT survive redeploys. Set JWT_SECRET in environment.");
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

/** Returns the configured admin password, or null if not set (legacy login disabled). */
export function getAdminPassword(): string | null {
  return ENV.adminPassword || null;
}

/** True when ADMIN_PASSWORD is not configured. */
export function isUsingLegacyAdminPassword(): boolean {
  return !ENV.adminPassword;
}

/** Timing-safe comparison of two strings (hashed to fixed length first). */
function timingSafeEqualStr(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Timing-safe comparison of a candidate password against the configured one. */
export function verifyAdminPassword(candidate: string): boolean {
  const pwd = getAdminPassword();
  if (!pwd) return false;
  return timingSafeEqualStr(candidate, pwd);
}

/** True when the candidate matches the env ADMIN_PASSWORD (recovery key). */
function matchesEnvPassword(candidate: string): boolean {
  if (!ENV.adminPassword) return false;
  return timingSafeEqualStr(candidate, ENV.adminPassword);
}

// ─── Custom (admin-set) password ──────────────────────────────────────────────
// The owner can set their own password from the admin panel. We store a salted
// scrypt hash (never the plaintext) in storeSettings. Once a custom password is
// set, the publicly-known legacy fallback no longer works — only the custom
// password or the env ADMIN_PASSWORD (developer recovery key) are accepted.

/** Produces a salted scrypt hash string: `scrypt$<saltHex>$<hashHex>`. */
export function hashAdminPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/** Timing-safe verify of a candidate against a stored scrypt hash. */
export function verifyAdminPasswordHash(candidate: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (!expected.length) return false;
  const actual = crypto.scryptSync(String(candidate), salt, expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/**
 * The login gate. If a custom password is set, accept it OR the env recovery key
 * (NOT the legacy fallback). If no custom password is set, fall back to the
 * existing env-or-legacy behaviour.
 */
export function verifyAdminLogin(candidate: string, storedHash: string | null | undefined): boolean {
  if (storedHash) {
    return verifyAdminPasswordHash(candidate, storedHash) || matchesEnvPassword(candidate);
  }
  return verifyAdminPassword(candidate);
}

/** Issues a signed admin session token valid for ADMIN_SESSION_MS. */
export function createAdminToken(email?: string): string {
  const payload = base64url(JSON.stringify({ email: email || "", exp: Date.now() + ADMIN_SESSION_MS }));
  return `${payload}.${hmac(payload)}`;
}

/** Verifies a signed admin token: correct signature and not expired. */
export function verifyAdminToken(token: string | undefined | null): boolean {
  return parseAdminToken(token) !== null;
}

/** Parses a signed admin token and returns the decoded payload if valid, or null. */
export function parseAdminToken(token: string | undefined | null): { email: string; exp: number } | null {
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
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as { email?: string; exp?: number };
    if (typeof decoded.exp !== "number" || decoded.exp <= Date.now()) return null;
    return { email: decoded.email || "", exp: decoded.exp };
  } catch {
    return null;
  }
}

// ─── Per-user password hashing for adminUsers table ─────────────────────
// New passwords use scrypt. Legacy SHA-256 hashes (salt:hex) are accepted on
// verify but callers should re-hash with scrypt after successful login.

export function hashUserPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyUserPassword(candidate: string, storedHash: string): boolean {
  if (storedHash.startsWith("scrypt$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 3) return false;
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    if (!expected.length) return false;
    const actual = crypto.scryptSync(String(candidate), salt, expected.length);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }
  // Legacy SHA-256 format (salt:hash) — accept but caller should upgrade
  const colonIdx = storedHash.indexOf(":");
  if (colonIdx === -1) return false;
  const salt = storedHash.slice(0, colonIdx);
  const expectedHash = storedHash.slice(colonIdx + 1);
  const candidateHash = crypto.createHash("sha256").update(salt + candidate).digest("hex");
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function needsRehash(storedHash: string): boolean {
  return !storedHash.startsWith("scrypt$");
}

// ─── Reset code ──────────────────────────────────────────────────────────

export function generateResetCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/** Parses a raw Cookie header into a Map (mirrors the SDK's own cookie parsing). */
export function parseCookieHeader(header: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key) out.set(key, decodeURIComponent(val));
  }
  return out;
}
