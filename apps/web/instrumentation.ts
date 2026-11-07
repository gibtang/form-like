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

export const onRequestError = Sentry.captureRequestError;
