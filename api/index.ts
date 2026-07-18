import path from "path";
import type { IncomingMessage, ServerResponse } from "http";

// Vercel serverless entry. All requests are rewritten to this function (see
// vercel.json). The Express app is built from a single, self-contained esbuild
// bundle (api/_app.mjs, produced by `build:vercel`) — bundling avoids the ESM
// "cannot resolve extensionless cross-directory import" failure that occurs when
// Vercel ships the server source as separate, unbundled modules.
//
// The bundle is imported lazily inside getApp() so any load/init error is caught
// and surfaced as a readable 500 instead of an opaque FUNCTION_INVOCATION_FAILED.

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let appPromise: Promise<Handler> | null = null;

function getApp(): Promise<Handler> {
  if (!appPromise) {
    appPromise = (async () => {
      // _app.mjs is generated at build time by `build:vercel`; it has no .d.ts,
      // so suppress the "no declaration file" type error (resolves fine at runtime).
      // @ts-ignore
      const mod: any = await import("./_app.mjs");
      const app = await mod.buildApp();
      mod.serveStatic(app, path.join(process.cwd(), "dist", "public"));
      return app as Handler;
    })().catch(err => {
      // Reset so the next invocation retries instead of caching the failure.
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    // Full error goes to the Vercel runtime logs; clients get a generic message.
    console.error("[Vercel handler] initialization/handling error:", err?.stack || err);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
}
