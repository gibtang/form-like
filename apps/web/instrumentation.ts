import { createReporter } from "@simple-alerts/nextjs";
import * as Sentry from "@sentry/nextjs";

// Server + edge initialization (Next 15 instrumentation convention).
// Guard: no DSN → skip init entirely (must never crash build or boot).
export async function register(): Promise<void> {
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      debug: false,
    });
  }
}

// Combined server-error reporting: existing Sentry handler plus self-hosted
// Simple Alerts. Both run independently; neither failure affects the other.
// Simple Alerts is a no-op until ALERTS_ENDPOINT and ALERTS_PROJECT_KEY exist.
const alertsEnabled = Boolean(process.env.ALERTS_ENDPOINT && process.env.ALERTS_PROJECT_KEY);

export const onRequestError = alertsEnabled
  ? async (...args: Parameters<typeof Sentry.captureRequestError>) => {
      await Promise.allSettled([
        Sentry.captureRequestError(...args),
        createReporter({
          endpoint: process.env.ALERTS_ENDPOINT!,
          projectKey: process.env.ALERTS_PROJECT_KEY!,
        }).onRequestError(...args),
      ]);
    }
  : Sentry.captureRequestError;
