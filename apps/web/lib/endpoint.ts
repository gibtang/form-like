import "server-only";

import { randomBytes } from "node:crypto";
import { sha256Hex } from "./crypto";

/**
 * Endpoint-only mode mechanics (issue #26): access keys, origin whitelist
 * checks, and a per-form in-memory rate limit for the public POST endpoint.
 */
export const ENDPOINT_RATE_LIMIT_PER_MINUTE = 30;
export const HONEYPOT_FIELD = "_formlike_hp";
export const KEY_FIELD = "formlike_key";

/** Reserved form field names never stored as submission answers. */
export const RESERVED_FIELDS = new Set([KEY_FIELD, HONEYPOT_FIELD, "formlike_redirect", "_replyto"]);

export function newEndpointKey(): string {
  return `flk_${randomBytes(24).toString("hex")}`;
}

export function hashEndpointKey(raw: string): string {
  return sha256Hex(raw);
}

/** Extracts the access key from header, Bearer token, or payload field. */
export function extractKey(headers: Headers, payloadKey: string | null): string | null {
  const header = headers.get("x-formlike-key");
  if (header) return header.trim();
  const auth = headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return payloadKey;
}

/** Returns the request origin host, or null when the request carries none. */
export function requestOriginHost(headers: Headers): string | null {
  const origin = headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host.toLowerCase();
    } catch {
      return null;
    }
  }
  const referer = headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host.toLowerCase();
    } catch {
      return null;
    }
  }
  return null;
}

const recentByForm = new Map<string, number[]>();

/** In-memory sliding-window limiter; resets on process restart (abuse basics). */
export function rateLimited(formId: string): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const recent = (recentByForm.get(formId) ?? []).filter((t) => t > windowStart);
  if (recent.length >= ENDPOINT_RATE_LIMIT_PER_MINUTE) {
    recentByForm.set(formId, recent);
    return true;
  }
  recent.push(now);
  recentByForm.set(formId, recent);
  return false;
}
