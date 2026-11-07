import { NextResponse } from "next/server";
import { notifyError } from "./error-notify";

type Handler<Args extends unknown[]> = (...args: Args) => Promise<Response>;

/**
 * Wraps an API handler: unexpected throws become a logged 500 JSON response
 * and page via Sentry + Telegram (5xx, never cooled down). Expected
 * responses flow through untouched.
 */
export function withApiErrors<Args extends unknown[]>(source: string, handler: Handler<Args>): Handler<Args> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      void notifyError({ error: err, source, status: 500 });
      return NextResponse.json({ ok: false, error: "Something went wrong. Try again." }, { status: 500 });
    }
  };
}
