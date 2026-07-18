import * as Sentry from "@sentry/react";

const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined) || "https://c8eb0481a7fa23003e69f498d2078667@o4511551507529728.ingest.us.sentry.io/4511551511068672";

let sentryModule: typeof import("@sentry/react") | null = null;
const pendingErrors: Array<{ error: unknown; context?: Record<string, unknown> }> = [];

export function initSentry() {
  if (!dsn) return;

  import("@sentry/react").then((SentryDynamic) => {
    sentryModule = SentryDynamic;
    SentryDynamic.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: import.meta.env.PROD ? 0.05 : 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: import.meta.env.PROD ? 0.1 : 0,
      integrations: [
        SentryDynamic.browserTracingIntegration(),
        SentryDynamic.replayIntegration(),
      ],
      beforeSend(event) {
        const url = event.request?.url || "";
        if (url.includes("/api/trpc/auth.") || url.includes("/api/trpc/admin.me")) {
          return null;
        }
        return event;
      },
    });

    for (const { error, context } of pendingErrors) {
      SentryDynamic.captureException(error, { extra: context });
    }
    pendingErrors.length = 0;
  });
}

export function captureFrontendException(error: unknown, context?: Record<string, unknown>) {
  if (!dsn) return;
  if (sentryModule) {
    sentryModule.captureException(error, { extra: context });
  } else {
    pendingErrors.push({ error, context });
  }
}
