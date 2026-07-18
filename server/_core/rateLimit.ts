import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

/**
 * Shared, cross-instance rate limiter (NW-SEC-03).
 *
 * Counters live in a TiDB table so limits hold across serverless instances and
 * cold starts (the old in-memory Map reset per instance and could be multiplied
 * by fanning requests across instances). Keyed by `${bucket}:${key}` with a
 * rolling window stored as an epoch-ms `resetAt`.
 *
 * FAIL-OPEN: any DB error (or no DB) allows the request through rather than
 * blocking it — a rate limiter must never take down login/OTP if the store
 * hiccups. A genuine over-limit still throws TOO_MANY_REQUESTS.
 */

let _tableReady = false;
async function ensureTable(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<void> {
  if (_tableReady) return;
  await db.execute(sql.raw(
    "CREATE TABLE IF NOT EXISTS `rateLimits` (" +
    "`bucketKey` varchar(255) NOT NULL," +
    "`count` int NOT NULL DEFAULT 0," +
    "`resetAt` bigint NOT NULL," +
    "PRIMARY KEY (`bucketKey`))"
  ));
  _tableReady = true;
}

export async function checkRateLimit(
  bucketName: string,
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<void> {
  const now = Date.now();
  let db: Awaited<ReturnType<typeof getDb>> = null;
  try { db = await getDb(); } catch { db = null; }
  if (!db) return; // no store configured → fail open

  const bucketKey = `${bucketName}:${key}`.slice(0, 255);
  try {
    await ensureTable(db);
    const resetAt = now + windowMs;
    // Atomic upsert: start a fresh window if the old one expired, else increment.
    await db.execute(sql`
      INSERT INTO rateLimits (bucketKey, count, resetAt) VALUES (${bucketKey}, 1, ${resetAt})
      ON DUPLICATE KEY UPDATE
        count = IF(resetAt < ${now}, 1, count + 1),
        resetAt = IF(resetAt < ${now}, ${resetAt}, resetAt)
    `);
    const res: any = await db.execute(sql`SELECT count, resetAt FROM rateLimits WHERE bucketKey = ${bucketKey} LIMIT 1`);
    const row = res?.[0]?.[0];
    const count = Number(row?.count ?? 0);
    const rowResetAt = Number(row?.resetAt ?? resetAt);
    if (count > maxAttempts) {
      const retryAfterSec = Math.max(1, Math.ceil((rowResetAt - now) / 1000));
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many attempts. Please try again in ${retryAfterSec} seconds.`,
      });
    }
  } catch (e) {
    if (e instanceof TRPCError) throw e; // real over-limit → block
    console.error("[rateLimit] check failed (fail-open):", (e as any)?.message);
    return; // store error → allow the request
  }
}

export function getRateLimitKey(req: { ip?: string; headers?: Record<string, string | string[] | undefined> }): string {
  const headers = req.headers || {};
  // SECURITY (NW-SEC-03): prefer the platform-set client IP. On Vercel,
  // `x-real-ip` is populated by the edge with the true client address and is
  // not the client-appendable leftmost `x-forwarded-for` value (which an
  // attacker can rotate to get a fresh bucket per request). Only fall back to
  // the forwarded header / req.ip when the trusted header is absent.
  const realIp = headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  const vercelFwd = headers["x-vercel-forwarded-for"];
  if (typeof vercelFwd === "string" && vercelFwd.trim()) return vercelFwd.split(",")[0].trim();
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return req.ip || "unknown";
}
