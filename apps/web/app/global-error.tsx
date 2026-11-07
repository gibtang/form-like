"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Global client error handler: reports React render errors to Sentry. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 480, margin: "10vh auto", textAlign: "center" }}>
          <h2 style={{ marginBottom: 12 }}>Something went wrong.</h2>
          <p style={{ color: "#425466", marginBottom: 16 }}>An unexpected error occurred. It has been reported.</p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: "8px 16px", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
