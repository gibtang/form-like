import * as Sentry from "@sentry/nextjs";

// Client-side initialization (Next 15 instrumentation-client convention).
// Guard: no DSN → skip init entirely (must never crash build or boot).
if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    debug: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
