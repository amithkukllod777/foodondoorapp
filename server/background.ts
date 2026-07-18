import { waitUntil } from "@vercel/functions";

/**
 * Run best-effort work (notifications, invoice generation, tracking) WITHOUT
 * blocking the client response — so "Placing order…" returns the moment the
 * order is saved, and the slow network calls finish in the background.
 *
 * On Vercel this uses `waitUntil` so the serverless function stays alive until
 * the work completes; in local/dev (no Vercel request context) it falls back to
 * fire-and-forget. Errors are swallowed so a failed notification never surfaces.
 */
export function runInBackground(work: Promise<unknown> | (() => Promise<unknown>)): void {
  const p = Promise.resolve(typeof work === "function" ? work() : work).catch((e) => {
    console.error("[background] task failed:", (e as any)?.message || e);
  });
  try {
    waitUntil(p);
  } catch {
    // Not inside a Vercel request context (e.g. local dev) — fire and forget.
    void p;
  }
}
